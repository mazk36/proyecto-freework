// End-to-end journey against the REAL app (static export) and a REAL local Supabase. See README.md.
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { runSweep } from "./sweep.mjs";
import { PASSWORD, SUPABASE_URL, stamp, check, forgetNetworkErrors, launch, login, logout, newPlayer, register, sleep, sql, summary, userId } from "./lib.mjs";

const browser = await launch();
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const desktop = { viewport: { width: 1280, height: 800 } };

const companyA = await newPlayer(browser, "empresa-a", desktop);
const adminP = await newPlayer(browser, "admin", desktop);
const companyB = await newPlayer(browser, "empresa-b", desktop);
const freelancer = await newPlayer(browser, "freelancer", mobile);
const players = [companyA, companyB, adminP, freelancer];
let exitCode = 1;

async function fillCompanyProfile(player, name, countryCode) {
  const { page } = player;
  await page.goto("/app/perfil/");
  await page.locator("#company-name").fill(name);
  await page.locator("#company-industry").fill("Servicios profesionales");
  await page.locator("#company-description").fill("Empresa de prueba para el recorrido de extremo a extremo.");
  await page.locator("#company-country").selectOption(countryCode);
  await page.getByRole("button", { name: "Guardar perfil empresarial" }).click();
  await page.getByText(/Perfil.*guardado|guardado/i).first().waitFor({ timeout: 15_000 });
}

/** Real touch gesture through the Chrome DevTools Protocol (touchStart/touchMove/touchEnd). */
async function touchSwipe(player, target, dx, steps = 12) {
  const box = await target.boundingBox();
  const startX = box.x + box.width / 2, y = box.y + box.height / 2;
  const cdp = await player.context.newCDPSession(player.page);
  const send = (type, x) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await send("touchStart", startX);
  for (let i = 1; i <= steps; i += 1) { await send("touchMove", startX + (dx * i) / steps); await sleep(16); }
  await send("touchEnd", startX + dx);
  await cdp.detach();
}

/** Setup-only helper: a second freelancer sends a proposal through the public RPCs (the UI path is covered by the first one). */
async function secondFreelancerProposal(problemTitle, companyEmail) {
  const client = createClient(SUPABASE_URL, process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH", { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signUpError } = await client.auth.signUp({ email: `freelancer2-${stamp}@example.test`, password: PASSWORD, options: { data: { full_name: "Diego Salazar", role: "freelancer" } } });
  if (signUpError) throw signUpError;
  const problemId = sql(`select b.id from public.business_problems b join auth.users u on u.id = b.company_user_id where b.title = '${problemTitle}' and u.email = '${companyEmail}' limit 1`);
  const draft = await client.rpc("save_proposal_draft", { p_problem_id: problemId, p_data: {
    diagnosis: "El problema principal es la dispersión de las solicitudes entre canales.",
    solution: "Un tablero compartido con automatizaciones simples y alertas.",
    deliverables: "Diagnóstico técnico, tablero y manual.", timeline: "6 semanas", price: 1250, currency: "USD" } });
  if (draft.error) throw draft.error;
  const sent = await client.rpc("submit_proposal", { p_proposal_id: draft.data });
  if (sent.error) throw sent.error;
}

async function publishProblem(player, title, description) {
  const { page } = player;
  await page.goto("/app/problemas/nuevo/");
  await page.locator("#problem-title").fill(title);
  await page.locator("#problem-description").fill(description);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Paso 2 de 5").waitFor();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Paso 3 de 5").waitFor();
  await page.getByLabel("Organizar información").check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Paso 4 de 5").waitFor();
  await page.getByRole("radio", { name: /1,000 – .*3,000/ }).check();
  await page.getByRole("radio", { name: "Soy flexible con el tiempo" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Paso 5 de 5").waitFor();
  await page.getByLabel(/Confirmo que revisé la información/).check();
  await page.getByRole("button", { name: "Publicar problema" }).click();
  await page.getByRole("heading", { name: /publicado|publicación|Publicamos/i }).first().waitFor({ timeout: 20_000 });
}

try {
  // ---------- 1) Empresa A: registro, perfil, verificación; el admin verifica ----------
  await register(companyA, "Empresa Alfa", "company");
  check("1.1 la empresa se registra y entra a la app", /\/app\/?$/.test(companyA.page.url()));
  await fillCompanyProfile(companyA, "Empresa Alfa", "PE");
  check("1.2 la empresa guarda su perfil", true);

  await companyA.page.getByRole("button", { name: "Verificar mi empresa" }).click();
  const dialog = companyA.page.getByRole("dialog");
  await dialog.getByLabel(/Razón social/i).fill("Empresa Alfa S.A.C.");
  await dialog.getByLabel(/RUC|Identificación/i).first().fill("20123456781");
  await dialog.getByLabel(/Sitio web/i).fill("https://empresa-alfa.example");
  await dialog.getByRole("button", { name: "Enviar solicitud" }).click();
  await companyA.page.getByText("En revisión").first().waitFor({ timeout: 15_000 });
  check("1.3 la empresa envía la verificación y queda «En revisión»", true);

  await register(adminP, "Admin Prueba", "freelancer");
  const adminId = await userId(adminP);
  execFileSync("bash", [new URL("../../../supabase/scripts/grant-admin.sh", import.meta.url).pathname, adminId], {
    env: { ...process.env, DB_URL: process.env.E2E_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:55422/postgres", PATH: `${process.env.PATH}:/opt/homebrew/opt/libpq/bin` },
  });
  await adminP.page.goto("/app/admin/");
  await adminP.page.getByRole("row", { name: /Empresa Alfa/ }).getByRole("button", { name: /Verificar/ }).click();
  await adminP.page.getByText("Empresa verificada").first().waitFor({ timeout: 15_000 });
  check("1.4 el admin verifica a la empresa desde el panel", sql(`select status from public.company_verifications v join auth.users u on u.id = v.company_user_id where u.email = '${companyA.email}'`) === "verified");

  // ---------- 2) Publicar problemas (PEN y USD) ----------
  const longText = "Nuestro equipo recibe solicitudes por varios canales y es difícil saber cuáles ya fueron atendidas.";
  await publishProblem(companyA, "Ordenar la atención de nuestros clientes", longText);
  await publishProblem(companyA, "Reducir el trabajo manual en reportes", longText);
  await publishProblem(companyA, "Entender mejor nuestro proceso de compras", longText);
  check("2.1 la empresa verificada publica 3 problemas en PEN", sql(`select count(*) from public.business_problems b join auth.users u on u.id = b.company_user_id where u.email = '${companyA.email}' and b.status = 'open' and b.currency = 'PEN'`) === "3");
  await register(companyB, "Empresa Beta", "company");
  await fillCompanyProfile(companyB, "Empresa Beta", "US");
  await publishProblem(companyB, "Automatizar la facturación mensual", longText);
  check("2.2 una empresa de EE. UU. publica un problema en USD (sin verificar)", sql(`select count(*) from public.business_problems b join auth.users u on u.id = b.company_user_id where u.email = '${companyB.email}' and b.status = 'open' and b.currency = 'USD'`) === "1");

  // ---------- 3) Freelancer: registro y perfil público ----------
  await register(freelancer, "Freelancer Uno", "freelancer");
  await freelancer.page.goto("/app/perfil/");
  await freelancer.page.locator("#freelancer-display-name").fill("Ana Torres");
  await freelancer.page.locator("#freelancer-headline").fill("Diseñadora de servicios digitales");
  await freelancer.page.locator("#freelancer-bio").fill("Diseño recorridos de atención y automatizo tareas repetitivas para pequeñas empresas.");
  await freelancer.page.getByRole("button", { name: "Guardar información profesional" }).click();
  await freelancer.page.getByText(/guardad/i).first().waitFor({ timeout: 15_000 });
  await freelancer.page.getByRole("button", { name: "Hacer público mi perfil" }).click();
  await freelancer.page.getByRole("button", { name: "Sí, publicar perfil" }).click();
  await freelancer.page.getByText("Perfil público", { exact: true }).first().waitFor({ timeout: 15_000 });
  check("3.1 el freelancer completa su perfil y lo hace público", sql(`select p.is_public from public.profiles p join auth.users u on u.id = p.id where u.email = '${freelancer.email}'`) === "t");

  // ---------- 4) Feed: swipe táctil, botones, teclado, deshacer ----------
  const { page: fp } = freelancer;
  const interactions = () => sql(`select coalesce(string_agg(state || ':' || count, ','), '') from (select state, count(*) from public.freelancer_problem_interactions i join auth.users u on u.id = i.freelancer_id where u.email = '${freelancer.email}' group by state order by state) t`);
  await fp.goto("/app/descubrir/");
  const topCard = () => fp.locator("article[aria-label^='Problema:']").first();
  await topCard().waitFor({ timeout: 20_000 });
  check("4.1 el feed muestra problemas reales (el más reciente primero)", (await topCard().getAttribute("aria-label")).includes("Automatizar la facturación mensual"));
  // Close the first-time tutorial if it is shown.
  await fp.getByRole("button", { name: "Cerrar tutorial" }).click({ timeout: 2500 }).catch(() => {});
  await touchSwipe(freelancer, topCard(), 220);
  await fp.getByText("Guardado en tus Likes").first().waitFor({ timeout: 10_000 });
  check("4.2 swipe táctil a la derecha guarda el problema (aviso «Guardado en tus Likes»)", interactions().includes("saved:1"));
  await fp.getByRole("button", { name: "Me interesa", exact: true }).click();
  await sleep(700);
  check("4.3 el botón «Me interesa» guarda el siguiente", interactions().includes("saved:2"));
  // Keyboard shortcuts are a desktop feature (>= 1024 px), so widen the viewport for this step only.
  await fp.setViewportSize({ width: 1280, height: 800 });
  await sleep(500);
  await fp.keyboard.press("ArrowRight");
  await sleep(900);
  check("4.4 la flecha derecha del teclado guarda el siguiente (escritorio)", interactions().includes("saved:3"));
  await fp.setViewportSize({ width: 390, height: 844 });
  await sleep(500);
  await touchSwipe(freelancer, topCard(), -220);
  await fp.getByText("Descartado").first().waitFor({ timeout: 10_000 });
  check("4.5 swipe táctil a la izquierda descarta", interactions().includes("dismissed:1"));
  await fp.getByRole("button", { name: "Deshacer" }).first().click();
  await sleep(900);
  check("4.6 «Deshacer» devuelve el problema al feed", !interactions().includes("dismissed") && (await topCard().getAttribute("aria-label")).includes("Ordenar la atención"));

  // ---------- 5) Propuesta: errores en línea, límite de caracteres, enviada ----------
  await fp.getByRole("button", { name: /Proponer ahora/ }).first().click();
  const sheet = fp.getByRole("dialog");
  await sheet.getByRole("button", { name: /Enviar propuesta/ }).click();
  await sheet.getByText("Cuéntale a la empresa cómo entiendes el problema.").waitFor({ timeout: 5000 });
  check("5.1 enviar vacío muestra errores en línea por campo (diagnóstico, solución, entregables, plazo, precio)",
    (await sheet.locator("[aria-invalid='true']").count()) >= 4);
  const diagnosis = sheet.getByLabel(/^Diagnóstico/);
  await diagnosis.fill("a".repeat(5001));
  const typed = (await diagnosis.inputValue()).length;
  const tooLong = await sheet.getByText(/no pueden superar|no puede superar|5000/).count();
  check("5.2 el límite de 5000 caracteres se aplica (campo recortado o error visible)", typed <= 5000 || tooLong > 0, `largo=${typed}, avisos=${tooLong}`);
  await diagnosis.fill("Entiendo que el equipo pierde visibilidad del seguimiento entre varios canales de atención.");
  await sheet.getByLabel(/^Solución propuesta/).fill("Centralizar las solicitudes en una bandeja compartida con estados claros.");
  await sheet.getByLabel(/^Entregables/).fill("Mapa del proceso, bandeja compartida y guía de uso.");
  await sheet.getByLabel(/^Plazo/).fill("4 semanas");
  await sheet.getByLabel(/^Precio/).fill("4200");
  await sheet.getByRole("button", { name: /Enviar propuesta/ }).click();
  await fp.getByText(/Tu propuesta fue enviada/).first().waitFor({ timeout: 20_000 });
  check("5.3 la propuesta queda «enviada» (mensaje de éxito y fila en la base)", sql(`select count(*) from public.proposals p join auth.users u on u.id = p.freelancer_id where u.email = '${freelancer.email}' and p.status = 'submitted' and p.currency = 'PEN' and p.price = 4200`) === "1");

  // ---------- 6) Bandeja de la empresa: comparar y Match ----------
  await secondFreelancerProposal("Ordenar la atención de nuestros clientes", companyA.email);
  const cp = companyA.page;
  await cp.goto("/app/propuestas/");
  const problemSelect = cp.getByLabel("Problema");
  const optionValue = await problemSelect.evaluate((select) => [...select.options].find((option) => /Ordenar la atención/.test(option.textContent ?? ""))?.value ?? "");
  await problemSelect.selectOption(optionValue);
  await cp.getByText("Ana Torres").first().waitFor({ timeout: 20_000 });
  check("6.1 la empresa ve las dos propuestas recibidas en su bandeja", (await cp.getByText("Diego Salazar").count()) > 0 && (await cp.getByText("Ana Torres").count()) > 0);
  check("6.2 los precios se muestran con su moneda (S/ y US$)", (await cp.getByText(/S\/\s?4[,.]?200/).count()) > 0 && (await cp.getByText(/US\$\s?1[,.]?250/).count()) > 0);
  const boxes = cp.getByRole("checkbox", { name: /Comparar/ });
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await cp.getByRole("button", { name: /Ver comparación/ }).click();
  await cp.getByRole("heading", { name: "Comparar propuestas" }).waitFor();
  check("6.3 la comparación lado a lado muestra ambas propuestas", (await cp.locator("table th").filter({ hasText: /Ana Torres|Diego Salazar/ }).count()) === 2);
  await cp.getByRole("button", { name: /Volver a la bandeja/ }).click();
  await cp.getByRole("button", { name: "Me interesa" }).first().click();
  const celebration = cp.getByRole("dialog");
  await celebration.getByText("Hicieron Match").waitFor({ timeout: 20_000 });
  await sleep(1200);
  const opacity = await celebration.evaluate((node) => { let n = node, o = 1; while (n && n instanceof HTMLElement) { o *= Number(getComputedStyle(n).opacity); n = n.parentElement; } return o; });
  check("6.4 «Me interesa» crea el Match y se celebra (diálogo totalmente visible, sin promesa de contrato ni pago)", sql("select count(*) from public.matches where company_user_id = (select id from auth.users where email = '" + companyA.email + "')") === "1" && opacity > 0.95 && (await celebration.getByText(/no es una contratación ni un pago/).count()) > 0, `opacidad=${opacity}`);

  // ---------- 7) Chat en tiempo real, aviso suave y no leídos ----------
  await celebration.getByRole("link", { name: "Abrir chat" }).click();
  await cp.waitForURL(/\/app\/chats\/?\?match=/);
  await fp.goto("/app/likes/");
  const companyBox = cp.getByRole("textbox", { name: /mensaje/i });
  await companyBox.waitFor({ timeout: 15_000 });
  const notice = cp.getByRole("note").filter({ hasText: "Mantén la conversación en MatchWork" });
  check("7.1 el hilo muestra el aviso suave «Mantén la conversación en MatchWork»", (await notice.count()) === 1);
  await cp.getByRole("button", { name: "Cerrar aviso" }).click();
  const dismissed = await notice.waitFor({ state: "detached", timeout: 3000 }).then(() => true).catch(() => false);
  check("7.2 el aviso se puede descartar", dismissed);
  const contactMessage = `Escríbeme a ana@example.com o al +51 999 888 777, o mira https://ejemplo.pe/portafolio?run=${stamp}`;
  await companyBox.fill(contactMessage);
  await companyBox.press("Enter");
  await cp.getByText(contactMessage, { exact: true }).waitFor({ timeout: 15_000 });
  let stored = "0";
  for (let attempt = 0; attempt < 10 && stored !== "1"; attempt += 1) { stored = sql("select count(*) from public.messages where body = '" + contactMessage + "'"); if (stored !== "1") await sleep(500); }
  check("7.3 email, teléfono y enlace pasan sin bloquear ni enmascarar (guardado tal cual)", stored === "1");
  const sentAt = Date.now();
  await fp.locator("[aria-label='1 mensajes sin leer']:visible").first().waitFor({ timeout: 45_000 });
  const badgeLatency = Date.now() - sentAt;
  check("7.4 el freelancer recibe el no leído en la navegación sin recargar", badgeLatency < 40_000, `${badgeLatency} ms desde que se detectó el envío`);
  await fp.getByRole("link", { name: /Chats/ }).first().click();
  await fp.getByRole("button", { name: /Ordenar la atención/ }).first().click();
  await fp.getByText(contactMessage, { exact: true }).waitFor({ timeout: 15_000 });
  check("7.5 el freelancer abre la conversación y ve el mensaje", true);
  const freelancerBox = fp.getByRole("textbox", { name: /mensaje/i });
  const reply = `¡Hola! Gracias por el Match, ¿cuándo podemos conversar? (${stamp})`;
  await freelancerBox.fill(reply);
  const replySentAt = Date.now();
  await freelancerBox.press("Enter");
  await cp.getByLabel("Mensajes de la conversación").getByText(reply).first().waitFor({ timeout: 60_000 });
  const replyLatency = Date.now() - replySentAt;
  check("7.6 la respuesta llega a la empresa en tiempo real (sin recargar, menos de 10 s)", replyLatency < 10_000, `${replyLatency} ms`);

  // ---------- 8) Landing «En vivo» ----------
  const visitor = await newPlayer(browser, "visitante", mobile);
  players.push(visitor);
  await visitor.page.goto("/");
  const strip = visitor.page.getByText("En vivo", { exact: true }).first();
  await strip.waitFor({ timeout: 20_000 });
  await strip.scrollIntoViewIfNeeded();
  await sleep(2500); // the count-up runs once when the strip enters the viewport
  const expected = sql("select open_problems || ',' || companies_published || ',' || freelancers_active || ',' || proposals_submitted from public.get_public_counters()").split(",").map(Number);
  const shown = await visitor.page.evaluate(() => {
    const block = [...document.querySelectorAll("div,section")].reverse().find((element) => /En vivo/.test(element.textContent ?? "") && /Problemas abiertos/.test(element.textContent ?? "") && (element.textContent ?? "").length < 600);
    return [...(block?.querySelectorAll("*") ?? [])].filter((e) => e.children.length === 0).map((e) => (e.textContent ?? "").trim()).filter((t) => /^\d[\d.,]*$/.test(t)).map((t) => Number(t.replace(/[.,]/g, "")));
  });
  check("8.1 la franja «En vivo» muestra los contadores reales de la base", expected.filter((v) => v > 0).every((value) => shown.includes(value)), `base=${expected.join("/")} pantalla=${shown.join("/")}`);

  // ---------- 9) Cuota anti-spam con mensaje claro ----------
  const consoleBeforeQuota = freelancer.problems.length;
  sql("update public.rate_limit_policies set max_events = 2, window_seconds = 120 where action = 'chat_send'");
  const box = fp.getByRole("textbox", { name: /mensaje/i });
  let limitText = "";
  for (let i = 1; i <= 4 && !limitText; i += 1) {
    await box.fill(`Mensaje de prueba ${i} (${stamp})`);
    await box.press("Enter");
    await sleep(1200);
    limitText = (await fp.locator("[role='status'], [role='alert']").allInnerTexts()).join(" ").match(/(Hiciste muchas acciones|Has enviado demasiados)[^.]*\.[^.]*\./i)?.[0] ?? "";
  }
  check("9.1 al pasar la cuota el mensaje es claro e indica cuánto esperar", /(\d+)\s*(segundos|s\b|minuto)/i.test(limitText), `«${limitText}»`);
  sql("update public.rate_limit_policies set max_events = 30, window_seconds = 60 where action = 'chat_send'");
  // The browser logs the rejected request (HTTP error) on its own console; that is the expected effect of the quota.
  forgetNetworkErrors(freelancer, consoleBeforeQuota);

  // ---------- 10) Cerrar sesión, volver a entrar y recargar en cada ruta profunda ----------
  const problemId = sql(`select b.id from public.business_problems b join auth.users u on u.id = b.company_user_id where u.email = '${companyA.email}' order by b.created_at limit 1`);
  const matchId = sql("select id from public.matches order by created_at desc limit 1");
  async function visitRoutes(player, label, routes) {
    const broken = [];
    for (const route of routes) {
      const response = await player.page.goto(route);
      await player.page.waitForLoadState("networkidle").catch(() => {});
      await sleep(600);
      const reloaded = await player.page.reload();
      await player.page.waitForLoadState("networkidle").catch(() => {});
      await sleep(600);
      const text = (await player.page.evaluate(() => document.body.innerText)).trim();
      const path = new URL(player.page.url()).pathname + new URL(player.page.url()).search;
      if ((response?.status() ?? 0) >= 400 || (reloaded?.status() ?? 0) >= 400 || text.length < 40 || /404|No se encontró|This page could not be found/i.test(text.slice(0, 200)) || /iniciar-sesion/.test(path)) broken.push(`${route} → ${path} (${reloaded?.status()}, ${text.length} caracteres)`);
    }
    check(`10.${label} recargar (F5) en ${routes.length} rutas profundas sin 404, sin pantalla en blanco y sin perder la sesión`, broken.length === 0, broken.join(" | "));
  }
  const consoleBeforeLogout = companyA.problems.length;
  await logout(companyA);
  await companyA.page.waitForURL(/iniciar-sesion|\/$/, { timeout: 15_000 }).catch(() => {});
  await sleep(2500); // let in-flight polls finish and fail
  forgetNetworkErrors(companyA, consoleBeforeLogout); // in-flight requests rejected with 401 right after sign-out are expected
  check("10.1 cerrar sesión borra la sesión y saca de la app", /iniciar-sesion|\/$/.test(companyA.page.url()));
  await login(companyA);
  await visitRoutes(companyA, "2 empresa:", ["/app/", "/app/perfil/", "/app/propuestas/", "/app/problemas/", "/app/problemas/nuevo/", `/app/problemas/detalle/?id=${problemId}`, "/app/explorar/", "/app/likes/", "/app/matches/", "/app/guardados/", `/app/chats/?match=${matchId}`]);
  await visitRoutes(freelancer, "3 freelancer:", ["/app/", "/app/descubrir/", "/app/explorar/", "/app/likes/", "/app/matches/", "/app/guardados/", "/app/perfil/", `/app/chats/?match=${matchId}`]);
  await visitRoutes(adminP, "4 admin:", ["/app/admin/", "/app/admin/?tab=usuarios", "/app/admin/?tab=problemas", "/app/admin/?tab=ajustes"]);
  const anonymous = await newPlayer(browser, "anonimo", desktop);
  players.push(anonymous);
  const redirected = [];
  for (const route of ["/app/", "/app/perfil/", "/app/descubrir/", "/app/propuestas/", "/app/chats/", "/app/admin/"]) {
    await anonymous.page.goto(route);
    await anonymous.page.waitForURL(/iniciar-sesion/, { timeout: 15_000 }).catch(() => {});
    if (!/iniciar-sesion/.test(anonymous.page.url())) redirected.push(route);
  }
  check("10.5 sin sesión, cada ruta privada redirige a iniciar sesión", redirected.length === 0, redirected.join(", "));

  // Suspended account: shows the notice with the reason and cannot write.
  sql(`update public.app_users set suspended_at = now(), suspension_reason = 'Prueba automática de suspensión' where id = (select id from auth.users where email = '${freelancer.email}')`);
  await freelancer.page.goto("/app/descubrir/");
  const noticeShown = await freelancer.page.getByText(/Tu cuenta está suspendida/).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
  const reasonShown = (await freelancer.page.getByText(/Prueba automática de suspensión/).count()) > 0;
  check("10.6 una cuenta suspendida ve el aviso con el motivo", noticeShown && reasonShown);
  const sendWhileSuspended = await freelancer.page.goto(`/app/chats/?match=${matchId}`).then(async () => { const textbox = freelancer.page.getByRole("textbox", { name: /mensaje/i }); await textbox.waitFor({ timeout: 10_000 }); return textbox.isDisabled(); }).catch(() => true);
  check("10.7 la cuenta suspendida no puede escribir (el campo de mensaje está deshabilitado)", sendWhileSuspended);
  sql(`update public.app_users set suspended_at = null, suspension_reason = null where id = (select id from auth.users where email = '${freelancer.email}')`);

  // ---------- B) Accesibilidad y responsive de todas las pantallas reales ----------
  if (process.env.E2E_SKIP_A11Y !== "1") {
    const extra = await runSweep({ browser, desktop, companyA, freelancer, adminP, matchId, problemId });
    players.push(...extra.players);
    if (extra.notes.length) console.log(`\nNotas axe (moderadas/menores, no bloquean):\n  ${[...new Set(extra.notes)].slice(0, 25).join("\n  ")}`);
  }

  exitCode = 0;
} catch (error) {
  console.error("\nERROR EN EL RECORRIDO:", error);
  await Promise.all(players.map((p, i) => p.page.screenshot({ path: `/tmp/e2e-fail-${i}.png` }).catch(() => {})));
} finally {
  const clean = players.every((p) => p.problems.length === 0);
  check("consola sin errores ni avisos en todo el recorrido", clean, clean ? "" : players.flatMap((p) => p.problems).slice(0, 5).join(" | "));
  await browser.close();
  process.exit(summary() && exitCode === 0 ? 0 : 1);
}
