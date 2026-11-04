// Rendimiento del mazo de swipe y del chat con CPU x4 y red 4G lenta (Slow 4G de Lighthouse).
// Mide: fotogramas durante el arrastre, tareas largas, desplazamiento de diseño (CLS) y latencia de interacción.
// Uso: E2E_PSQL=<psql> node e2e/perf.mjs   (stack local en marcha y web servida en E2E_BASE_URL)
import { createClient } from "@supabase/supabase-js";
import { check, launch, login, newPlayer, PASSWORD, sleep, sql, stamp, summary, SUPABASE_URL } from "./lib.mjs";

const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const CPU = Number(process.env.E2E_CPU ?? 4);
const NETWORK = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };

async function signUp(label, role, name) {
  const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  const email = `perf-${label}-${stamp}@example.test`;
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD, options: { data: { full_name: name, role } } });
  if (error) throw error;
  sql(`update auth.users set email_confirmed_at = now() where email = '${email}'`);
  return { email, id: data.user.id };
}

const company = await signUp("empresa", "company", "Empresa Rendimiento");
const freelancer = await signUp("freelancer", "freelancer", "Freelancer Rendimiento");

// 14 problemas abiertos con texto realista y un Match con 300 mensajes.
const lorem = "Nuestro equipo registra los pedidos en hojas de cálculo y correos sueltos, lo que genera errores de seguimiento y retrasos con los clientes. Buscamos ordenar el proceso, centralizar la información y poder ver el estado de cada solicitud sin pedirlo por mensaje. ";
for (let i = 1; i <= 14; i += 1) {
  sql(`insert into public.business_problems (company_user_id, status, title, description, industry_snapshot) values ('${company.id}', 'open', 'Problema de rendimiento número ${i}: ordenar el seguimiento de pedidos', '${lorem.repeat(3).replace(/'/g, "''")}', 'Servicios profesionales')`);
}
const problemId = sql(`insert into public.business_problems (company_user_id, status, title, description) values ('${company.id}', 'open', 'Problema con conversación', 'Descripción') returning id`).split("\n")[0];
const proposalId = sql(`insert into public.proposals (problem_id, freelancer_id, status, diagnosis, solution, deliverables, timeline, price, submitted_at, problem_title_snapshot) values ('${problemId}', '${freelancer.id}', 'submitted', 'd', 's', 'e', '1 mes', 100, now(), 'Problema con conversación') returning id`).split("\n")[0];
const matchId = sql(`insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id) values ('${problemId}', '${proposalId}', '${company.id}', '${freelancer.id}') returning id`).split("\n")[0];
sql(`insert into public.messages (match_id, sender_id, body, created_at) select '${matchId}', case when g % 2 = 0 then '${company.id}'::uuid else '${freelancer.id}'::uuid end, 'Mensaje de prueba número ' || g || ': seguimos revisando el alcance del proyecto y los entregables acordados.', now() - ((300 - g) || ' minutes')::interval from generate_series(1, 300) g`);

const browser = await launch();
const player = await newPlayer(browser, "perf", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
player.email = freelancer.email;
const { page } = player;

const observers = () => {
  window.__perf = { longTasks: [], cls: 0, interactions: [], lcp: 0, shifts: [] };
  new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__perf.longTasks.push(Math.round(entry.duration)); }).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) { window.__perf.cls += entry.value; window.__perf.shifts.push(`${Math.round(entry.startTime)}ms ${entry.value.toFixed(3)} ${(entry.sources || []).map((source) => `${source.node?.nodeName}[${Math.round(source.previousRect.y)}→${Math.round(source.currentRect.y)} h${Math.round(source.previousRect.height)}→${Math.round(source.currentRect.height)}]`).join(" | ")}`); } }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__perf.lcp = Math.round(entry.startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__perf.interactions.push(Math.round(entry.duration)); }).observe({ type: "event", durationThreshold: 16, buffered: true });
};
await page.addInitScript(observers);

await login(player);
const cdp = await player.context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", NETWORK);
const read = () => page.evaluate(() => ({ ...window.__perf, longTasks: [...window.__perf.longTasks] }));
const total = (list) => list.reduce((sum, value) => sum + value, 0);
const p95 = (list) => { const sorted = [...list].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0; };

async function frames(durationMs, action) {
  await page.evaluate(() => { window.__frames = []; let last = performance.now(); const tick = (now) => { window.__frames.push(now - last); last = now; if (window.__framesOn) requestAnimationFrame(tick); }; window.__framesOn = true; requestAnimationFrame(tick); });
  await action();
  await sleep(durationMs);
  return page.evaluate(() => { window.__framesOn = false; return window.__frames.slice(1); });
}

// ---------- Mazo de swipe ----------
const start = Date.now();
await page.goto("/app/descubrir/");
const card = page.locator("article[aria-label^='Problema:']").first();
await card.waitFor({ timeout: 60_000 });
const loadMs = Date.now() - start;
await sleep(1500);
const afterLoad = await read();
console.log(`Mazo · carga hasta la primera tarjeta: ${loadMs} ms · LCP ${afterLoad.lcp} ms · CLS ${afterLoad.cls.toFixed(3)} · tareas largas ${afterLoad.longTasks.length} (${total(afterLoad.longTasks)} ms)`);
check("P1 el mazo muestra la primera tarjeta en menos de 8 s con CPU x4 y 4G lento", loadMs < 8000, `${loadMs} ms`);
check("P2 sin desplazamiento de diseño al cargar el mazo (CLS < 0.1)", afterLoad.cls < 0.1, afterLoad.cls.toFixed(3));

const box = await card.boundingBox();
const touch = await player.context.newCDPSession(page);
const dragFrames = await frames(300, async () => {
  const y = box.y + box.height / 2, x0 = box.x + box.width / 2;
  const send = (type, x) => touch.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await send("touchStart", x0);
  for (let i = 1; i <= 40; i += 1) { await send("touchMove", x0 + (i * 5)); await sleep(16); }
  await send("touchEnd", x0 + 200);
});
const dragAvg = total(dragFrames) / dragFrames.length;
console.log(`Mazo · arrastre: ${dragFrames.length} fotogramas · media ${dragAvg.toFixed(1)} ms (${(1000 / dragAvg).toFixed(0)} fps) · p95 ${p95(dragFrames).toFixed(1)} ms · >50 ms: ${dragFrames.filter((d) => d > 50).length}`);
check("P3 durante el arrastre la media supera 30 fps (CPU x4)", 1000 / dragAvg >= 30, `${(1000 / dragAvg).toFixed(0)} fps`);
check("P4 durante el arrastre ningún fotograma pasa de 100 ms", Math.max(...dragFrames) <= 100, `máx ${Math.max(...dragFrames).toFixed(0)} ms`);
await sleep(1500);
const afterDrag = await read();
console.log(`Mazo · tras el arrastre: tareas largas ${afterDrag.longTasks.length} (${total(afterDrag.longTasks)} ms) · máx ${Math.max(0, ...afterDrag.longTasks)} ms · interacciones lentas ${afterDrag.interactions.length} (máx ${Math.max(0, ...afterDrag.interactions)} ms) · CLS ${afterDrag.cls.toFixed(3)}`);
check("P5 ninguna tarea larga supera 300 ms en el mazo", Math.max(0, ...afterDrag.longTasks) <= 300, `máx ${Math.max(0, ...afterDrag.longTasks)} ms`);
check("P6 el CLS del mazo tras interactuar sigue por debajo de 0.1", afterDrag.cls < 0.1, afterDrag.cls.toFixed(3));

// Pulsar «Me interesa»/«Descartar» con botones: latencia de la interacción.
const dismiss = page.getByRole("button", { name: /Descartar|No me interesa|Pasar/ }).first();
if (await dismiss.count()) {
  const t0 = Date.now();
  await dismiss.click();
  await sleep(700);
  console.log(`Mazo · botón de descarte: ${Date.now() - t0} ms hasta estabilizar la siguiente tarjeta`);
}

// ---------- Chat ----------
const chatStart = Date.now();
await page.goto(`/app/chats/?match=${matchId}`);
await page.getByText(/Mensaje de prueba número 29\d:/).last().waitFor({ state: "visible", timeout: 60_000 });
const chatMs = Date.now() - chatStart;
await sleep(1500);
const chatLoaded = await read();
console.log(`Cambios de diseño del chat: ${chatLoaded.shifts.join(" ;; ")}`);
console.log(`Chat · primer mensaje visible: ${chatMs} ms · LCP ${chatLoaded.lcp} ms · CLS ${chatLoaded.cls.toFixed(3)} · tareas largas ${chatLoaded.longTasks.length} (${total(chatLoaded.longTasks)} ms, máx ${Math.max(0, ...chatLoaded.longTasks)} ms)`);
check("P7 el chat muestra mensajes en menos de 8 s con CPU x4 y 4G lento", chatMs < 8000, `${chatMs} ms`);
check("P8 el CLS del chat al cargar es menor que 0.1", chatLoaded.cls < 0.1, chatLoaded.cls.toFixed(3));

const scrollFrames = await frames(500, async () => {
  for (let i = 0; i < 10; i += 1) {
    await page.evaluate(() => { const list = document.querySelector("[role='log'], [data-chat-list], main") ?? document.scrollingElement; (list.scrollTo ? list : window).scrollTo?.({ top: 0 }); });
    await sleep(60);
  }
});
const scrollAvg = total(scrollFrames) / Math.max(1, scrollFrames.length);
console.log(`Chat · desplazamiento: ${scrollFrames.length} fotogramas · media ${scrollAvg.toFixed(1)} ms · p95 ${p95(scrollFrames).toFixed(1)} ms`);
check("P9 el desplazamiento del chat mantiene más de 30 fps (CPU x4)", 1000 / scrollAvg >= 30, `${(1000 / scrollAvg).toFixed(0)} fps`);

const box2 = page.getByRole("textbox", { name: /mensaje/i });
await box2.waitFor();
await box2.click();
// Tiempo síncrono de cada pulsación (React procesa el evento y confirma el renderizado). Se mide dentro de la página
// porque el tiempo de evento a pintura de Playwright/headless añade cientos de ms ajenos a la app.
const keystrokes = await page.evaluate(async () => {
  const area = document.querySelector("#chat-message");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
  const durations = [];
  let text = "";
  for (const char of "Mensaje de latencia con varias palabras para medir la escritura") {
    text += char;
    const t0 = performance.now();
    setter.call(area, text);
    area.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    durations.push(performance.now() - t0);
  }
  return durations;
});
const sortedKeys = [...keystrokes].sort((a, b) => a - b);
const keyP95 = sortedKeys[Math.floor(sortedKeys.length * 0.95)];
console.log(`Chat · pulsaciones con 300 mensajes: media ${(total(keystrokes) / keystrokes.length).toFixed(1)} ms · p95 ${keyP95.toFixed(1)} ms · máx ${Math.max(...keystrokes).toFixed(1)} ms (cada una incluye un fotograma de 16,7 ms)`);
const typingAfter = await read();
check("P10 cada pulsación en el chat (CPU x4, 300 mensajes) se pinta en menos de 100 ms en el percentil 95", keyP95 < 100, `p95 ${keyP95.toFixed(1)} ms`);
check("P11 ninguna tarea larga supera 300 ms al escribir en el chat", Math.max(0, ...typingAfter.longTasks) <= 300, `máx ${Math.max(0, ...typingAfter.longTasks)} ms`);
check("P12 el CLS final de todo el recorrido es menor que 0.1", typingAfter.cls < 0.1, typingAfter.cls.toFixed(3));

await browser.close();
process.exit(summary() ? 0 : 1);
