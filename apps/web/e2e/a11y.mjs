// Accesibilidad de TODA la app: axe (serious/critical = 0) a 390 y 1280, reflow a 320 px y texto al 200 %, semántica (lang, h1,
// landmarks, título único, enlace «Saltar al contenido»), solo teclado en los flujos principales y movimiento reducido.
// Uso: E2E_PSQL=<psql> node e2e/a11y.mjs   (stack local en marcha y web en E2E_BASE_URL)
import { readFileSync } from "node:fs";
import { auditDialog, auditFocusOrder, auditReducedMotion, auditScreen, notes } from "./a11y-lib.mjs";
import { BASE_URL, check, launch, sleep, summary } from "./lib.mjs";
import { ensurePersonas, personasForRoles, resolvePath } from "./ui-data.mjs";

const inventory = JSON.parse(readFileSync(new URL("./routes.json", import.meta.url), "utf8")).routes;
const only = process.env.UI_ONLY ? new RegExp(process.env.UI_ONLY) : null;
const browser = await launch();
const ctxOptions = (state, width = 1280, height = 800) => ({ baseURL: BASE_URL, locale: "es-PE", viewport: { width, height }, ignoreHTTPSErrors: process.env.E2E_IGNORE_HTTPS === "1", ...(state ? { storageState: state } : {}) });
const player = async (state, width, height, extra = {}) => { const context = await browser.newContext({ ...ctxOptions(state, width, height), ...extra }); const page = await context.newPage(); return { context, page }; };

try {
  const personas = await ensurePersonas(browser);
  const titles = new Map();

  // ---------- 1) Cada ruta × persona: axe, reflow, texto al 200 % y semántica ----------
  for (const route of inventory) {
    if (only && !only.test(route.path)) continue;
    const roles = route.roles ?? [];
    const targets = roles.length ? personasForRoles(roles).filter(([key]) => !/\{(problemId|matchId)\}/.test(route.path) || /Rich$/.test(key)).filter(([key]) => !(route.path.includes("/admin") && key !== "admin")) : [[null, "visitante"]];
    for (const [key, label] of targets) {
      const path = resolvePath(route.path, personas);
      const p = await player(key ? personas[key].state : null);
      await p.page.goto(path);
      await p.page.waitForLoadState("networkidle").catch(() => {});
      await sleep(1000);
      await auditScreen(p, `${route.path} · ${label}`, { widths: [320, 360, 390, 768, 1280, 1536], axeWidths: [390, 1280] });
      const semantics = await p.page.evaluate(() => ({
        lang: document.documentElement.lang,
        h1: document.querySelectorAll("h1").length,
        mains: document.querySelectorAll("main, [role=main]").length,
        title: document.title,
        skip: [...document.querySelectorAll("a[href^='#']")].some((a) => /Saltar al contenido/i.test(a.textContent ?? "")),
        banner: document.querySelectorAll("header, [role=banner]").length,
      }));
      const problems = [];
      if (semantics.lang !== "es-PE") problems.push(`lang="${semantics.lang}" (debe ser es-PE)`);
      if (route.group !== "404" && semantics.h1 !== 1) problems.push(`${semantics.h1} elementos h1 (debe haber uno)`);
      if (semantics.mains !== 1) problems.push(`${semantics.mains} landmarks main`);
      if (!semantics.title || /^undefined/.test(semantics.title)) problems.push("sin título");
      if (path.startsWith("/app") && !semantics.skip) problems.push("sin enlace «Saltar al contenido»");
      const previous = titles.get(semantics.title);
      if (previous && previous !== route.path.split("?")[0] && !/^\/app\/chats|^\/app\/problemas\/detalle|^\/app\/$|^\/profesionales/.test(route.path)) problems.push(`título repetido con ${previous}: «${semantics.title}»`);
      titles.set(semantics.title, route.path.split("?")[0]);
      check(`SEMÁNTICA ${route.path} · ${label}`, problems.length === 0, problems.join(" || "));
      await p.context.close();
    }
  }

  // ---------- 2) El título cambia en la navegación del cliente ----------
  {
    const p = await player(personas.freelancerRich.state, 1280, 800);
    await p.page.goto("/app/descubrir/");
    await p.page.waitForLoadState("networkidle").catch(() => {});
    const seen = [];
    for (const name of ["Explorar", "Likes", "Chats", "Perfil", "Swipe"]) {
      await p.page.getByRole("link", { name, exact: true }).first().click();
      await sleep(900);
      seen.push(await p.page.title());
    }
    check("TÍTULO cambia con la navegación del cliente (cinco destinos distintos)", new Set(seen).size === 5, seen.join(" · "));
    await p.context.close();
  }

  // ---------- 3) Formularios: errores asociados y foco al primer error ----------
  {
    const p = await player(null, 390, 844);
    await p.page.goto("/registro/");
    await p.page.locator("#name").fill("Ana Prueba");
    await p.page.locator("#email").fill("ana@example.test");
    await p.page.locator("#password").fill("una-clave-larga-1");
    await p.page.locator("#confirmation").fill("otra-clave-larga-2");
    await p.page.getByRole("radio", { name: /Freelancer/ }).check({ force: true });
    await p.page.getByRole("button", { name: /Crear cuenta/ }).click();
    await p.page.getByText("Las contraseñas no coinciden.").waitFor({ timeout: 5000 });
    const form = await p.page.evaluate(() => {
      const active = document.activeElement;
      const alert = document.querySelector("[role=alert]");
      return { activeId: active?.id ?? active?.tagName, activeInvalid: active?.getAttribute("aria-invalid"), describedby: active?.getAttribute("aria-describedby"), alertText: alert?.textContent?.slice(0, 40) };
    });
    const ok = (form.activeId === "confirmation" || form.activeId === "password") && form.activeInvalid === "true" && Boolean(form.describedby);
    check("FORMULARIO registro: el error se asocia al campo (aria-invalid + aria-describedby) y el foco va al campo con error", ok, JSON.stringify(form));
    await p.context.close();
  }

  // ---------- 4) Solo teclado: inicio de sesión y registro ----------
  {
    const p = await player(null, 390, 844);
    await p.page.goto("/iniciar-sesion/");
    await auditFocusOrder({ page: p.page }, "inicio de sesión", 14);
    await p.page.goto("/registro/");
    await auditFocusOrder({ page: p.page }, "registro", 20);
    await p.context.close();
  }

  // ---------- 5) SwipeDeck con teclado, anuncios y hoja de propuesta ----------
  {
    const p = await player(personas.freelancerEmpty.state, 1280, 900);
    await p.page.goto("/app/descubrir/");
    const card = p.page.locator("article[aria-label^='Problema:']").first();
    await card.waitFor({ timeout: 30_000 });
    const tutorial = p.page.getByRole("button", { name: "Cerrar tutorial" });
    if (await tutorial.count()) await tutorial.click();
    const names = await p.page.evaluate(() => [...document.querySelectorAll(".swipe-deck button")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim()));
    check("MAZO todos los botones tienen nombre accesible", names.length >= 3 && names.every(Boolean), names.join(" | "));
    const live = await p.page.evaluate(() => [...document.querySelectorAll("[aria-live]")].map((n) => n.getAttribute("aria-live")));
    check("MAZO existe una región aria-live para anunciar el resultado", live.length > 0, live.join(","));
    const before = await card.getAttribute("aria-label");
    await p.page.keyboard.press("ArrowLeft");
    await sleep(1200);
    const announced = await p.page.evaluate(() => [...document.querySelectorAll("[aria-live]")].map((n) => n.textContent?.trim()).filter(Boolean).join(" | "));
    check("MAZO ← descarta, el siguiente problema aparece y se anuncia el resultado", (await card.getAttribute("aria-label")) !== before && /descart|Descart|No por ahora|deshacer/i.test(announced), announced.slice(0, 90));
    await p.page.keyboard.press("z");
    await sleep(900);
    check("MAZO Z deshace la decisión", (await card.getAttribute("aria-label")) === before);
    await auditDialog({ page: p.page }, "hoja de propuesta (teclado)", async () => { await p.page.keyboard.press("p"); }, null);
    const opener = p.page.getByRole("button", { name: /Proponer ahora/ }).first();
    await auditDialog({ page: p.page }, "hoja de propuesta con foco de vuelta", async () => { await opener.focus(); await p.page.keyboard.press("Enter"); }, opener);
    await auditReducedMotion({ page: p.page }, "mazo");
    await p.context.close();
  }

  // ---------- 6) Movimiento reducido: mazo sin vuelo y contadores sin animación ----------
  {
    const p = await player(personas.freelancerEmpty.state, 390, 844, { reducedMotion: "reduce" });
    await p.page.goto("/app/descubrir/");
    const card = p.page.locator("article[aria-label^='Problema:']").first();
    await card.waitFor({ timeout: 30_000 });
    const tutorial = p.page.getByRole("button", { name: "Cerrar tutorial" });
    if (await tutorial.count()) await tutorial.click();
    const before = await card.getAttribute("aria-label");
    await p.page.getByRole("button", { name: /Descartar|No me interesa|Pasar|Descarta/ }).first().click();
    await sleep(120);
    const moving = await p.page.evaluate(() => document.getAnimations().filter((a) => (a.effect?.getKeyframes?.() ?? []).some((k) => k.transform && /rotate|translate|scale/.test(String(k.transform)) && k.transform !== "none")).length);
    await sleep(900);
    check("MOVIMIENTO REDUCIDO el mazo sigue funcionando sin vuelo ni rotación", (await card.getAttribute("aria-label")) !== before && moving === 0, `animaciones de transformación=${moving}`);
    await p.page.goto("/");
    await sleep(150);
    const early = await p.page.evaluate(() => [...document.querySelectorAll("[data-live-counter], .live-counter, section[aria-label*='vivo'] *")].map((n) => n.textContent?.trim()).join("|"));
    await sleep(1800);
    const late = await p.page.evaluate(() => [...document.querySelectorAll("[data-live-counter], .live-counter, section[aria-label*='vivo'] *")].map((n) => n.textContent?.trim()).join("|"));
    check("MOVIMIENTO REDUCIDO el contador de la landing no anima (valor final desde el primer momento)", early === late, `${early.slice(0, 40)} → ${late.slice(0, 40)}`);
    await p.context.close();
  }

  // ---------- 7) Chat: Enter, Shift+Enter y aria-live ----------
  {
    const p = await player(personas.freelancerRich.state, 1280, 800);
    await p.page.goto(`/app/chats/?match=${personas.matchId}`);
    const box = p.page.getByRole("textbox", { name: /mensaje/i });
    await box.waitFor({ timeout: 30_000 });
    await box.fill("Línea uno");
    await box.press("Shift+Enter");
    await box.type("línea dos");
    const lines = (await box.inputValue()).split("\n").length;
    check("CHAT Shift+Enter inserta una línea nueva", lines === 2, `líneas=${lines}`);
    await box.press("Enter");
    await p.page.getByText("línea dos").last().waitFor({ timeout: 15_000 });
    check("CHAT Enter envía el mensaje", true);
    const live = await p.page.evaluate(() => [...document.querySelectorAll("[aria-live], [role=log], [role=status]")].length);
    check("CHAT hay una región aria-live o role=log para los mensajes nuevos", live > 0, `regiones=${live}`);
    await auditFocusOrder({ page: p.page }, "chat", 12);
    await p.context.close();
  }

  // ---------- 8) Asistente de 5 pasos: errores asociados y teclado ----------
  {
    const p = await player(personas.companyEmpty.state, 390, 844);
    await p.page.goto("/app/problemas/nuevo/");
    await p.page.locator("#problem-title").waitFor({ timeout: 20_000 });
    await p.page.getByRole("button", { name: "Continuar" }).click();
    await sleep(600);
    const info = await p.page.evaluate(() => {
      const invalid = document.querySelector("[aria-invalid='true']");
      return { has: Boolean(invalid), describedby: invalid?.getAttribute("aria-describedby"), focused: document.activeElement === invalid || document.activeElement?.closest("[role=alert]") !== null, alert: Boolean(document.querySelector("[role=alert]")) };
    });
    check("ASISTENTE al continuar con errores: campo con aria-invalid, descripción asociada y foco al error", info.has && Boolean(info.describedby) && info.focused, JSON.stringify(info));
    await auditFocusOrder({ page: p.page }, "asistente paso 1", 16);
    await p.context.close();
  }

  // ---------- 9) Administración con teclado ----------
  {
    const p = await player(personas.admin.state, 1280, 800);
    await p.page.goto("/app/admin/");
    await p.page.getByRole("tab", { name: /Usuarios/ }).or(p.page.getByRole("button", { name: /Usuarios/ })).first().waitFor({ timeout: 20_000 });
    await auditFocusOrder({ page: p.page }, "administración", 24);
    await p.context.close();
  }

  if (notes.length) console.log(`\nNotas axe (moderadas/menores):\n${[...new Set(notes)].slice(0, 40).map((line) => `  ${line}`).join("\n")}`);
} catch (error) {
  console.error("ERROR EN EL RECORRIDO:", error);
  check("la prueba de accesibilidad terminó sin excepciones", false, String(error).slice(0, 240));
} finally {
  await browser.close();
}
process.exit(summary() ? 0 : 1);
