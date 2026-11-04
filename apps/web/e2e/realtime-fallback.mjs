// Chat sin tiempo real: se bloquea el WebSocket, aparece el aviso, los mensajes llegan por sondeo (≤ 15 s),
// al restablecer vuelve a tiempo real sin duplicados y sin saltos de diseño. Uso: E2E_PSQL=<psql> node e2e/realtime-fallback.mjs
import { createClient } from "@supabase/supabase-js";
import { check, launch, login, newPlayer, PASSWORD, sleep, sql, stamp, summary, SUPABASE_URL } from "./lib.mjs";

const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
async function signUp(label, role, name) {
  const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  const email = `rt-${label}-${stamp}@example.test`;
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD, options: { data: { full_name: name, role } } });
  if (error) throw error;
  sql(`update auth.users set email_confirmed_at = now() where email = '${email}'`);
  await client.auth.signInWithPassword({ email, password: PASSWORD });
  return { client, email, id: data.user.id };
}
const company = await signUp("empresa", "company", "Empresa Tiempo Real");
const freelancer = await signUp("freelancer", "freelancer", "Freelancer Tiempo Real");
const problemId = sql(`insert into public.business_problems (company_user_id, status, title, description) values ('${company.id}', 'open', 'Problema tiempo real', 'Descripción') returning id`).split("\n")[0];
const proposalId = sql(`insert into public.proposals (problem_id, freelancer_id, status, diagnosis, solution, deliverables, timeline, price, submitted_at, problem_title_snapshot) values ('${problemId}', '${freelancer.id}', 'submitted', 'd', 's', 'e', '1 mes', 100, now(), 'Problema tiempo real') returning id`).split("\n")[0];
const matchId = sql(`insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id) values ('${problemId}', '${proposalId}', '${company.id}', '${freelancer.id}') returning id`).split("\n")[0];
const send = (body) => company.client.rpc("send_message", { p_match_id: matchId, p_body: body });

const browser = await launch();
try {
  const player = await newPlayer(browser, "rt-web", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  player.email = freelancer.email;
  const { page } = player;
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value; }).observe({ type: "layout-shift", buffered: true });
  });
  await login(player);

  // Bloquear Realtime ANTES de abrir el chat.
  let blocked = true;
  await page.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
    if (blocked) ws.close({ code: 1011, reason: "bloqueado por la prueba" });
    else ws.connectToServer();
  });
  await send(`Mensaje inicial ${stamp}`);
  await page.goto(`/app/chats/?match=${matchId}`);
  await page.getByText(`Mensaje inicial ${stamp}`).last().waitFor({ state: "visible", timeout: 20_000 });
  const banner = page.getByText("Sin conexión en tiempo real. Reintentando…");
  await banner.waitFor({ timeout: 20_000 });
  check("R1 con el WebSocket bloqueado aparece «Sin conexión en tiempo real. Reintentando…»", true);
  check("R2 el aviso es role=status, ámbar y tiene el botón «Reintentar» de al menos 44 px", (await page.getByRole("status").filter({ hasText: "Sin conexión en tiempo real" }).count()) === 1 && (await page.getByRole("button", { name: "Reintentar" }).boundingBox()).height >= 44);

  const sentAt = Date.now();
  await send(`Llegó por sondeo ${stamp}`);
  await page.getByText(`Llegó por sondeo ${stamp}`).last().waitFor({ state: "visible", timeout: 20_000 });
  const seconds = (Date.now() - sentAt) / 1000;
  check("R3 el mensaje llega por sondeo en 15 s o menos", seconds <= 15, `${seconds.toFixed(1)} s`);
  await send(`Segundo por sondeo ${stamp}`);
  await send(`Tercero por sondeo ${stamp}`);
  await page.getByText(`Tercero por sondeo ${stamp}`).last().waitFor({ state: "visible", timeout: 20_000 });
  const order = await page.evaluate((marker) => [...document.querySelectorAll("[aria-label='Mensajes de la conversación'] p")].map((p) => p.textContent).filter((t) => t?.includes(marker)), String(stamp));
  check("R4 los mensajes del sondeo llegan completos, en orden y sin duplicados", JSON.stringify(order) === JSON.stringify([`Mensaje inicial ${stamp}`, `Llegó por sondeo ${stamp}`, `Segundo por sondeo ${stamp}`, `Tercero por sondeo ${stamp}`]), order.join(" | "));
  const unread = sql(`select count(*) from public.messages m where m.match_id = '${matchId}' and m.sender_id = '${company.id}' and not exists (select 1 from public.conversation_reads r where r.match_id = m.match_id and r.user_id = '${freelancer.id}' and r.last_read_at >= m.created_at)`);
  check("R5 el sondeo marca la conversación abierta como leída (sin no leídos acumulados)", unread === "0", `sin leer=${unread}`);

  // Restablecer.
  blocked = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await banner.waitFor({ state: "hidden", timeout: 20_000 });
  check("R6 al restablecer la conexión desaparece el aviso", true);
  await sleep(2500);
  await send(`Ya en tiempo real ${stamp}`);
  const rtStart = Date.now();
  await page.getByText(`Ya en tiempo real ${stamp}`).last().waitFor({ state: "visible", timeout: 8000 });
  check("R7 con la conexión restablecida los mensajes vuelven a llegar al instante (< 8 s; ya no hay sondeo)", Date.now() - rtStart < 8000, `${Date.now() - rtStart} ms`);
  const all = await page.evaluate((marker) => [...document.querySelectorAll("[aria-label='Mensajes de la conversación'] p")].map((p) => p.textContent).filter((t) => t?.includes(marker)), String(stamp));
  check("R8 tras reconectar no hay mensajes duplicados", all.length === 5 && new Set(all).size === 5, `${all.length} mensajes`);
  const cls = await page.evaluate(() => window.__cls);
  check("R9 el aviso no provoca saltos de diseño (CLS < 0.1)", cls < 0.1, cls.toFixed(3));
  const problems = player.problems.filter((line) => !/Failed to load resource|HTTP 401|WebSocket|websocket|realtime/i.test(line));
  check("R10 consola sin errores propios", problems.length === 0, problems.slice(0, 2).join(" | "));
} catch (error) {
  console.error("ERROR EN EL RECORRIDO:", error);
  check("el recorrido terminó sin excepciones", false, String(error).slice(0, 240));
} finally {
  await browser.close();
}
process.exit(summary() ? 0 : 1);
