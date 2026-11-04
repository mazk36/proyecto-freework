// Recorrido por motores: pantallas públicas, registro, perfil con subida de avatar, mazo de swipe y chat en el motor indicado.
// E2E_ENGINE=webkit (perfil iPhone 13) o por defecto Chromium (referencia). Requiere el stack completo y la web en E2E_BASE_URL.
// Uso: E2E_ENGINE=webkit E2E_WEBKIT_PATH=<ruta a pw_run.sh> E2E_PSQL=<psql> node e2e/engines.mjs
import { createClient } from "@supabase/supabase-js";
import { devices } from "playwright";
import { check, launch, newPlayer, PASSWORD, register, sleep, sql, stamp, summary, SUPABASE_URL } from "./lib.mjs";

const ENGINE = process.env.E2E_ENGINE ?? "chromium";
const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const label = (text) => `[${ENGINE}] ${text}`;
const profile = ENGINE === "webkit" ? devices["iPhone 13"] : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const browser = await launch();

const hscroll = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const smallControls = (page) => page.evaluate(() => [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select")]
  .filter((element) => element.getBoundingClientRect().width > 0 && getComputedStyle(element).visibility !== "hidden")
  .map((element) => ({ id: element.id || element.name || element.tagName, size: parseFloat(getComputedStyle(element).fontSize) }))
  .filter((item) => item.size < 16).map((item) => `${item.id}=${item.size}px`));

try {
  const player = await newPlayer(browser, `motor-${ENGINE}`, profile);
  const { page } = player;

  // ---------- 1) Pantallas públicas ----------
  for (const [route, name] of [["/", "landing"], ["/registro/", "registro"], ["/iniciar-sesion/", "inicio de sesión"], ["/recuperar-contrasena/", "recuperación"]]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle").catch(() => {});
    await sleep(800);
    check(label(`${name}: sin scroll horizontal a 390 px`), !(await hscroll(page)));
    const small = await smallControls(page);
    check(label(`${name}: campos de formulario de al menos 16 px (iOS no hace zoom)`), small.length === 0, small.join(", "));
  }
  await page.goto("/");
  const landingMetrics = await page.evaluate(() => ({ docH: document.documentElement.scrollHeight, vh: innerHeight, minH: getComputedStyle(document.body).minHeight }));
  check(label("la página ocupa al menos el alto visible (100dvh, sin recorte bajo la barra)"), landingMetrics.docH >= landingMetrics.vh, JSON.stringify(landingMetrics));
  const viewportMeta = await page.evaluate(() => document.querySelector("meta[name=viewport]")?.getAttribute("content"));
  check(label("el viewport declara viewport-fit=cover"), /viewport-fit=cover/.test(viewportMeta ?? ""), String(viewportMeta));

  check(label("un navegador actual no muestra el aviso de «actualiza tu navegador»"), (await page.locator("[data-old-browser]").count()) === 0);
  const oldPlayer = await newPlayer(browser, `motor-viejo-${ENGINE}`, profile);
  await oldPlayer.page.addInitScript(() => { CSS.supports = () => false; });
  await oldPlayer.page.goto("/");
  await oldPlayer.page.locator("[data-old-browser]").waitFor({ timeout: 10_000 });
  check(label("un navegador sin color-mix/:is() ve el aviso «Tu navegador es antiguo…» en lugar de una página rota"), /navegador es antiguo/.test(await oldPlayer.page.locator("[data-old-browser]").innerText()));
  await oldPlayer.context.close();

  // ---------- 2) Registro y perfil con avatar ----------
  await register(player, "Lucía Motor", "freelancer");
  check(label("registro (con confirmación saltada por SQL) abre la app"), /\/app/.test(page.url()));
  await page.goto("/app/perfil/");
  const fileInput = page.locator("input[type='file']").first();
  await fileInput.waitFor({ state: "attached", timeout: 30_000 });
  await fileInput.setInputFiles("public/optimized/mark-256.webp");
  await page.getByRole("button", { name: "Guardar fotografía" }).click();
  await page.getByText("Fotografía actualizada").first().waitFor({ timeout: 30_000 }).catch(() => {});
  const uid = sql(`select id from auth.users where email = '${player.email}'`);
  check(label("el avatar WebP se sube desde la UI"), sql(`select count(*) from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = '${uid}'`) === "1");
  check(label("perfil: sin scroll horizontal"), !(await hscroll(page)));
  const smallProfile = await smallControls(page);
  check(label("perfil: campos de al menos 16 px"), smallProfile.length === 0, smallProfile.join(", "));

  // ---------- 3) Mazo: el arrastre horizontal no mueve la página ----------
  await page.goto("/app/descubrir/");
  const card = page.locator("article[aria-label^='Problema:']").first();
  await card.waitFor({ timeout: 30_000 });
  const closeTutorial = page.getByRole("button", { name: "Cerrar tutorial" });
  if (await closeTutorial.count()) await closeTutorial.click();
  const before = await card.getAttribute("aria-label");
  const box = await card.boundingBox();
  const scrollBefore = await page.evaluate(() => [scrollX, scrollY]);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 20; i += 1) { await page.mouse.move(box.x + box.width / 2 + i * 9, box.y + box.height / 2 + i * 0.5); await sleep(16); }
  const during = await page.evaluate(() => [scrollX, scrollY, document.documentElement.scrollWidth > document.documentElement.clientWidth + 1]);
  await page.mouse.up();
  await sleep(900);
  const after = await card.getAttribute("aria-label").catch(() => "(cambió)");
  check(label("durante el arrastre horizontal la página no se desplaza ni aparece scroll lateral"), during[0] === scrollBefore[0] && during[1] === scrollBefore[1] && !during[2], JSON.stringify({ scrollBefore, during }));
  check(label("soltar el arrastre pasa a la siguiente tarjeta"), after !== before, `${before} → ${after}`);
  const touchAction = await page.evaluate(() => getComputedStyle(document.querySelector("article[aria-label^='Problema:']")).touchAction);
  check(label("la tarjeta del mazo declara touch-action para el arrastre horizontal"), /pan-y|none|manipulation/.test(touchAction), touchAction);
  const navBottom = await page.evaluate(() => { const nav = [...document.querySelectorAll("nav")].find((n) => getComputedStyle(n).position === "fixed"); return nav ? [Math.round(nav.getBoundingClientRect().bottom), innerHeight] : null; });
  check(label("la barra inferior fija queda dentro del alto visible"), navBottom && navBottom[0] <= navBottom[1] + 1, JSON.stringify(navBottom));

  // ---------- 4) Chat: composer y envío ----------
  const company = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  const companyEmail = `motor-empresa-${ENGINE}-${stamp}@example.test`;
  const signedUp = await company.auth.signUp({ email: companyEmail, password: PASSWORD, options: { data: { full_name: "Empresa Motor", role: "company" } } });
  sql(`update auth.users set email_confirmed_at = now() where email = '${companyEmail}'`);
  await company.auth.signInWithPassword({ email: companyEmail, password: PASSWORD });
  const companyId = signedUp.data.user.id;
  const problemId = sql(`insert into public.business_problems (company_user_id, status, title, description) values ('${companyId}', 'open', 'Problema motores ${ENGINE}', 'Descripción') returning id`).split("\n")[0];
  const proposalId = sql(`insert into public.proposals (problem_id, freelancer_id, status, diagnosis, solution, deliverables, timeline, price, submitted_at, problem_title_snapshot) values ('${problemId}', '${uid}', 'submitted', 'd', 's', 'e', '1 mes', 100, now(), 'Problema motores') returning id`).split("\n")[0];
  const matchId = sql(`insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id) values ('${problemId}', '${proposalId}', '${companyId}', '${uid}') returning id`).split("\n")[0];
  await company.rpc("send_message", { p_match_id: matchId, p_body: `Hola desde la empresa ${ENGINE}` });
  await page.goto(`/app/chats/?match=${matchId}`);
  await page.getByText(`Hola desde la empresa ${ENGINE}`).last().waitFor({ state: "visible", timeout: 30_000 });
  const composer = page.getByRole("textbox", { name: /mensaje/i });
  const composerSize = await composer.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  check(label("el cuadro de mensaje del chat usa al menos 16 px"), composerSize >= 16, `${composerSize}px`);
  await composer.fill(`Respuesta desde ${ENGINE} ${stamp}`);
  await composer.press("Enter");
  await page.getByText(`Respuesta desde ${ENGINE} ${stamp}`).last().waitFor({ state: "visible", timeout: 20_000 });
  check(label("enviar con Enter funciona y el mensaje aparece"), sql(`select count(*) from public.messages where match_id = '${matchId}' and sender_id = '${uid}'`) === "1");
  const composerBox = await composer.boundingBox();
  check(label("el cuadro de mensaje queda dentro del alto visible"), composerBox.y + composerBox.height <= (await page.evaluate(() => innerHeight)) + 1, JSON.stringify(composerBox));
  check(label("chat: sin scroll horizontal"), !(await hscroll(page)));

  // WebKit informa como «Fetch API cannot load … access control checks» y «WebSocket is closed before the connection» las peticiones
  // que se cancelan al navegar (page.goto en pleno arranque); no ocurren en una página estable.
  const problems = player.problems.filter((line) => !/Failed to load resource|HTTP 401|HTTP 4\d\d|No se pudo actualizar el contador|Fetch API cannot load|WebSocket is closed before|WebSocket connection to/.test(line));
  check(label("consola sin errores ni avisos propios"), problems.length === 0, problems.slice(0, 3).join(" | "));
} catch (error) {
  console.error("ERROR EN EL RECORRIDO:", error);
  check(label("el recorrido terminó sin excepciones"), false, String(error).slice(0, 260));
} finally {
  await browser.close();
}
process.exit(summary() ? 0 : 1);
