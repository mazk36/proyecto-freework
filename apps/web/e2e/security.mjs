// Pruebas de seguridad contra el stack local real (PostgREST, RPC y Realtime).
// Crea 4 usuarios (empresa A y B, freelancer A y C ajeno) con datos propios y ataca como el cliente.
// Uso: E2E_PSQL=/opt/homebrew/opt/libpq/bin/psql node e2e/security.mjs
import { createClient } from "@supabase/supabase-js";
import { check, DB_URL, PASSWORD, sql, SUPABASE_URL, summary, sleep, stamp } from "./lib.mjs";

const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const newClient = () => createClient(SUPABASE_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function user(label, role) {
  const client = newClient();
  const email = `sec-${label}-${stamp}@example.test`;
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD, options: { data: { full_name: `Seg ${label}`, role } } });
  if (error) throw error;
  return { client, email, id: data.user.id };
}

const anon = newClient();
const companyA = await user("empresaA", "company");
const companyB = await user("empresaB", "company");
const freelancerA = await user("freelancerA", "freelancer");
const outsider = await user("ajeno", "freelancer");

// Datos de partida (como superusuario): problema abierto de la empresa A, propuesta de freelancer A y Match.
const problemId = sql(`insert into public.business_problems (company_user_id, status, title, description) values ('${companyA.id}', 'open', 'Problema seguridad ${stamp}', 'Descripción') returning id`).split("\n")[0];
const proposalId = sql(`insert into public.proposals (problem_id, freelancer_id, status, diagnosis, solution, deliverables, timeline, price, submitted_at, problem_title_snapshot) values ('${problemId}', '${freelancerA.id}', 'submitted', 'd', 's', 'e', '1 mes', 100, now(), 'Problema seguridad ${stamp}') returning id`).split("\n")[0];
const matchId = sql(`insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id) values ('${problemId}', '${proposalId}', '${companyA.id}', '${freelancerA.id}') returning id`).split("\n")[0];
sql(`insert into public.messages (match_id, sender_id, body) values ('${matchId}', '${companyA.id}', 'mensaje privado ${stamp}')`);

const denied = (res) => Boolean(res.error) || (Array.isArray(res.data) && res.data.length === 0);

// ---------- 1) anon: solo contadores públicos ----------
const anonRpcs = ["list_open_business_problems", "list_conversations", "list_messages", "send_message", "is_admin", "admin_list_users", "get_my_account_status", "unread_total", "list_my_matches"];
let anonLeaks = [];
for (const name of anonRpcs) {
  const res = await anon.rpc(name, {});
  if (!res.error || !/permission denied|not authenticated|could not find/i.test(res.error.message)) anonLeaks.push(`${name}: ${res.error?.message ?? "OK"}`);
}
check("S1.1 anon no puede ejecutar RPC privadas", anonLeaks.length === 0, anonLeaks.join("; "));
const counters = await anon.rpc("get_public_counters");
check("S1.2 get_public_counters responde solo contadores sin datos personales", !counters.error && Object.keys(counters.data?.[0] ?? counters.data ?? {}).every((key) => /^(open_problems|companies_published|freelancers_active|proposals_submitted)$/.test(key)), JSON.stringify(counters.data));
for (const table of ["business_problems", "proposals", "matches", "messages", "app_users", "company_profiles", "admins", "company_verifications", "rate_limit_events"]) {
  const res = await anon.from(table).select("*").limit(1);
  check(`S1.3 anon no lee ${table}`, denied(res), res.error?.message ?? `filas=${res.data?.length}`);
}

// ---------- 2) escritura directa por PostgREST ----------
await companyA.client.auth.signInWithPassword({ email: companyA.email, password: PASSWORD });
await companyB.client.auth.signInWithPassword({ email: companyB.email, password: PASSWORD });
await freelancerA.client.auth.signInWithPassword({ email: freelancerA.email, password: PASSWORD });
await outsider.client.auth.signInWithPassword({ email: outsider.email, password: PASSWORD });

const direct = [
  ["business_problems insert", () => companyA.client.from("business_problems").insert({ company_user_id: companyA.id, status: "open", title: "x" })],
  ["business_problems update", () => companyA.client.from("business_problems").update({ title: "hackeado" }).eq("id", problemId).select()],
  ["proposals insert", () => outsider.client.from("proposals").insert({ problem_id: problemId, freelancer_id: outsider.id, diagnosis: "d", solution: "s", deliverables: "e", timeline: "t", problem_title_snapshot: "x" })],
  ["proposals update (su propia propuesta)", () => freelancerA.client.from("proposals").update({ status: "submitted", price: 1 }).eq("id", proposalId).select()],
  ["matches insert", () => outsider.client.from("matches").insert({ problem_id: problemId, proposal_id: proposalId, company_user_id: companyA.id, freelancer_id: outsider.id })],
  ["messages insert (participante)", () => freelancerA.client.from("messages").insert({ match_id: matchId, sender_id: freelancerA.id, body: "directo" })],
  ["messages insert (suplantando a otro)", () => freelancerA.client.from("messages").insert({ match_id: matchId, sender_id: companyA.id, body: "suplanto" })],
  ["messages insert (ajeno)", () => outsider.client.from("messages").insert({ match_id: matchId, sender_id: outsider.id, body: "intruso" })],
  ["messages update", () => companyA.client.from("messages").update({ body: "editado" }).eq("match_id", matchId).select()],
  ["messages delete", () => companyA.client.from("messages").delete().eq("match_id", matchId).select()],
  ["app_users update role", () => outsider.client.from("app_users").update({ role: "company" }).eq("id", outsider.id).select()],
  ["app_users update suspended_at", () => outsider.client.from("app_users").update({ suspended_at: null }).eq("id", outsider.id).select()],
  ["admins insert", () => outsider.client.from("admins").insert({ user_id: outsider.id })],
  ["company_verifications update", () => companyA.client.from("company_verifications").update({ status: "verified" }).eq("company_user_id", companyA.id).select()],
  ["app_settings update", () => companyA.client.from("app_settings").update({ value: "true" }).neq("key", "").select()],
  ["rate_limit_policies update", () => companyA.client.from("rate_limit_policies").update({ max_events: 100000 }).neq("action", "").select()],
  ["conversation_reads insert", () => outsider.client.from("conversation_reads").insert({ match_id: matchId, user_id: outsider.id })],
  ["freelancer_problem_interactions insert", () => outsider.client.from("freelancer_problem_interactions").insert({ problem_id: problemId, freelancer_id: outsider.id, state: "saved" })],
  ["company_proposal_interactions insert", () => companyB.client.from("company_proposal_interactions").insert({ proposal_id: proposalId, company_user_id: companyB.id, state: "saved" })],
];
for (const [name, run] of direct) {
  const res = await run();
  const wrote = !res.error && (res.data === null || (Array.isArray(res.data) && res.data.length > 0));
  check(`S2 escritura directa rechazada: ${name}`, !wrote, res.error?.message ?? `filas afectadas=${res.data?.length ?? 0}`);
}
check("S2 el mensaje no fue alterado ni borrado", sql(`select count(*) from public.messages where match_id = '${matchId}' and body = 'mensaje privado ${stamp}'`) === "1" && sql(`select count(*) from public.messages where match_id = '${matchId}'`) === "1");

// Escrituras directas permitidas (perfil): ¿hay tope de filas o cuota?
let inserted = 0;
let firstError = "";
for (let i = 0; i < 120; i += 1) {
  const res = await outsider.client.from("portfolio_projects").insert({ freelancer_user_id: outsider.id, title: `Proyecto ${i}` });
  if (res.error) { firstError = res.error.message; break; }
  inserted += 1;
}
check("S2.b hay tope de proyectos de portafolio por usuario (≤ 50)", inserted <= 50, `insertados=${inserted}${firstError ? `, error=${firstError}` : ""}`);
let skills = 0;
for (let i = 0; i < 150; i += 1) {
  const res = await outsider.client.from("freelancer_skills").insert({ freelancer_user_id: outsider.id, custom_name: `Habilidad ${i}` });
  if (res.error) break;
  skills += 1;
}
check("S2.c hay tope de habilidades por freelancer (≤ 50)", skills <= 50, `insertadas=${skills}`);

// ---------- 3) lectura entre cuentas y chat ----------
const foreignMessages = await outsider.client.from("messages").select("*").eq("match_id", matchId);
check("S3.1 un tercero no lee mensajes de un Match ajeno (tabla)", denied(foreignMessages), `filas=${foreignMessages.data?.length}`);
const foreignRpc = await outsider.client.rpc("list_messages", { p_match_id: matchId });
check("S3.2 un tercero no lee mensajes de un Match ajeno (RPC)", Boolean(foreignRpc.error) || !(foreignRpc.data?.length), foreignRpc.error?.message ?? `filas=${foreignRpc.data?.length}`);
const foreignSend = await outsider.client.rpc("send_message", { p_match_id: matchId, p_body: "intruso" });
check("S3.3 un tercero no escribe en un Match ajeno (RPC)", Boolean(foreignSend.error), foreignSend.error?.message ?? "ENVIADO");
const otherCompanySend = await companyB.client.rpc("send_message", { p_match_id: matchId, p_body: "otra empresa" });
check("S3.4 otra empresa no escribe en el Match", Boolean(otherCompanySend.error), otherCompanySend.error?.message ?? "ENVIADO");
const mark = await outsider.client.rpc("mark_conversation_read", { p_match_id: matchId });
check("S3.5 un tercero no marca como leída una conversación ajena", Boolean(mark.error), mark.error?.message ?? "OK");

// Realtime: el ajeno suscrito a messages no debe recibir el mensaje; el participante sí.
const received = { outsider: 0, freelancer: 0 };
const subscribe = (who, client) => new Promise((resolve) => {
  const channel = client.channel(`sec-${who}-${stamp}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => { received[who] += 1; }).subscribe((status) => { if (status === "SUBSCRIBED") resolve(channel); });
});
await outsider.client.realtime.setAuth((await outsider.client.auth.getSession()).data.session.access_token);
await freelancerA.client.realtime.setAuth((await freelancerA.client.auth.getSession()).data.session.access_token);
const channels = [await subscribe("outsider", outsider.client), await subscribe("freelancer", freelancerA.client)];
await sleep(1500);
const sent = await companyA.client.rpc("send_message", { p_match_id: matchId, p_body: `realtime ${stamp}` });
await sleep(3000);
check("S3.6 el participante recibe el evento Realtime", !sent.error && received.freelancer === 1, `recibidos=${received.freelancer}, error=${sent.error?.message ?? ""}`);
check("S3.7 un tercero NO recibe eventos Realtime de ese Match", received.outsider === 0, `recibidos=${received.outsider}`);
for (const channel of channels) await channel.unsubscribe();

// ---------- 4) privacidad: datos que ve cada rol ----------
const proposalsAsFreelancer = await freelancerA.client.rpc("list_my_proposal_company_trust", {});
const trustKeys = JSON.stringify(proposalsAsFreelancer.data ?? []);
check("S7.1 el freelancer no recibe datos fiscales de la empresa (RUC, razón social, correo)", !/tax_id|ruc|legal_name|razon|email/i.test(trustKeys), trustKeys.slice(0, 120));
const feed = await freelancerA.client.rpc("list_open_business_problems", {});
const feedText = JSON.stringify(feed.data ?? []);
check("S7.2 el feed del freelancer no expone el identificador de la empresa ni datos fiscales", !/company_user_id|tax_id|ruc|legal_name|email/i.test(feedText), feedText.slice(0, 120));
const profileAsCompany = await companyA.client.from("app_users").select("*");
check("S7.3 una empresa solo lee su propia fila de app_users", (profileAsCompany.data ?? []).every((row) => row.id === companyA.id), `filas=${profileAsCompany.data?.length}`);
const freelancerPrivate = await companyA.client.from("freelancer_profiles").select("*").eq("user_id", outsider.id);
check("S7.4 una empresa no lee el perfil de un freelancer no público", denied(freelancerPrivate), `filas=${freelancerPrivate.data?.length}`);

// ---------- 5) cuenta suspendida con sesión abierta ----------
sql(`update public.app_users set suspended_at = now(), suspension_reason = 'prueba' where id = '${freelancerA.id}'`);
const suspendedWrites = [
  ["perfil", () => freelancerA.client.from("freelancer_profiles").update({ headline: "hola" }).eq("user_id", freelancerA.id).select()],
  ["portafolio", () => freelancerA.client.from("portfolio_projects").insert({ freelancer_user_id: freelancerA.id, title: "suspendido" })],
  ["mensaje (RPC)", () => freelancerA.client.rpc("send_message", { p_match_id: matchId, p_body: "suspendido" })],
  ["interacción (RPC)", () => freelancerA.client.rpc("set_problem_interaction", { p_problem_id: problemId, p_next: "saved" })],
];
for (const [name, run] of suspendedWrites) {
  const res = await run();
  const wrote = !res.error && (res.data === null || (Array.isArray(res.data) ? res.data.length > 0 : true));
  check(`S5 cuenta suspendida no puede escribir: ${name}`, !wrote, res.error?.message ?? "ESCRIBIÓ");
}
const status = await freelancerA.client.rpc("get_my_account_status");
check("S5.5 la cuenta suspendida puede consultar su estado (para mostrar el aviso)", !status.error && (status.data?.[0]?.suspended ?? status.data?.suspended) === true, JSON.stringify(status.data));
sql(`update public.app_users set suspended_at = null, suspension_reason = null where id = '${freelancerA.id}'`);

console.log(`\nCreados: ${DB_URL.replace(/:[^:@]*@/, ":***@")} · problema ${problemId}`);
process.exit(summary() ? 0 : 1);
