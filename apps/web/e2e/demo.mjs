// Demo para enseñar el producto: video del recorrido a 390x844 y hojas de contactos a 390 y 1280 px.
// Crea datos de ejemplo creíbles (nada real). Pensado para una base recién reseteada con el stack completo:
//   MATCHWORK_STACK_FULL=1 bash supabase/scripts/local-stack.sh reset   (y esperar ~30 s)
//   DEMO_OUT=~/Downloads/Matchwork-demo E2E_PSQL=<psql> node e2e/demo.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { BASE_URL, PASSWORD, sleep, sql, SUPABASE_URL } from "./lib.mjs";

const OUT = (process.env.DEMO_OUT ?? join(homedir(), "Downloads", "Matchwork-demo")).replace(/^~/, homedir());
const WORK = join(tmpdir(), `matchwork-demo-${Date.now()}`);
const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
mkdirSync(OUT, { recursive: true });
mkdirSync(join(WORK, "videos"), { recursive: true });
mkdirSync(join(WORK, "shots390"), { recursive: true });
mkdirSync(join(WORK, "shots1280"), { recursive: true });

// ---------- datos de ejemplo ----------
async function account(email, name, role) {
  const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD, options: { data: { full_name: name, role } } });
  if (error) throw error;
  sql(`update auth.users set email_confirmed_at = now() where lower(email) = lower('${email}')`);
  return { id: data.user.id, email, name, client };
}
const q = (text) => text.replace(/'/g, "''");

const otherCompanies = [
  { email: "demo-ferreteria@example.test", name: "Ferretería Santa Rosa", industry: "Comercio minorista", problems: [
    ["Organizar el inventario de más de 2,000 productos", "Llevamos el stock en cuadernos y hojas de cálculo. Cada semana descubrimos faltantes o sobrantes y perdemos ventas. Queremos un sistema simple para saber qué hay, qué falta y cuándo reponer.", "{time,errors,financial}", "{organize,reduce_errors}", "1000_3000", "within_one_month"],
    ["Responder los pedidos de WhatsApp sin perder ninguno", "Recibimos pedidos por WhatsApp a toda hora y varios se pierden entre mensajes. Necesitamos ordenarlos, asignarlos y avisar al cliente cuando estén listos.", "{customers,time}", "{customer_service,automate}", "under_1000", "under_two_weeks"],
  ] },
  { email: "demo-clinica@example.test", name: "Clínica Dental Sonrisa Andina", industry: "Salud", problems: [
    ["Reducir las citas perdidas con recordatorios automáticos", "Cerca de 1 de cada 5 pacientes no llega a su cita y el consultorio queda vacío. Queremos recordatorios por mensaje y una forma fácil de reprogramar.", "{financial,time}", "{automate,customer_service}", "1000_3000", "within_one_month"],
    ["Digitalizar las historias clínicas en papel", "Tenemos 8 años de historias clínicas en folders. Buscamos una forma segura de digitalizarlas y consultarlas rápido desde recepción.", "{time,repetitive}", "{organize,save_time}", "3000_5000", "one_to_three_months"],
  ] },
  { email: "demo-transportes@example.test", name: "Transportes Pacífico", industry: "Logística", problems: [
    ["Saber dónde está cada entrega sin llamar al conductor", "Los clientes preguntan todo el día por su pedido y tenemos que llamar a cada conductor. Queremos un seguimiento sencillo de entregas con avisos automáticos.", "{customers,time,repetitive}", "{customer_service,automate}", "3000_5000", "one_to_three_months"],
    ["Cuadrar las rutas de reparto de la semana", "Armamos las rutas a mano cada domingo y casi siempre hay cruces y kilómetros de más. Buscamos ayuda para planificarlas mejor.", "{time,financial}", "{save_time,organize}", "1000_3000", "flexible"],
  ] },
];
for (const company of otherCompanies) {
  const user = await account(company.email, company.name, "company");
  sql(`insert into public.company_profiles (user_id, company_name, industry, description) values ('${user.id}', '${q(company.name)}', '${q(company.industry)}', '${q(`${company.name}: empresa familiar con más de 10 años en su rubro.`)}') on conflict (user_id) do nothing`);
  for (const [title, description, impacts, objectives, budget, deadline] of company.problems) {
    sql(`insert into public.business_problems (company_user_id, status, title, description, impacts, industry_snapshot, objectives, budget_choice, deadline_choice, current_step, reviewed_and_consented, show_company_name, published_at) values ('${user.id}', 'open', '${q(title)}', '${q(description)}', '${impacts}', '${q(company.industry)}', '${objectives}', '${budget}', '${deadline}', 5, true, true, clock_timestamp())`);
    await sleep(1100); // fechas distintas: el feed ordena del más reciente al más antiguo
  }
}
const bakery = await account("demo-panaderia@example.test", "Rosa Quispe", "company");
sql(`insert into public.company_profiles (user_id, company_name, industry, description) values ('${bakery.id}', 'Panadería Los Andes', 'Alimentos y bebidas', 'Panadería artesanal con tres locales en Arequipa y pedidos por encargo para eventos.') on conflict (user_id) do nothing`);
const camila = await account("demo-camila@example.test", "Camila Rojas", "freelancer");
sql(`update public.profiles set is_public = true where id = '${camila.id}'`);
sql(`update public.freelancer_profiles set headline = 'Diseñadora de servicios digitales', bio = 'Ayudo a negocios pequeños a ordenar sus procesos con herramientas simples: hojas conectadas, formularios y paneles. Trabajo con comercio, salud y alimentos.', years_experience = 6, location_text = 'Lima, Perú', availability_status = 'Disponible' where user_id = '${camila.id}'`);
const diego = await account("demo-diego@example.test", "Diego Salazar", "freelancer");
sql(`update public.profiles set is_public = true where id = '${diego.id}'`);
sql(`update public.freelancer_profiles set headline = 'Desarrollador de aplicaciones para pymes', years_experience = 8, location_text = 'Cusco, Perú' where user_id = '${diego.id}'`);

// ---------- utilidades de grabación ----------
const browser = await chromium.launch({ channel: "chrome", slowMo: 90 });
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "es-PE", baseURL: BASE_URL };
async function segment(name, run) {
  // Sin recordVideo de Playwright (necesita su propio ffmpeg): se captura con CDP screencast y se une con el ffmpeg del sistema.
  const framesDir = join(WORK, "videos", name);
  mkdirSync(framesDir, { recursive: true });
  const context = await browser.newContext(mobile);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async (event) => {
    const file = join(framesDir, `${String(frames.length).padStart(6, "0")}.jpg`);
    writeFileSync(file, Buffer.from(event.data, "base64"));
    frames.push({ file, t: event.metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, everyNthFrame: 1 });
  await page.addInitScript(() => {
    window.__caption = (text) => {
      let box = document.getElementById("demo-caption");
      if (!box) {
        box = document.createElement("div");
        box.id = "demo-caption";
        box.style.cssText = "position:fixed;left:12px;right:12px;top:10px;z-index:2147483647;padding:10px 14px;border-radius:14px;background:rgba(121,64,232,.95);color:#fff;font:600 15px/1.35 system-ui,sans-serif;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none";
        (document.body ?? document.documentElement).appendChild(box);
      }
      box.textContent = text;
    };
  });
  const caption = async (text, hold = 1800) => { await page.evaluate((value) => window.__caption?.(value), text).catch(() => {}); await sleep(hold); };
  const login = async (email) => {
    await page.goto("/iniciar-sesion/");
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(PASSWORD);
    await page.getByRole("button", { name: /Iniciar sesión/ }).click();
    await page.waitForURL(/\/app\/?/, { timeout: 30_000 });
  };
  try { await run({ page, context, caption, login }); } finally {
    await cdp.send("Page.stopScreencast").catch(() => {});
    await context.close();
  }
  // Lista de cuadros con su duración real (diferencia de marcas de tiempo).
  const lines = [];
  frames.forEach((frame, index) => {
    const next = frames[index + 1];
    lines.push(`file '${frame.file}'`, `duration ${next ? Math.max(0.02, next.t - frame.t).toFixed(3) : "1.500"}`);
  });
  lines.push(`file '${frames.at(-1).file}'`);
  const list = join(framesDir, "frames.txt");
  writeFileSync(list, lines.join("\n"));
  return list;
}

const clips = [];
const bakeryProblem = "Controlar el inventario de insumos y mermas";

// 1) La empresa publica su problema
clips.push(await segment("1-empresa-publica", async ({ page, caption, login }) => {
  await page.goto("/");
  await caption("MatchWork conecta negocios con profesionales que resuelven problemas concretos", 2600);
  await login("demo-panaderia@example.test");
  await caption("Rosa, de Panadería Los Andes, publica su problema", 2000);
  await page.goto("/app/problemas/nuevo/");
  await page.locator("#problem-title").fill(bakeryProblem);
  await page.locator("#problem-description").fill("Compramos harina, mantequilla y levadura a mano y nunca sabemos cuánto queda. Cada mes tiramos insumos vencidos y a veces nos quedamos sin algo a media producción.");
  await caption("Cuenta el problema con sus palabras", 1500);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Paso 2 de 5").waitFor();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Paso 3 de 5").waitFor();
  await page.getByLabel("Organizar información").check();
  await page.getByLabel("Reducir errores").check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Paso 4 de 5").waitFor();
  await page.getByRole("radio", { name: /1,000 – .*3,000/ }).check();
  await page.getByRole("radio", { name: "Dentro de 1 mes" }).check();
  await caption("Presupuesto y plazo: sin compromisos", 1400);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Paso 5 de 5").waitFor();
  await page.getByLabel(/Confirmo que revisé la información/).check();
  await page.getByRole("button", { name: "Publicar problema" }).click();
  await page.getByRole("heading", { name: /publicado|publicación|Publicamos/i }).first().waitFor({ timeout: 30_000 });
  await caption("¡Publicado! Ya lo ven los profesionales", 2600);
}));

// 2) La freelancer descubre, hace swipe y envía una propuesta
// Los problemas de ejemplo pasan a ser más recientes que el de la panadería, para que haya tarjetas que descartar antes de llegar a él.
sql(`update public.business_problems set published_at = clock_timestamp() + interval '1 minute' where title <> '${q(bakeryProblem)}'`);
clips.push(await segment("2-freelancer-propone", async ({ page, caption, login }) => {
  await login("demo-camila@example.test");
  await caption("Camila, diseñadora freelancer, descubre problemas reales", 2000);
  await page.goto("/app/descubrir/");
  const card = () => page.locator("article[aria-label^='Problema:']").first();
  await card().waitFor({ timeout: 30_000 });
  const tutorial = page.getByRole("button", { name: "Cerrar tutorial" });
  if (await tutorial.count()) await tutorial.click();
  const swipe = async (dx) => {
    const box = await card().boundingBox();
    const y = box.y + box.height / 2, x0 = box.x + box.width / 2;
    const cdp = await page.context().newCDPSession(page);
    const send = (type, x) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    await send("touchStart", x0);
    for (let i = 1; i <= 24; i += 1) { await send("touchMove", x0 + (dx * i) / 24); await sleep(24); }
    await send("touchEnd", x0 + dx);
    await cdp.detach();
    await sleep(900);
  };
  await caption("Desliza a la izquierda para pasar", 1200);
  for (let i = 0; i < 8 && !(await card().getAttribute("aria-label").catch(() => ""))?.includes(bakeryProblem); i += 1) await swipe(-230);
  await caption("Este sí le interesa: lo abre y propone", 1800);
  await page.getByRole("button", { name: /Proponer ahora/ }).first().click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel(/^Diagnóstico/).fill("El problema es que el stock vive en la cabeza del equipo: sin registro de entradas y salidas no se puede predecir qué se acaba ni qué se vence.");
  await sheet.getByLabel(/^Solución propuesta/).fill("Un tablero simple de inventario con alertas de mínimo y de vencimiento, y un formulario para registrar compras y mermas desde el celular.");
  await sheet.getByLabel(/^Entregables/).fill("Tablero de inventario, formulario de registro, alertas y una guía de uso para el equipo.");
  await sheet.getByLabel(/^Plazo/).fill("3 semanas");
  await sheet.getByLabel(/^Precio/).fill("1800");
  await caption("Escribe su propuesta: diagnóstico, solución, plazo y precio", 2200);
  await sheet.getByRole("button", { name: /Enviar propuesta/ }).click();
  await page.getByText(/Tu propuesta fue enviada/).first().waitFor({ timeout: 30_000 });
  await caption("¡Propuesta enviada!", 2400);
}));

// 3) La empresa ve la propuesta, hace Match y conversa
clips.push(await segment("3-empresa-match-chat", async ({ page, caption, login }) => {
  // Una segunda propuesta, para que haya algo que comparar.
  const other = await diego.client.auth.signInWithPassword({ email: diego.email, password: PASSWORD });
  if (other.error) throw other.error;
  const problemId = sql(`select id from public.business_problems where title = '${q(bakeryProblem)}'`);
  const draft = await diego.client.rpc("save_proposal_draft", { p_problem_id: problemId, p_data: { diagnosis: "Falta un registro único de compras y consumo de insumos.", solution: "Una aplicación web sencilla con escaneo de códigos y reportes de mermas.", deliverables: "App web, capacitación y soporte durante un mes.", timeline: "6 semanas", price: 3200, currency: "PEN" } });
  if (!draft.error) await diego.client.rpc("submit_proposal", { p_proposal_id: draft.data });
  await login("demo-panaderia@example.test");
  await caption("Rosa recibe propuestas y las compara", 2000);
  await page.goto("/app/propuestas/");
  const select = page.getByLabel("Problema");
  await select.waitFor({ timeout: 30_000 });
  const value = await select.evaluate((element, title) => [...element.options].find((option) => option.textContent?.includes(title))?.value ?? "", bakeryProblem);
  await select.selectOption(value);
  await page.getByText("Camila Rojas").first().waitFor({ timeout: 30_000 });
  await caption("Dos propuestas: una de S/ 1,800 y otra de S/ 3,200", 2600);
  const cards = page.getByRole("checkbox", { name: /Comparar/ });
  await cards.nth(0).check();
  await cards.nth(1).check();
  await page.getByRole("button", { name: /Ver comparación/ }).click();
  await page.getByRole("heading", { name: "Comparar propuestas" }).waitFor();
  await caption("Las ve lado a lado", 2600);
  await page.getByRole("button", { name: /Volver a la bandeja/ }).click();
  const interested = page.getByRole("article").filter({ hasText: "Camila Rojas" }).getByRole("button", { name: "Me interesa" });
  await caption("Elige a Camila: «Me interesa» y hacen Match", 1800);
  await interested.first().click();
  const celebration = page.getByRole("dialog");
  await celebration.getByText("Hicieron Match").waitFor({ timeout: 30_000 });
  await sleep(2600);
  await celebration.getByRole("link", { name: "Abrir chat" }).click();
  await page.waitForURL(/\/app\/chats\/?\?match=/, { timeout: 30_000 });
  const matchId = new URL(page.url()).searchParams.get("match");
  const box = page.getByRole("textbox", { name: /mensaje/i });
  await box.waitFor({ timeout: 30_000 });
  await caption("Y ya pueden conversar en tiempo real", 1800);
  await box.pressSequentially("Hola Camila, nos gustó tu propuesta. ¿Puedes empezar la próxima semana?", { delay: 35 });
  await box.press("Enter");
  await sleep(2500);
  await camila.client.auth.signInWithPassword({ email: camila.email, password: PASSWORD });
  await camila.client.rpc("send_message", { p_match_id: matchId, p_body: "¡Hola Rosa! Sí, puedo empezar el lunes. Te mando un calendario de trabajo." });
  await caption("La respuesta llega al instante", 3400);
}));

// ---------- unir los clips en un solo MP4 ----------
const normalized = [];
for (const [index, clip] of clips.entries()) {
  const target = join(WORK, `clip-${index + 1}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", clip, "-vf", "fps=30,scale=780:1688:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-an", target]);
  normalized.push(target);
}
writeFileSync(join(WORK, "lista.txt"), normalized.map((file) => `file '${file}'`).join("\n"));
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(WORK, "lista.txt"), "-c", "copy", "-movflags", "+faststart", join(OUT, "recorrido-matchwork-390x844.mp4")]);

// ---------- hojas de contactos ----------
// El mazo de la hoja debe mostrar tarjetas: se olvidan los descartes hechos durante el video.
sql(`delete from public.freelancer_problem_interactions where freelancer_id = '${camila.id}' and state = 'dismissed'`);
async function shots(width, height, dir, mobileMode) {
  const options = mobileMode ? mobile : { viewport: { width, height }, locale: "es-PE", baseURL: BASE_URL, deviceScaleFactor: 1 };
  const taken = [];
  const take = async (page, name) => { await sleep(900); const file = join(WORK, dir, `${String(taken.length + 1).padStart(2, "0")}.png`); await page.screenshot({ path: file }); taken.push({ name, file }); };
  const asUser = async (email, steps) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.goto("/iniciar-sesion/");
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(PASSWORD);
    await page.getByRole("button", { name: /Iniciar sesión/ }).click();
    await page.waitForURL(/\/app\/?/, { timeout: 30_000 });
    await steps(page);
    await context.close();
  };
  const publicContext = await browser.newContext(options);
  const pub = await publicContext.newPage();
  await pub.goto("/"); await take(pub, "Inicio");
  await pub.goto("/registro/"); await take(pub, "Crear cuenta");
  await pub.goto("/iniciar-sesion/"); await take(pub, "Iniciar sesión");
  await publicContext.close();
  await asUser("demo-panaderia@example.test", async (page) => {
    await take(page, "Empresa · inicio");
    await page.goto("/app/problemas/"); await take(page, "Empresa · mis problemas");
    await page.goto("/app/problemas/nuevo/"); await take(page, "Empresa · publicar problema");
    await page.goto("/app/propuestas/"); await page.waitForTimeout(1200);
    const select = page.getByLabel("Problema");
    const value = await select.evaluate((element, title) => [...element.options].find((option) => option.textContent?.includes(title))?.value ?? "", bakeryProblem);
    if (value) await select.selectOption(value);
    await take(page, "Empresa · bandeja de propuestas");
    await page.goto("/app/matches/"); await take(page, "Empresa · matches");
    await page.goto("/app/chats/"); await take(page, "Empresa · chats");
    await page.goto("/app/perfil/"); await take(page, "Empresa · perfil");
  });
  await asUser("demo-camila@example.test", async (page) => {
    await page.goto("/app/descubrir/");
    const tutorial = page.getByRole("button", { name: "Cerrar tutorial" });
    if (await tutorial.count()) await tutorial.click();
    await take(page, "Freelancer · mazo de problemas");
    await page.goto("/app/explorar/"); await take(page, "Freelancer · explorar");
    await page.goto("/app/likes/"); await take(page, "Freelancer · propuestas enviadas");
    await page.goto("/app/matches/"); await take(page, "Freelancer · matches");
    await page.goto("/app/chats/"); await take(page, "Freelancer · chats");
    await page.goto("/app/perfil/"); await take(page, "Freelancer · perfil");
  });
  return taken;
}
async function sheet(taken, columns, fileName, title, thumbWidth) {
  const images = taken.map((item) => `<figure><img src="data:image/png;base64,${readFileSync(item.file).toString("base64")}" width="${thumbWidth}"><figcaption>${item.name}</figcaption></figure>`).join("");
  const page = await browser.newPage({ viewport: { width: columns * (thumbWidth + 28) + 28, height: 800 } });
  await page.setContent(`<style>body{margin:0;padding:24px 14px;background:#0d1117;color:#f8fafc;font:600 15px system-ui,sans-serif}h1{margin:0 14px 18px;font-size:22px}main{display:grid;grid-template-columns:repeat(${columns},${thumbWidth}px);gap:22px 14px;padding:0 14px}figure{margin:0}img{display:block;border-radius:12px;border:1px solid #2a3340}figcaption{margin-top:8px;color:#b6c1d0;font-weight:500}</style><h1>${title}</h1><main>${images}</main>`);
  await page.screenshot({ path: join(OUT, fileName), fullPage: true });
  await page.close();
}
await sheet(await shots(390, 844, "shots390", true), 5, "hoja-de-contactos-390px.png", "MatchWork · pantallas principales a 390 px (iPhone)", 260);
await sheet(await shots(1280, 800, "shots1280", false), 3, "hoja-de-contactos-1280px.png", "MatchWork · pantallas principales a 1280 px (escritorio)", 560);
await browser.close();

writeFileSync(join(OUT, "LEEME.txt"), `Demostración de MatchWork (datos de ejemplo, nada real)\n\nrecorrido-matchwork-390x844.mp4  Video del recorrido completo: la empresa publica, la freelancer hace swipe y propone, la empresa compara, hace Match y conversan.\nhoja-de-contactos-390px.png      Pantallas principales en el teléfono.\nhoja-de-contactos-1280px.png     Pantallas principales en el escritorio.\n\nLos nombres (Panadería Los Andes, Camila Rojas, etc.) son inventados.\n`);
rmSync(WORK, { recursive: true, force: true });
console.log(`Listo: ${OUT}`);
