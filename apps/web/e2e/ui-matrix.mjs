// Matriz de interfaz: cada ruta del inventario (e2e/routes.json) en cinco tamaños y cuatro estados.
// Tamaños: 360×740, 390×844, 768×1024, 1280×800 y 1536×864. Por tamaño: sin scroll horizontal, objetivos táctiles ≥44 px
// (≤768 px), campos ≥16 px, CLS < 0,1 al cargar, consola sin errores ni avisos y ningún recurso con 4xx/5xx.
// Estados (rutas que leen datos): cargando (esqueleto), vacío, error (red caída) y éxito; con capturas en CAPTURAS_DIR.
// Uso: E2E_PSQL=<psql> node e2e/ui-matrix.mjs   (stack local en marcha y web en E2E_BASE_URL)
import { mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { BASE_URL, check, launch, sleep, summary } from "./lib.mjs";
import { ensurePersonas, personasForRoles, resolvePath } from "./ui-data.mjs";

const VIEWPORTS = [[360, 740], [390, 844], [768, 1024], [1280, 800], [1536, 864]];
const OUT = (process.env.CAPTURAS_DIR ?? join(homedir(), "Downloads", "Matchwork-demo", "calidad")).replace(/^~/, homedir());
mkdirSync(OUT, { recursive: true });
const inventory = JSON.parse(readFileSync(new URL("./routes.json", import.meta.url), "utf8")).routes;
const only = process.env.UI_ONLY ? new RegExp(process.env.UI_ONLY) : null;

const ALLOWED = /get_my_account_status|is_admin|unread_total|get_public_counters/;
const LIST_RPC = /\/rest\/v1\/rpc\/(list_[a-z_]+|get_my_company_problems|get_my_company_problem|get_company_profile|get_my_company_verification|admin_list_[a-z_]+|admin_get_[a-z_]+)/;
const READ_ANY = /\/rest\/v1\/(rpc\/(list_|get_my_company|get_company|admin_)|profiles|freelancer_profiles|freelancer_skills|portfolio_projects|portfolio_media|proposals|skills)/;

const slugOf = (path, persona, state, width) => `${path.replace(/[/?={}&]+/g, "_").replace(/^_|_$/g, "") || "inicio"}__${persona.replace(/ /g, "-")}__${state}__${width}.png`;

function watch(page) {
  const log = { console: [], bad: [] };
  page.on("console", (message) => {
    if (!["error", "warning"].includes(message.type())) return;
    // Los fallos de red provocados a propósito (estado de error) ya se cuentan aparte.
    log.console.push(`${message.type()}: ${message.text().slice(0, 140)}`);
  });
  page.on("pageerror", (error) => log.console.push(`pageerror: ${String(error).slice(0, 140)}`));
  page.on("response", (response) => { if (response.status() >= 400) log.bad.push(`${response.status()} ${response.request().method()} ${response.url().replace(/^https?:\/\/[^/]+/, "").slice(0, 90)}`); });
  return log;
}

async function layout(page, width) {
  return page.evaluate((viewportWidth) => {
    const doc = document.documentElement;
    const hscroll = doc.scrollWidth > doc.clientWidth + 1;
    const small = [];
    if (viewportWidth <= 768) {
      for (const element of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], [role=radio], [role=checkbox]")) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden" || style.display === "none") continue;
        if (element.closest("[aria-hidden='true'], .sr-only") || /sr-only/.test(element.className)) continue;
        if (element instanceof HTMLInputElement && ["radio", "checkbox"].includes(element.type) && (element.closest("label")?.getBoundingClientRect().height ?? 0) >= 44) continue;
        if (style.display === "inline" && element.closest("p, li, span, h1, h2, h3, dd, dt, label")) continue;
        if (rect.height < 43.5 || rect.width < 43.5) small.push(`${element.tagName.toLowerCase()}${element.getAttribute("aria-label") ? `[${element.getAttribute("aria-label")}]` : ""}:${Math.round(rect.width)}x${Math.round(rect.height)} «${(element.textContent ?? "").trim().slice(0, 16)}»`);
      }
    }
    const fields = [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]), textarea, select")]
      .filter((element) => element.getBoundingClientRect().width > 0 && getComputedStyle(element).visibility !== "hidden")
      .map((element) => ({ id: element.id || element.name || element.tagName, size: parseFloat(getComputedStyle(element).fontSize) })).filter((item) => item.size < 16).map((item) => `${item.id}=${item.size}px`);
    const text = document.body.innerText;
    const bad = (text.match(/\bundefined\b|\bNaN\b|\[object |[Ll]orem ipsum|\bTODO\b|Próximamente/g) ?? []).slice(0, 3);
    return { hscroll, small: [...new Set(small)].slice(0, 5), fields: [...new Set(fields)].slice(0, 4), bad, h1: document.querySelectorAll("h1").length, textLength: text.length };
  }, width);
}

async function open(browser, personaState, [width, height]) {
  const context = await browser.newContext({
    baseURL: BASE_URL, locale: "es-PE", viewport: { width, height }, ignoreHTTPSErrors: process.env.E2E_IGNORE_HTTPS === "1",
    ...(personaState ? { storageState: personaState } : {}), ...(width <= 768 ? { hasTouch: true } : {}),
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value; }).observe({ type: "layout-shift", buffered: true });
  });
  return { context, page, log: watch(page) };
}

async function settled(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await sleep(1200);
}

const browser = await launch();
try {
  const personas = await ensurePersonas(browser);
  let combos = 0;
  for (const route of inventory) {
    if (only && !only.test(route.path)) continue;
    const roles = route.roles ?? [];
    const targets = roles.length ? personasForRoles(roles).filter(([key]) => !/\{(problemId|matchId)\}/.test(route.path) || /Rich$/.test(key)).filter(([key]) => !(route.path.includes("/admin") && key !== "admin")) : [[null, "visitante"]];
    for (const [key, label] of targets) {
      combos += 1;
      const path = resolvePath(route.path, personas);
      const state = key ? personas[key].state : null;
      const name = `${route.path} · ${label}`;
      const problems = [];

      // ---- Éxito en los cinco tamaños (o el estado natural de la persona: vacío en las cuentas nuevas) ----
      for (const viewport of VIEWPORTS) {
        const { context, page, log } = await open(browser, state, viewport);
        await page.goto(path);
        await settled(page);
        const report = await layout(page, viewport[0]);
        const cls = await page.evaluate(() => window.__cls);
        const where = `${viewport[0]}px`;
        if (report.hscroll) problems.push(`scroll horizontal a ${where}`);
        if (report.small.length) problems.push(`objetivos <44px a ${where}: ${report.small.join("; ")}`);
        if (report.fields.length) problems.push(`campos <16px a ${where}: ${report.fields.join(", ")}`);
        if (cls >= 0.1) problems.push(`CLS ${cls.toFixed(3)} a ${where}`);
        if (report.bad.length) problems.push(`texto sospechoso a ${where}: ${report.bad.join(", ")}`);
        if (route.group !== "404" && report.h1 !== 1 && !/auth\/callback|registro\/revisa/.test(path) && report.h1 > 1) problems.push(`${report.h1} h1 a ${where}`);
        const consoleLines = log.console.filter((line) => !/Failed to load resource/.test(line));
        if (consoleLines.length) problems.push(`consola a ${where}: ${consoleLines.slice(0, 2).join(" | ")}`);
        const expected404 = route.group === "404";
        const bad = log.bad.filter((line) => !(expected404 && /ruta-que-no-existe/.test(line)));
        if (bad.length) problems.push(`recursos con error a ${where}: ${bad.slice(0, 3).join(" | ")}`);
        if ([390, 1280].includes(viewport[0])) await page.screenshot({ path: join(OUT, slugOf(route.path, label, "exito", viewport[0])) });
        await context.close();
      }
      check(`MATRIZ ${name} · cinco tamaños`, problems.length === 0, problems.join(" || "));

      if (!route.reads || !key) continue;
      // ---- Estados cargando, vacío y error (390 y 1280) ----
      for (const viewport of [[390, 844], [1280, 800]]) {
        const stateProblems = [];
        // cargando
        {
          const { context, page } = await open(browser, state, viewport);
          await page.route(READ_ANY, async (r) => { if (ALLOWED.test(r.request().url())) return r.continue(); await sleep(3500); return r.continue().catch(() => {}); });
          await page.goto(path, { waitUntil: "domcontentloaded" });
          await sleep(900);
          const loading = await page.evaluate(() => ({ status: document.querySelectorAll("[role=status], [aria-busy=true], .animate-pulse, [class*=skeleton]").length, text: /Cargando|Comprobando|Preparando/.test(document.body.innerText) }));
          if (!loading.status && !loading.text) stateProblems.push("cargando: sin esqueleto ni indicador");
          await page.screenshot({ path: join(OUT, slugOf(route.path, label, "cargando", viewport[0])) });
          await context.close();
        }
        // vacío
        {
          const { context, page } = await open(browser, state, viewport);
          await page.route(LIST_RPC, async (r) => { if (ALLOWED.test(r.request().url())) return r.continue(); return r.fulfill({ status: 200, contentType: "application/json", body: "[]" }); });
          await page.goto(path);
          await settled(page);
          const report = await layout(page, viewport[0]);
          if (report.hscroll) stateProblems.push("vacío: scroll horizontal");
          if (report.bad.length) stateProblems.push(`vacío: texto sospechoso ${report.bad.join(", ")}`);
          await page.screenshot({ path: join(OUT, slugOf(route.path, label, "vacio", viewport[0])) });
          await context.close();
        }
        // error
        {
          const { context, page } = await open(browser, state, viewport);
          await page.route(READ_ANY, async (r) => (ALLOWED.test(r.request().url()) ? r.continue() : r.abort("failed")));
          await page.goto(path);
          await settled(page);
          const report = await layout(page, viewport[0]);
          const info = await page.evaluate(() => ({ alert: document.querySelectorAll("[role=alert]").length, text: /No pudimos|no se pudo|No encontramos|Revisa tu conexión|Reintentar|Inténtalo|no está disponible|sin acceso|No tienes/i.test(document.body.innerText), action: [...document.querySelectorAll("main button, main a[href]")].some((el) => /Reintentar|Volver|Ir a|Ver |Publicar|Descubrir|Actualizar|Recargar/i.test(el.textContent ?? "")) }));
          if (!info.text && !info.alert) stateProblems.push("error: no muestra un mensaje de error");
          if (!info.action) stateProblems.push("error: sin botón o enlace de salida");
          if (report.hscroll) stateProblems.push("error: scroll horizontal");
          await page.screenshot({ path: join(OUT, slugOf(route.path, label, "error", viewport[0])) });
          await context.close();
        }
        check(`ESTADOS ${name} · ${viewport[0]}px (cargando, vacío, error)`, stateProblems.length === 0, stateProblems.join(" || "));
      }
    }
  }
  console.log(`\nCombinaciones ruta×persona: ${combos}. Capturas en ${OUT}`);
} catch (error) {
  console.error("ERROR EN EL RECORRIDO:", error);
  check("la matriz terminó sin excepciones", false, String(error).slice(0, 240));
} finally {
  await browser.close();
}
process.exit(summary() ? 0 : 1);
