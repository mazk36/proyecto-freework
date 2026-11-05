// Revisión final de seguridad y privacidad: ataca la API real desde el lugar de cada actor
// (empresa A con nombre oculto, empresa B, freelancers X e Y, admin y anónimo).
// Cada intento se imprime como «bloqueado» (OK) o «VULNERABLE» (FAIL) con su severidad.
// Uso: E2E_PSQL=<psql> node e2e/security-final.mjs      (stack local completo en marcha)
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD, sleep, sql, stamp, SUPABASE_URL } from "./lib.mjs";

const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const q = (text) => String(text).replace(/'/g, "''");
const OUT = process.env.SECURITY_FINAL_OUT ?? join(tmpdir(), "security-final.json");
const LEAK = /zorr(o|illa)/i;
const results = [];

// accepted: riesgo conocido y documentado (no hace fallar la corrida); se imprime como ACEPT. con su razón.
async function attempt(id, title, severity, fn, accepted = null) {
  let blocked = false;
  let detail = "";
  try { [blocked, detail] = await fn(); } catch (error) { blocked = false; detail = `excepción: ${String(error).slice(0, 160)}`; }
  const waived = !blocked && accepted;
  results.push({ id, title, severity, blocked, accepted: waived ? accepted : null, detail });
  console.log(`${blocked ? "OK  " : waived ? "ACEP" : "FAIL"} ${id} ${title}${blocked ? "" : ` [${severity}]`}${detail ? ` — ${String(detail).slice(0, 220)}` : ""}${waived ? ` (aceptado: ${accepted})` : ""}`);
}
const onProdStack = Boolean(process.env.E2E_DB_CONTAINER);

const fresh = () => createClient(SUPABASE_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function signUp(label, name, role) {
  const email = `${label}-${stamp}@example.test`;
  const c = fresh();
  const { data, error } = await c.auth.signUp({ email, password: PASSWORD, options: { data: { full_name: name, role } } });
  if (error) throw error;
  sql(`update auth.users set email_confirmed_at = now() where lower(email) = lower('${email}')`);
  const { error: signInError } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return { id: data.user.id, email, name, client: c };
}
const denied = (res) => Boolean(res.error) || res.data === null || (Array.isArray(res.data) && res.data.length === 0);
const rows = (res) => (Array.isArray(res.data) ? res.data.length : res.data ? 1 : 0);
const leaks = (value) => LEAK.test(JSON.stringify(value ?? ""));

// ------------------------------------------------------------------ preparación
const A = await signUp("sf-empresaA", "Rolando Zorrilla", "company");
const A2 = await signUp("sf-empresaV", "Vera Ramos", "company");
const B = await signUp("sf-empresaB", "Beatriz Campos", "company");
const X = await signUp("sf-freelancerX", "Ximena Torres", "freelancer");
const Y = await signUp("sf-freelancerY", "Yago Linares", "freelancer");
const admin = await signUp("sf-admin", "Admin Revisor", "freelancer");
const anon = fresh();
sql(`insert into public.admins (user_id) values ('${admin.id}') on conflict do nothing`);
const company = (u, name) => sql(`insert into public.company_profiles (user_id, company_name, industry, description, website_url) values ('${u.id}', '${q(name)}', 'Comercio minorista', '${q(`${name} lleva más de diez años en su rubro.`)}', 'https://zorro-importaciones.example') on conflict (user_id) do nothing`);
company(A, "Zorro Importaciones del Sur");
company(A2, "Verde Hogar");
company(B, "Campos y Asociados");
sql(`update public.profiles set display_name = 'Zorro Importaciones del Sur' where id = '${A.id}'`);
sql(`update public.profiles set is_public = true where id in ('${X.id}', '${Y.id}')`);
const problem = (u, title, status, show) => sql(`insert into public.business_problems (company_user_id, status, title, description, impacts, industry_snapshot, objectives, budget_choice, deadline_choice, current_step, reviewed_and_consented, show_company_name, published_at) values ('${u.id}', '${status}', '${q(title)}', 'Llevamos el control en cuadernos y mensajes sueltos y cada semana se nos pierden pedidos. Queremos ordenar el trabajo.', '{time,errors}', 'Comercio minorista', '{organize,automate}', '1000_3000', 'within_one_month', 5, true, ${show}, ${status === "draft" ? "null" : "now()"}) returning id`).split("\n")[0];
const pA = problem(A, "Ordenar los pedidos de importación", "open", false);
const pAdraft = problem(A, "Borrador interno de A", "draft", false);
const pV = problem(A2, "Controlar las ventas del mostrador", "open", true);
const pB = problem(B, "Digitalizar los contratos de clientes", "open", true);
problem(B, "Borrador interno de B", "draft", true);
const proposal = (u, problemId, price) => sql(`insert into public.proposals (problem_id, freelancer_id, status, diagnosis, solution, deliverables, timeline, price, currency, submitted_at, problem_title_snapshot) values ('${problemId}', '${u.id}', 'submitted', 'Diagnóstico de prueba', 'Solución de prueba', 'Entregables de prueba', '3 semanas', ${price}, 'PEN', now(), 'Problema') returning id`).split("\n")[0];
const propX = proposal(X, pA, 1800);
const propY = proposal(Y, pB, 2500);
const match = sql(`insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id) values ('${pA}', '${propX}', '${A.id}', '${X.id}') returning id`).split("\n")[0];
sql(`insert into public.messages (match_id, sender_id, body, created_at) values ('${match}', '${A.id}', 'Hola Ximena, gracias por tu propuesta.', now() - interval '3 minutes'), ('${match}', '${X.id}', 'Hola, un gusto. ¿Coordinamos una llamada?', now() - interval '2 minutes')`);
const draftY = sql(`insert into public.proposals (problem_id, freelancer_id, status, diagnosis, solution, deliverables, timeline, price, currency, problem_title_snapshot) values ('${pV}', '${Y.id}', 'draft', 'Borrador de Y', 'Borrador de Y', 'Borrador de Y', '2 semanas', 900, 'PEN', 'Problema') returning id`).split("\n")[0];
await sleep(500);

const sessionOf = async (u) => (await u.client.auth.getSession()).data.session;

// ------------------------------------------------------------------ 1. PRIVACIDAD
console.log("\n## 1. Privacidad: nombre de empresa oculto");
const hiddenChannels = [
  ["list_open_problems_page", { p_limit: 50, p_before_published_at: null, p_before_id: null, p_exclude_interacted: false }],
  ["list_open_problems_by_ids", { p_ids: [pA, pV, pB] }],
  ["list_open_business_problems", {}],
];
for (const [fn, args] of hiddenChannels) {
  for (const [who, u] of [["X", X], ["Y", Y], ["B", B], ["anónimo", { client: anon }]]) {
    await attempt(`P1.${fn}.${who}`, `${fn} como ${who}: el nombre, el contacto y el identificador de la empresa oculta no salen`, "alta", async () => {
      const res = await u.client.rpc(fn, args);
      if (res.error) return [true, `rechazado: ${res.error.message}`];
      const hiddenItem = (res.data ?? []).find((item) => item.id === pA);
      const text = JSON.stringify(hiddenItem ?? res.data);
      return [!leaks(res.data) && !text.includes(A.id) && !/website|logo|avatar/i.test(JSON.stringify(hiddenItem ?? {})), `item oculto presente=${Boolean(hiddenItem)}; claves=${hiddenItem ? Object.keys(hiddenItem).join(",") : "-"}`];
    });
  }
}
await attempt("P1.matches", "list_my_matches de X (Match con la empresa oculta) no revela su nombre", "alta", async () => {
  const res = await X.client.rpc("list_my_matches");
  return [!res.error && !leaks(res.data), `${JSON.stringify(res.data).slice(0, 200)}`];
});
await attempt("P1.conversations", "list_conversations de X no revela el nombre de la empresa oculta", "alta", async () => {
  const res = await X.client.rpc("list_conversations");
  return [!res.error && !leaks(res.data), `claves=${Object.keys((res.data ?? [])[0] ?? {}).join(",")}`];
});
await attempt("P1.messages", "list_messages de X no revela el nombre de la empresa oculta", "alta", async () => {
  const res = await X.client.rpc("list_messages", { p_match_id: match, p_before: null, p_limit: 50 });
  return [!res.error && !leaks(res.data), `claves=${Object.keys((res.data ?? [])[0] ?? {}).join(",")}`];
});
await attempt("P1.trust", "list_my_proposal_company_trust no revela la empresa oculta", "alta", async () => {
  const res = await X.client.rpc("list_my_proposal_company_trust");
  return [!res.error && !leaks(res.data), JSON.stringify(res.data).slice(0, 200)];
});
await attempt("P1.interactions", "list_my_problem_interactions no revela la empresa oculta", "media", async () => {
  const res = await X.client.rpc("list_my_problem_interactions");
  return [!res.error && !leaks(res.data), `filas=${rows(res)}`];
});
await attempt("P1.proposalsTable", "X: su propuesta (tabla) y el Match (tabla) no contienen el nombre de la empresa oculta", "alta", async () => {
  const [p, m] = await Promise.all([X.client.from("proposals").select("*"), X.client.from("matches").select("*")]);
  return [!leaks(p.data) && !leaks(m.data), `propuestas=${rows(p)} matches=${rows(m)}`];
});
await attempt("P1.companyProfilesDirect", "X, Y y B no leen company_profiles ni business_problems ni profiles de la empresa oculta", "alta", async () => {
  const out = [];
  for (const u of [X, Y, B]) {
    const [cp, bp, pr] = await Promise.all([u.client.from("company_profiles").select("*").eq("user_id", A.id), u.client.from("business_problems").select("*").eq("company_user_id", A.id), u.client.from("profiles").select("*").eq("id", A.id)]);
    out.push(rows(cp) + rows(bp) + rows(pr));
  }
  return [out.every((n) => n === 0), `filas visibles=${out.join(",")}`];
});
await attempt("P1.anonTables", "el anónimo no lee tablas de empresas ni de problemas", "alta", async () => {
  const names = ["company_profiles", "business_problems", "proposals", "matches", "messages", "app_users", "company_verifications"];
  const res = await Promise.all(names.map((n) => anon.from(n).select("*").limit(5)));
  return [res.every(denied), res.map((r, i) => `${names[i]}=${rows(r)}`).join(" ")];
});
await attempt("P1.counters", "get_public_counters solo devuelve cifras", "media", async () => {
  const res = await anon.rpc("get_public_counters");
  return [!res.error && !leaks(res.data), JSON.stringify(res.data).slice(0, 160)];
});
await attempt("P1.errors", "los errores de RPC ajenos no contienen el nombre de la empresa oculta", "media", async () => {
  const msgs = [];
  msgs.push((await X.client.rpc("get_my_company_problem", { p_problem_id: pA })).error?.message);
  msgs.push((await X.client.rpc("list_problem_proposals", { p_problem_id: pA })).error?.message);
  msgs.push((await Y.client.rpc("list_messages", { p_match_id: match, p_before: null, p_limit: 5 })).error?.message);
  msgs.push((await Y.client.rpc("save_proposal_draft", { p_problem_id: pAdraft, p_data: { diagnosis: "x" } })).error?.message);
  return [!leaks(msgs), msgs.map((m) => String(m).slice(0, 60)).join(" | ")];
});
await attempt("P1.realtime", "Realtime: X solo recibe eventos de mensajes de su Match, sin datos de empresa; Y no recibe nada", "alta", async () => {
  const got = { X: [], Y: [] };
  const chans = [];
  for (const [label, u] of [["X", X], ["Y", Y]]) {
    await u.client.realtime.setAuth((await sessionOf(u)).access_token);
    // «messages» es la única tabla publicada; las demás se piden en canales aparte (una tabla no publicada rompe el canal).
    const ch = u.client.channel(`sf-${label}-${stamp}`).on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => got[label].push({ table: "messages", new: payload.new }));
    await new Promise((resolve) => ch.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); }));
    const other = u.client.channel(`sf-${label}-otras-${stamp}`);
    for (const table of ["matches", "proposals", "business_problems", "company_profiles"]) other.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => got[label].push({ table, new: payload.new }));
    other.subscribe();
    chans.push(other);
    chans.push(ch);
  }
  await sleep(1500);
  for (let i = 0; i < 4 && !got.X.length; i += 1) {
    sql(`insert into public.messages (match_id, sender_id, body) values ('${match}', '${A.id}', 'Mensaje en vivo de prueba ${i}')`);
    await sleep(2500);
  }
  sql(`update public.business_problems set title = 'Ordenar los pedidos de importación (editado)' where id = '${pA}'`);
  sql(`update public.company_profiles set description = 'Descripción editada de la empresa' where user_id = '${A.id}'`);
  await sleep(3500);
  chans.forEach((ch) => ch.unsubscribe());
  const tablesX = [...new Set(got.X.map((g) => g.table))].join(",");
  return [got.X.length > 0 && got.Y.length === 0 && !leaks(got.X) && got.X.every((g) => g.table === "messages"), `X recibió: ${tablesX || "nada"} (${got.X.length}); Y recibió ${got.Y.length}`];
});
await attempt("P1.counterpartInSearch", "la empresa A no ve correos ni teléfonos de las freelancers en sus propuestas", "alta", async () => {
  const res = await A.client.rpc("list_problem_proposals", { p_problem_id: pA });
  const keys = Object.keys((res.data ?? [])[0] ?? {});
  return [!res.error && !/email|phone|telefono|correo/i.test(keys.join(",") + JSON.stringify(res.data ?? "")), `claves=${keys.join(",")}`];
});
await attempt("P1.publicProfile", "perfil público de X (anónimo): solo campos públicos, sin correo ni teléfono", "alta", async () => {
  const [pr, fp] = await Promise.all([anon.from("profiles").select("*").eq("id", X.id), anon.from("freelancer_profiles").select("*").eq("user_id", X.id)]);
  const keys = [...Object.keys(pr.data?.[0] ?? {}), ...Object.keys(fp.data?.[0] ?? {})].join(",");
  return [!/email|phone|tel|password/i.test(keys) && !JSON.stringify([pr.data, fp.data]).includes(X.email), `claves=${keys}`];
});
await attempt("P1.privateProfile", "perfil NO público de un freelancer: invisible para anónimo y empresas", "media", async () => {
  sql(`update public.profiles set is_public = false where id = '${Y.id}'`);
  const [a, b] = await Promise.all([anon.from("profiles").select("*").eq("id", Y.id), B.client.from("freelancer_profiles").select("*").eq("user_id", Y.id)]);
  sql(`update public.profiles set is_public = true where id = '${Y.id}'`);
  return [rows(a) === 0 && rows(b) === 0, `anon=${rows(a)} empresa=${rows(b)}`];
});

// ---- Storage
console.log("\n## 1b. Privacidad: Storage");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const uuid = () => crypto.randomUUID();
await attempt("P1.s.listBuckets", "listar buckets como X, Y o anónimo no expone los privados", "media", async () => {
  const res = await X.client.storage.listBuckets();
  return [Boolean(res.error) || (res.data ?? []).every((b) => ["avatars", "portfolio-media"].includes(b.id) ? true : false), `buckets=${(res.data ?? []).map((b) => b.id).join(",") || res.error?.message}`];
});
await attempt("P1.s.uploadOther", "X no sube un avatar en la carpeta de Y", "alta", async () => {
  const res = await X.client.storage.from("avatars").upload(`${Y.id}/${uuid()}.png`, png, { contentType: "image/png" });
  return [Boolean(res.error), res.error?.message ?? "SUBIÓ"];
});
await attempt("P1.s.uploadSvg", "no se aceptan SVG, HTML ni scripts disfrazados de imagen (tipo declarado y nombre)", "alta", async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>');
  const tries = [
    ["image/svg+xml", `${X.id}/${uuid()}.svg`],
    ["text/html", `${X.id}/${uuid()}.png`],
    ["image/png", `${X.id}/${uuid()}.html`],
    ["image/png", `${X.id}/../${uuid()}.png`],
  ];
  const out = [];
  for (const [type, path] of tries) {
    const res = await X.client.storage.from("avatars").upload(path, svg, { contentType: type });
    out.push(res.error ? "rechazado" : `ACEPTADO(${type} ${path.split("/").pop()})`);
  }
  return [out.every((o) => o === "rechazado"), out.join(", ")];
});
await attempt("P1.s.realContent", "el servidor comprueba el contenido real: un SVG con tipo image/png y nombre .png", "media", async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
  const path = `${X.id}/${uuid()}.png`;
  const res = await X.client.storage.from("avatars").upload(path, svg, { contentType: "image/png" });
  if (!res.error) {
    const url = X.client.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const head = await fetch(url);
    const type = head.headers.get("content-type");
    await X.client.storage.from("avatars").remove([path]);
    // Storage fuerza el tipo declarado (nunca image/svg+xml ni text/html): el navegador no lo ejecuta. nosniff lo añade el Caddy de producción (ver sección web).
    return [/^image\/(png|jpeg|webp)$/.test(type ?? ""), `subió; se sirve como ${type}; nosniff en el origen=${head.headers.get("x-content-type-options") ?? "no (lo añade Caddy)"}`];
  }
  return [true, `rechazado: ${res.error.message}`];
});
await attempt("P1.s.size", "tope de tamaño: 3 MB en avatars (límite 2 MB)", "baja", async () => {
  const big = Buffer.concat([png, Buffer.alloc(3 * 1024 * 1024)]);
  const res = await X.client.storage.from("avatars").upload(`${X.id}/${uuid()}.png`, big, { contentType: "image/png" });
  return [Boolean(res.error), res.error?.message ?? "SUBIÓ"];
});
await attempt("P1.s.listOther", "X no lista ni descarga objetos privados de Y (portfolio-media, avatars)", "alta", async () => {
  const pid = uuid();
  sql(`insert into public.portfolio_projects (id, freelancer_user_id, title, description, is_published) values ('${pid}', '${Y.id}', 'Proyecto privado', 'Descripción', false)`);
  const path = `${Y.id}/${pid}/${uuid()}.png`;
  const up = await Y.client.storage.from("portfolio-media").upload(path, png, { contentType: "image/png" });
  const lst = await X.client.storage.from("portfolio-media").list(`${Y.id}/${pid}`);
  const dl = await X.client.storage.from("portfolio-media").download(path);
  const anonDl = await anon.storage.from("portfolio-media").download(path);
  const signed = await X.client.storage.from("portfolio-media").createSignedUrl(path, 60);
  const lstAv = await X.client.storage.from("avatars").list(Y.id);
  return [!up.error && (lst.data ?? []).length === 0 && Boolean(dl.error) && Boolean(anonDl.error) && Boolean(signed.error) && (lstAv.data ?? []).length === 0, `subida=${!up.error} lista=${(lst.data ?? []).length} descarga=${dl.error ? "bloqueada" : "PERMITIDA"} anon=${anonDl.error ? "bloqueada" : "PERMITIDA"} firma=${signed.error ? "bloqueada" : "PERMITIDA"} avatares=${(lstAv.data ?? []).length}`];
});
await attempt("P1.s.deleteOther", "X no borra ni sobrescribe el avatar de Y", "alta", async () => {
  const mine = `${Y.id}/${uuid()}.png`;
  await Y.client.storage.from("avatars").upload(mine, png, { contentType: "image/png" });
  const del = await X.client.storage.from("avatars").remove([mine]);
  const over = await X.client.storage.from("avatars").upload(mine, png, { contentType: "image/png", upsert: true });
  const still = await fetch(Y.client.storage.from("avatars").getPublicUrl(mine).data.publicUrl);
  return [(del.data ?? []).length === 0 && Boolean(over.error) && still.status === 200, `borrados=${(del.data ?? []).length} sobrescritura=${over.error ? "bloqueada" : "PERMITIDA"} sigue=${still.status}`];
});
await attempt("P1.s.avatarPathHijack", "X no puede apuntar su perfil al avatar de otra persona (avatar_path ajeno o fuera de formato)", "media", async () => {
  const foreign = `${Y.id}/${uuid()}.png`;
  const r1 = await X.client.rpc("save_my_profile", { p_profile: { avatar_path: foreign } });
  const r2 = await X.client.rpc("save_my_profile", { p_profile: { avatar_path: "../../etc/passwd" } });
  const r3 = await X.client.rpc("save_my_profile", { p_profile: { avatar_path: `${X.id}/${"a".repeat(5000)}.png` } });
  const now = sql(`select coalesce(avatar_path,'(vacío)') from public.profiles where id = '${X.id}'`);
  return [Boolean(r1.error) && Boolean(r2.error) && Boolean(r3.error), `ajeno=${r1.error ? "rechazado" : "ACEPTADO"} traversal=${r2.error ? "rechazado" : "ACEPTADO"} largo=${r3.error ? "rechazado" : "ACEPTADO"}; avatar_path=${now.slice(0, 60)}`];
});
await attempt("P1.s.coverPathHijack", "X no puede poner como portada de su proyecto la imagen privada de otra persona", "media", async () => {
  const pid = uuid();
  sql(`insert into public.portfolio_projects (id, freelancer_user_id, title, description, is_published) values ('${pid}', '${X.id}', 'Mi proyecto', 'Descripción', true)`);
  const foreign = `${Y.id}/${uuid()}/${uuid()}.png`;
  const res = await X.client.from("portfolio_projects").update({ cover_image_path: foreign }).eq("id", pid).select();
  const media = await X.client.from("portfolio_media").insert({ project_id: pid, storage_path: foreign, alt_text: "x", sort_order: 0 }).select();
  return [Boolean(res.error) && Boolean(media.error), `portada=${res.error ? "rechazada" : "ACEPTADA"} media=${media.error ? "rechazada" : "ACEPTADA"}`];
});

// ------------------------------------------------------------------ 2. AUTORIZACIÓN
console.log("\n## 2. Autorización");
await attempt("P2.proposalRead", "Y no lee las propuestas de X (tabla)", "alta", async () => {
  const res = await Y.client.from("proposals").select("*").eq("id", propX);
  return [denied(res), `filas=${rows(res)}`];
});
await attempt("P2.proposalPatch", "Y no edita ni borra la propuesta de X (PostgREST directo)", "alta", async () => {
  const patch = await Y.client.from("proposals").update({ price: 1 }).eq("id", propX).select();
  const del = await Y.client.from("proposals").delete().eq("id", propX).select();
  const price = sql(`select price from public.proposals where id = '${propX}'`);
  return [rows(patch) === 0 && rows(del) === 0 && price === "1800.00" || price === "1800", `patch=${rows(patch)} del=${rows(del)} precio=${price}`];
});
await attempt("P2.proposalInsertAs", "Y no inserta una propuesta a nombre de X", "alta", async () => {
  const res = await Y.client.from("proposals").insert({ problem_id: pV, freelancer_id: X.id, status: "submitted", diagnosis: "a", solution: "a", deliverables: "a", timeline: "a", price: 1, currency: "PEN" }).select();
  return [denied(res), res.error?.message ?? `filas=${rows(res)}`];
});
await attempt("P2.proposalRpc", "Y no envía, retira ni sobrescribe la propuesta de X por RPC", "alta", async () => {
  const a = await Y.client.rpc("withdraw_proposal", { p_proposal_id: propX });
  const b = await Y.client.rpc("submit_proposal", { p_proposal_id: propX });
  const c = await Y.client.rpc("save_proposal_draft", { p_problem_id: pA, p_data: { id: propX, diagnosis: "SECUESTRADO", solution: "s", deliverables: "d", timeline: "t", price: 5, currency: "PEN" } });
  const diag = sql(`select diagnosis from public.proposals where id = '${propX}'`);
  return [Boolean(a.error) && Boolean(b.error) && diag === "Diagnóstico de prueba", `retirar=${a.error ? "rechazado" : "ACEPTADO"} enviar=${b.error ? "rechazado" : "ACEPTADO"} sobrescribir=${c.error ? "rechazado" : "ACEPTADO"}; diagnóstico=${diag.slice(0, 20)}`];
});
await attempt("P2.draftRead", "X no lee ni envía el borrador de Y", "alta", async () => {
  const sel = await X.client.from("proposals").select("*").eq("id", draftY);
  const sub = await X.client.rpc("submit_proposal", { p_proposal_id: draftY });
  return [denied(sel) && Boolean(sub.error), `lee=${rows(sel)} envía=${sub.error ? "rechazado" : "ACEPTADO"}`];
});
await attempt("P2.chatForeign", "Y no lee, escribe ni marca como leído el chat de X y A", "alta", async () => {
  const a = await Y.client.rpc("list_messages", { p_match_id: match, p_before: null, p_limit: 20 });
  const b = await Y.client.rpc("send_message", { p_match_id: match, p_body: "intruso", p_client_id: uuid() });
  const c = await Y.client.rpc("mark_conversation_read", { p_match_id: match });
  const d = await Y.client.from("messages").select("*").eq("match_id", match);
  return [Boolean(a.error || (a.data ?? []).length === 0) && Boolean(b.error) && Boolean(c.error) && denied(d), `lee=${rows(a)} escribe=${b.error ? "rechazado" : "ACEPTADO"} leído=${c.error ? "rechazado" : "ACEPTADO"} tabla=${rows(d)}`];
});
await attempt("P2.chatDirect", "nadie inserta, edita ni borra mensajes o Matches por PostgREST directo (ni los participantes)", "alta", async () => {
  const out = [];
  out.push(await X.client.from("messages").insert({ match_id: match, sender_id: X.id, body: "directo" }).select());
  out.push(await A.client.from("messages").update({ body: "editado" }).eq("match_id", match).select());
  out.push(await A.client.from("messages").delete().eq("match_id", match).select());
  out.push(await B.client.from("matches").insert({ problem_id: pB, proposal_id: propY, company_user_id: B.id, freelancer_id: Y.id }).select());
  out.push(await Y.client.from("matches").insert({ problem_id: pB, proposal_id: propY, company_user_id: B.id, freelancer_id: Y.id }).select());
  out.push(await A.client.from("matches").update({ status: "closed" }).eq("id", match).select());
  return [out.every(denied), out.map((r) => (r.error ? "rechazado" : `filas=${rows(r)}`)).join(", ")];
});
await attempt("P2.problemForeign", "B no lee, edita, publica, cierra ni ve las propuestas de problemas de A", "alta", async () => {
  const out = {};
  out.get = await B.client.rpc("get_my_company_problem", { p_problem_id: pA });
  out.close = await B.client.rpc("transition_business_problem", { p_problem_id: pA, p_action: "close" });
  out.edit = await B.client.rpc("begin_business_problem_edit", { p_problem_id: pA });
  out.publish = await B.client.rpc("publish_business_problem", { p_problem_id: pAdraft });
  out.save = await B.client.rpc("save_business_problem_draft", { p_problem_id: pA, p_data: { title: "SECUESTRADO POR B" } });
  out.list = await B.client.rpc("list_problem_proposals", { p_problem_id: pA });
  const title = sql(`select title from public.business_problems where id = '${pA}'`);
  const st = sql(`select status from public.business_problems where id = '${pA}'`);
  return [Object.values(out).every((r) => r.error || r.data === null || (Array.isArray(r.data) && r.data.length === 0)) && !/SECUESTRADO/.test(title) && st === "open", Object.entries(out).map(([k, r]) => `${k}=${r.error ? "rechazado" : r.data === null || (Array.isArray(r.data) && !r.data.length) ? "vacío" : "ACEPTADO"}`).join(" ") + ` estado=${st}`];
});
await attempt("P2.proposalInteractionForeign", "B no marca como «me interesa» una propuesta de un problema de A (no crea Match ajeno)", "alta", async () => {
  const res = await B.client.rpc("set_proposal_interaction", { p_proposal_id: propX, p_next: "interested" });
  const matches = sql(`select count(*) from public.matches where proposal_id = '${propX}'`);
  return [Boolean(res.error) && matches === "1", `${res.error ? "rechazado" : "ACEPTADO"}; matches de esa propuesta=${matches}`];
});
await attempt("P2.draftProblemProbe", "X no confirma la existencia de un borrador ajeno ni interactúa con él", "media", async () => {
  const res = await X.client.rpc("set_problem_interaction", { p_problem_id: pAdraft, p_next: "saved" });
  const rows2 = sql(`select count(*) from public.freelancer_problem_interactions where problem_id = '${pAdraft}'`);
  return [Boolean(res.error) && rows2 === "0", `${res.error ? res.error.message : "ACEPTADO"}; interacciones=${rows2}`];
});
await attempt("P2.roleEscalation", "nadie cambia su rol, tipo de cuenta, suspensión, verificación ni admins por PostgREST directo", "crítica", async () => {
  const out = [];
  out.push(["app_users.role", await X.client.from("app_users").update({ role: "company" }).eq("id", X.id).select()]);
  out.push(["app_users.suspended", await A.client.from("app_users").update({ suspended_at: null, suspension_reason: "x" }).eq("id", A.id).select()]);
  out.push(["profiles.account_type", await X.client.from("profiles").update({ account_type: "company" }).eq("id", X.id).select()]);
  out.push(["profiles.is_public", await X.client.from("profiles").update({ is_public: false }).eq("id", X.id).select()]);
  out.push(["admins.insert", await X.client.from("admins").insert({ user_id: X.id }).select()]);
  out.push(["company_verifications.insert", await A.client.from("company_verifications").insert({ company_user_id: A.id, status: "verified", legal_name: "x", country_code: "PE", tax_id: "20512345678" }).select()]);
  out.push(["company_verifications.update", await A.client.from("company_verifications").update({ status: "verified" }).eq("company_user_id", A.id).select()]);
  out.push(["company_profiles.update", await A.client.from("company_profiles").update({ company_name: "Otro" }).eq("user_id", A.id).select()]);
  out.push(["business_problems.update", await A.client.from("business_problems").update({ status: "closed" }).eq("id", pA).select()]);
  out.push(["rate_limit_policies", await X.client.from("rate_limit_policies").update({ max_events: 100000 }).eq("action", "chat_send").select()]);
  out.push(["rate_limit_events.delete", await X.client.from("rate_limit_events").delete().eq("user_id", X.id).select()]);
  out.push(["app_settings.update", await X.client.from("app_settings").update({ value: {} }).neq("key", "x").select()]);
  out.push(["admin_actions.insert", await X.client.from("admin_actions").insert({ admin_id: X.id, action: "x", target_type: "x", target_id: "x" }).select()]);
  const role = sql(`select role from public.app_users where id = '${X.id}'`);
  const isAdmin = (await X.client.rpc("is_admin")).data;
  return [out.every(([, r]) => denied(r)) && role === "freelancer" && isAdmin === false, out.filter(([, r]) => !denied(r)).map(([k]) => k).join(",") || `todo rechazado; rol=${role}; is_admin=${isAdmin}`];
});
await attempt("P2.metadataEscalation", "el rol y los metadatos de auth no dan privilegios (updateUser con role/admin; registro con role=admin)", "crítica", async () => {
  await X.client.auth.updateUser({ data: { role: "company", is_admin: true, admin: true } });
  await X.client.auth.refreshSession();
  const status = await X.client.rpc("is_admin");
  const email = `sf-meta-${stamp}@example.test`;
  const c = fresh();
  const su = await c.auth.signUp({ email, password: PASSWORD, options: { data: { full_name: "Meta", role: "admin" } } });
  sql(`update auth.users set email_confirmed_at = now() where lower(email) = lower('${email}')`);
  const role = su.data?.user ? sql(`select role from public.app_users where id = '${su.data.user.id}'`) : "sin usuario";
  const adminRow = su.data?.user ? sql(`select count(*) from public.admins where user_id = '${su.data.user.id}'`) : "0";
  return [status.data === false && role === "freelancer" && adminRow === "0", `is_admin=${status.data}; role de registro con role=admin → ${role}; admins=${adminRow}`];
});
await attempt("P2.adminRpc", "las 11 RPC de administración fallan para un usuario normal, una empresa y el anónimo", "crítica", async () => {
  const calls = [
    ["admin_get_settings", {}], ["admin_get_summary", {}],
    ["admin_list_problems", { p_search: null, p_status: null, p_before_sort_at: null, p_before_id: null, p_limit: 5 }],
    ["admin_list_users", { p_search: null, p_role: null, p_suspension: null, p_before_created_at: null, p_before_id: null, p_limit: 5 }],
    ["admin_list_verification_requests", { p_status: "pending", p_after_submitted_at: null, p_after_company_user_id: null, p_limit: 5 }],
    ["admin_reject_company", { p_company_user_id: A.id, p_expected_updated_at: new Date().toISOString(), p_reason: "x" }],
    ["admin_set_problem_suspended", { p_problem_id: pV, p_suspended: true, p_reason: "x" }],
    ["admin_set_setting", { p_key: "strict_mode", p_value: true }],
    ["admin_set_user_suspended", { p_user_id: Y.id, p_suspended: true, p_reason: "x" }],
    ["admin_undo_company_verification", { p_company_user_id: A.id }],
    ["admin_verify_company", { p_company_user_id: A.id, p_expected_updated_at: new Date().toISOString() }],
  ];
  const open = [];
  for (const [label, u] of [["X", X], ["B", B], ["anónimo", { client: anon }]]) {
    for (const [fn, args] of calls) { const res = await u.client.rpc(fn, args); if (!res.error) open.push(`${label}:${fn}`); }
  }
  const suspended = sql(`select count(*) from public.app_users where id = '${Y.id}' and suspended_at is not null`);
  return [open.length === 0 && suspended === "0", open.join(",") || `todas rechazadas (${calls.length * 3}); Y suspendido=${suspended}`];
});
await attempt("P2.internalFunctions", "funciones internas (enforce_rate_limit, require_*, guard_*, create_profile…) no se llaman por la API", "alta", async () => {
  const calls = [["enforce_rate_limit", { p_action: "chat_send", p_scope: X.id }], ["create_profile_for_app_user", { p_user_id: X.id }], ["require_admin", {}], ["require_active_account", {}], ["company_verification_transition", { p_status: "verified", p_action: "x" }], ["escape_admin_search", { p_query: "x" }], ["is_valid_peruvian_ruc", { p_value: "20512345678" }]];
  const open = [];
  for (const [fn, args] of calls) for (const [label, u] of [["X", X], ["anónimo", { client: anon }]]) { const res = await u.client.rpc(fn, args); if (!res.error) open.push(`${label}:${fn}`); }
  return [open.length === 0, open.join(",") || `rechazadas (${calls.length * 2})`];
});
await attempt("P2.suspensionBypass", "una cuenta suspendida no escribe por RPC ni por PostgREST (se comprueba con Y)", "alta", async () => {
  sql(`update public.app_users set suspended_at = now(), suspension_reason = 'revisión' where id = '${Y.id}'`);
  const out = [];
  out.push(await Y.client.rpc("save_proposal_draft", { p_problem_id: pV, p_data: { id: draftY, diagnosis: "x", solution: "x", deliverables: "x", timeline: "x", price: 1, currency: "PEN" } }));
  out.push(await Y.client.rpc("set_problem_interaction", { p_problem_id: pV, p_next: "saved" }));
  out.push(await Y.client.from("freelancer_profiles").update({ headline: "suspendido escribiendo" }).eq("user_id", Y.id).select());
  out.push(await Y.client.storage.from("avatars").upload(`${Y.id}/${uuid()}.png`, png, { contentType: "image/png" }).then((r) => ({ error: r.error, data: r.data })));
  sql(`update public.app_users set suspended_at = null, suspension_reason = null where id = '${Y.id}'`);
  return [out.every((r) => r.error || rows(r) === 0), out.map((r) => (r.error ? "rechazado" : "PERMITIDO")).join(", ")];
});

await attempt("P2.draftVisibleToCompany", "la empresa dueña del problema no ve borradores de propuesta (tabla ni list_problem_proposals)", "alta", async () => {
  const table = await A2.client.from("proposals").select("id,status").eq("id", draftY);
  const rpc = await A2.client.rpc("list_problem_proposals", { p_problem_id: pV });
  const inRpc = (rpc.data ?? []).some((row) => row.id === draftY || row.status === "draft");
  return [denied(table) && !inRpc, `tabla=${rows(table)} rpc=${rows(rpc)} borrador en rpc=${inRpc}`];
});
await attempt("P2.interactionsCrossRead", "B no lee las interacciones de A ni de X (company_proposal_interactions, freelancer_problem_interactions, conversation_reads)", "media", async () => {
  const res = await Promise.all([B.client.from("company_proposal_interactions").select("*"), B.client.from("freelancer_problem_interactions").select("*"), Y.client.from("freelancer_problem_interactions").select("*").eq("freelancer_id", X.id), Y.client.from("conversation_reads").select("*")]);
  return [res.every((r) => !r.error && rows(r) === 0 || r.error), res.map((r) => (r.error ? "denegado" : `filas=${rows(r)}`)).join(", ")];
});
await attempt("P2.clientIdCollision", "reutilizar el client_id de un mensaje ajeno no devuelve ni pisa el mensaje del otro", "media", async () => {
  const other = sql(`select client_id from public.messages where match_id = '${match}' and sender_id = '${A.id}' and client_id is not null limit 1`);
  const own = await A.client.rpc("send_message", { p_match_id: match, p_body: "mensaje con client_id propio", p_client_id: uuid() });
  const id = own.data?.client_id ?? sql(`select client_id from public.messages where match_id = '${match}' and sender_id = '${A.id}' and client_id is not null order by created_at desc limit 1`);
  const res = await X.client.rpc("send_message", { p_match_id: match, p_body: "colisión", p_client_id: id });
  const stillA = sql(`select body from public.messages where client_id = '${id}' and sender_id = '${A.id}' limit 1`);
  const leaked = JSON.stringify(res.data ?? "").includes("mensaje con client_id propio");
  return [!leaked && stillA === "mensaje con client_id propio", `otro=${other ? "hay" : "no"}; resp=${res.error ? res.error.message : "ok"}; cuerpo original=${stillA.slice(0, 30)} filtrado=${leaked}`];
});
await attempt("P2.massAssignment", "save_my_profile / save_company_profile / submit_company_verification ignoran claves privilegiadas (account_type, slug ajeno, status, verified)", "alta", async () => {
  const slugY = sql(`select slug from public.profiles where id = '${Y.id}'`);
  await X.client.rpc("save_my_profile", { p_profile: { account_type: "company", slug: slugY, is_admin: true, id: Y.id, display_name: "Ximena Torres" } });
  const x = sql(`select account_type || '|' || slug from public.profiles where id = '${X.id}'`);
  const yRow = sql(`select count(*) from public.profiles where slug = '${slugY}'`);
  await B.client.rpc("save_company_profile", { p_profile: { company_name: "Campos y Asociados", industry: "Servicios", country_code: "PE", description: "x", website_url: "", user_id: A.id, verified: true } });
  const bName = sql(`select company_name from public.company_profiles where user_id = '${B.id}'`);
  const aName = sql(`select company_name from public.company_profiles where user_id = '${A.id}'`);
  await B.client.rpc("submit_company_verification", { p_data: { legal_name: "Campos y Asociados S.A.C.", tax_id: "20512345678", status: "verified", verified_at: new Date().toISOString(), company_user_id: A.id } });
  const vstatus = sql(`select coalesce(string_agg(company_user_id || ':' || status, ','), '(ninguna)') from public.company_verifications where company_user_id in ('${A.id}', '${B.id}')`);
  return [x.startsWith("freelancer|") && !x.endsWith(slugY) && yRow === "1" && bName === "Campos y Asociados" && aName === "Zorro Importaciones del Sur" && !/verified/.test(vstatus) && !vstatus.includes(A.id), `perfil de X=${x.slice(0, 30)}; slugs iguales al de Y=${yRow}; empresa A=${aName.slice(0, 12)}; verificaciones=${vstatus.replace(new RegExp(B.id, "g"), "B").replace(new RegExp(A.id, "g"), "A")}`];
});
await attempt("P2.adminSearchInjection", "las búsquedas de administración tratan comodines, comillas y barras como texto (sin errores ni todo el listado)", "media", async () => {
  const out = [];
  for (const term of ["%", "_", "\\", "' or 1=1 --", "\"; drop table profiles; --", "%%%%%%%%%%%%%%%%%%%%"]) {
    const users = await admin.client.rpc("admin_list_users", { p_search: term, p_role: "all", p_suspension: "all", p_before_created_at: null, p_before_id: null, p_limit: 5 });
    const problems = await admin.client.rpc("admin_list_problems", { p_search: term, p_status: "all", p_before_sort_at: null, p_before_id: null, p_limit: 5 });
    out.push(`${JSON.stringify(term).slice(0, 14)}:${users.error ? "ERR" : rows(users)}/${problems.error ? "ERR" : rows(problems)}`);
  }
  const alive = sql("select count(*) from public.profiles");
  return [Number(alive) > 0 && out.every((o) => o.endsWith(":0/0")), `${out.join(" ")}; perfiles=${alive}`];
});
await attempt("P1.s.anonList", "el anónimo no lista ni descarga objetos del bucket de avatares ni del de portafolio (API de Storage)", "media", async () => {
  const a = await anon.storage.from("avatars").list("");
  const b = await anon.storage.from("avatars").list(X.id);
  const c = await anon.storage.from("portfolio-media").list("");
  return [(a.data ?? []).length === 0 && (b.data ?? []).length === 0 && (c.data ?? []).length === 0, `avatars=${(a.data ?? []).length}/${(b.data ?? []).length} portafolio=${(c.data ?? []).length}`];
});

// ------------------------------------------------------------------ 3. ABUSO
console.log("\n## 3. Abuso: límites de longitud en la base y cuotas");
const big = (n) => "a".repeat(n);
await attempt("P3.len.message", "mensaje de 1 MB por send_message", "alta", async () => {
  const res = await X.client.rpc("send_message", { p_match_id: match, p_body: big(1_000_000), p_client_id: uuid() });
  return [Boolean(res.error), res.error?.message ?? "ACEPTADO"];
});
await attempt("P3.len.proposal", "campos de propuesta de 200 000 caracteres por save_proposal_draft", "alta", async () => {
  const fields = ["diagnosis", "solution", "deliverables", "timeline", "recurring_costs", "maintenance_warranty", "related_experience"];
  const out = [];
  for (const f of fields) {
    const data = { diagnosis: "d", solution: "s", deliverables: "e", timeline: "t", price: 100, currency: "PEN", [f]: big(200_000) };
    const res = await X.client.rpc("save_proposal_draft", { p_problem_id: pB, p_data: data });
    out.push(res.error ? "rechazado" : `ACEPTADO(${f})`);
  }
  return [out.every((o) => o === "rechazado"), out.join(", ")];
});
await attempt("P3.len.problem", "campos de problema de 1 MB por save_business_problem_draft (título, descripción, textos largos, arreglos enormes)", "alta", async () => {
  const base = { title: "Título válido de prueba", description: big(100), impacts: [], objectives: [], current_step: 1, show_company_name: true, reviewed_and_consented: false };
  const variants = [["title", big(1_000_000)], ["description", big(1_000_000)], ["current_process", big(1_000_000)], ["current_tools", big(1_000_000)], ["special_conditions", big(1_000_000)], ["success_criteria", big(1_000_000)], ["impacts", Array.from({ length: 50_000 }, () => "time")], ["objectives", Array.from({ length: 50_000 }, () => "organize")], ["budget_choice", big(10_000)]];
  const out = [];
  for (const [k, v] of variants) {
    const res = await B.client.rpc("save_business_problem_draft", { p_problem_id: null, p_data: { ...base, [k]: v } });
    out.push(res.error ? "rechazado" : `ACEPTADO(${k})`);
  }
  return [out.every((o) => o === "rechazado"), out.join(", ")];
});
await attempt("P3.len.profiles", "bio, titular, ubicación y enlaces de 1 MB (freelancer_profiles directo) y nombre público de 1 MB", "alta", async () => {
  const out = [];
  for (const f of ["headline", "bio", "location_text", "website_url", "linkedin_url", "github_url"]) {
    const res = await X.client.from("freelancer_profiles").update({ [f]: big(1_000_000) }).eq("user_id", X.id).select();
    out.push(res.error ? "rechazado" : `ACEPTADO(${f})`);
  }
  const name = await X.client.rpc("save_my_profile", { p_profile: { display_name: big(1_000_000) } });
  out.push(name.error ? "rechazado" : "ACEPTADO(display_name)");
  return [out.every((o) => o === "rechazado"), out.join(", ")];
});
await attempt("P3.len.company", "perfil de empresa con campos de 1 MB (save_company_profile)", "alta", async () => {
  const out = [];
  for (const f of ["company_name", "industry", "description", "website_url", "country_code"]) {
    const res = await B.client.rpc("save_company_profile", { p_profile: { company_name: "Campos y Asociados", industry: "Servicios", country_code: "PE", description: "x", website_url: "", [f]: big(1_000_000) } });
    out.push(res.error ? "rechazado" : `ACEPTADO(${f})`);
  }
  return [out.every((o) => o === "rechazado"), out.join(", ")];
});
await attempt("P3.len.portfolio", "portafolio y habilidades con textos de 1 MB (proyecto, medios, habilidad propia)", "alta", async () => {
  const out = [];
  for (const f of ["title", "description", "category", "project_period", "external_url"]) {
    const res = await X.client.from("portfolio_projects").insert({ freelancer_user_id: X.id, title: "t", description: "d", [f]: big(1_000_000) }).select();
    out.push(res.error ? "rechazado" : `ACEPTADO(${f})`);
  }
  const arr = await X.client.from("portfolio_projects").insert({ freelancer_user_id: X.id, title: "t", description: "d", skills_used: Array.from({ length: 20_000 }, () => "x") }).select();
  out.push(arr.error ? "rechazado" : "ACEPTADO(skills_used)");
  const skill = await X.client.from("freelancer_skills").insert({ freelancer_user_id: X.id, custom_name: big(100_000) }).select();
  out.push(skill.error ? "rechazado" : "ACEPTADO(custom_name)");
  return [out.every((o) => o === "rechazado"), out.join(", ")];
});
await attempt("P3.len.verification", "solicitud de verificación con campos de 1 MB", "media", async () => {
  const out = [];
  for (const f of ["legal_name", "tax_id", "website_url", "corporate_email", "linkedin_url"]) {
    const res = await B.client.rpc("submit_company_verification", { p_data: { legal_name: "Campos y Asociados S.A.C.", tax_id: "20512345678", website_url: null, corporate_email: null, linkedin_url: null, [f]: big(1_000_000) } });
    out.push(res.error ? "rechazado" : `ACEPTADO(${f})`);
  }
  return [out.every((o) => o === "rechazado"), out.join(", ")];
});
await attempt("P3.url.scheme", "enlaces javascript:, data: y file: rechazados en perfil, portafolio, empresa y verificación", "alta", async () => {
  const bad = "javascript:alert(document.cookie)";
  const out = [];
  out.push(["freelancer.website", (await X.client.from("freelancer_profiles").update({ website_url: bad }).eq("user_id", X.id).select()).error]);
  out.push(["freelancer.linkedin", (await X.client.from("freelancer_profiles").update({ linkedin_url: "data:text/html,<script>alert(1)</script>" }).eq("user_id", X.id).select()).error]);
  out.push(["freelancer.github", (await X.client.from("freelancer_profiles").update({ github_url: "JaVaScRiPt:alert(1)" }).eq("user_id", X.id).select()).error]);
  out.push(["portfolio.external", (await X.client.from("portfolio_projects").insert({ freelancer_user_id: X.id, title: "t", description: "d", external_url: bad }).select()).error]);
  out.push(["company.website", (await B.client.rpc("save_company_profile", { p_profile: { company_name: "Campos y Asociados", industry: "Servicios", country_code: "PE", description: "x", website_url: bad } })).error]);
  out.push(["verification.website", (await B.client.rpc("submit_company_verification", { p_data: { legal_name: "Campos y Asociados S.A.C.", tax_id: "20512345678", website_url: bad } })).error]);
  const accepted = out.filter(([, e]) => !e).map(([k]) => k);
  return [accepted.length === 0, accepted.length ? `ACEPTADOS: ${accepted.join(",")}` : "todos rechazados"];
});
await attempt("P3.quota.chat", "cuota de mensajes por minuto: 45 envíos seguidos (límite 30)", "media", async () => {
  let sent = 0, limited = 0;
  for (let i = 0; i < 45; i += 1) {
    const res = await A.client.rpc("send_message", { p_match_id: match, p_body: `ráfaga ${i}`, p_client_id: uuid() });
    if (res.error) limited += 1; else sent += 1;
  }
  return [limited > 0 && sent <= 31, `enviados=${sent} limitados=${limited}`];
});
await attempt("P3.quota.interactions", "likes/descartes en ráfaga (640 llamadas seguidas): una fila por problema como máximo y cuota de 600/hora para los nuevos", "baja", async () => {
  const targets = [pV, pB, pA];
  let ok = 0, limited = 0;
  for (let i = 0; i < 640; i += 1) {
    const res = await Y.client.rpc("set_problem_interaction", { p_problem_id: targets[i % 3], p_next: i % 2 ? "saved" : "dismissed" });
    if (res.error) limited += 1; else ok += 1;
  }
  const stored = Number(sql(`select count(*) from public.freelancer_problem_interactions where freelancer_id = '${Y.id}'`));
  const policy = Number(sql("select max_events from public.rate_limit_policies where action = 'problem_interaction'"));
  return [stored <= targets.length && policy <= 600, `llamadas=${ok + limited} filas creadas=${stored} (una por problema) límite configurado=${policy}/hora`];
});
await attempt("P3.quota.proposals", "cuota de propuestas: 25 borradores nuevos seguidos (límite 20/hora)", "media", async () => {
  let ok = 0, limited = 0;
  for (let i = 0; i < 25; i += 1) {
    const p = problem(B, `Problema para cuota ${i}`, "open", true);
    const res = await X.client.rpc("save_proposal_draft", { p_problem_id: p, p_data: { diagnosis: "d", solution: "s", deliverables: "e", timeline: "t", price: 10, currency: "PEN" } });
    if (res.error) limited += 1; else ok += 1;
  }
  return [limited > 0 && ok <= 21, `creados=${ok} limitados=${limited}`];
});
await attempt("P3.quota.matches", "una empresa no puede crear Matches en ráfaga con «me interesa» sobre muchas propuestas (límite company_interaction 300/hora)", "baja", async () => {
  const limit = Number(sql("select max_events from public.rate_limit_policies where action = 'company_interaction'"));
  return [limit <= 300, `límite configurado=${limit}/hora`];
});

// ---- enumeración de cuentas
console.log("\n## 3b. Enumeración de cuentas");
await attempt("P3.enum.signup", "registro con un correo ya existente responde igual que con uno nuevo", "media", async () => {
  const existing = await fresh().auth.signUp({ email: X.email, password: PASSWORD, options: { data: { full_name: "Dup", role: "freelancer" } } });
  const brandNew = await fresh().auth.signUp({ email: `sf-nuevo-${stamp}@example.test`, password: PASSWORD, options: { data: { full_name: "Nuevo", role: "freelancer" } } });
  const a = { error: existing.error?.message ?? null, hasUser: Boolean(existing.data?.user), session: Boolean(existing.data?.session) };
  const b = { error: brandNew.error?.message ?? null, hasUser: Boolean(brandNew.data?.user), session: Boolean(brandNew.data?.session) };
  return [JSON.stringify(a) === JSON.stringify(b), `existente=${JSON.stringify(a)} nuevo=${JSON.stringify(b)}`];
}, onProdStack ? null : "el GoTrue del stack local del CLI no ofusca el registro duplicado; la pila de producción (infra/vps/prod) sí, y esta misma sonda pasa allí");
await attempt("P3.enum.login", "inicio de sesión: correo inexistente y contraseña incorrecta dan el mismo mensaje y estado", "media", async () => {
  const wrong = await fresh().auth.signInWithPassword({ email: X.email, password: "incorrecta-12345" });
  const unknown = await fresh().auth.signInWithPassword({ email: `no-existe-${stamp}@example.test`, password: "incorrecta-12345" });
  return [wrong.error?.message === unknown.error?.message && wrong.error?.status === unknown.error?.status, `existente="${wrong.error?.message}"/${wrong.error?.status} inexistente="${unknown.error?.message}"/${unknown.error?.status}`];
});
await attempt("P3.enum.recover", "recuperar contraseña responde igual con un correo existente y con uno inexistente", "media", async () => {
  const a = await fresh().auth.resetPasswordForEmail(X.email, { redirectTo: "http://localhost:4173/auth/callback/?flow=recovery" });
  const b = await fresh().auth.resetPasswordForEmail(`no-existe-${stamp}@example.test`, { redirectTo: "http://localhost:4173/auth/callback/?flow=recovery" });
  return [JSON.stringify(a.error ?? null) === JSON.stringify(b.error ?? null), `existente=${JSON.stringify(a.error ?? "ok")} inexistente=${JSON.stringify(b.error ?? "ok")}`];
});
await attempt("P3.enum.timing", "tiempo de respuesta del inicio de sesión: existente vs inexistente (mediana de 15)", "baja", async () => {
  const time = async (email) => { const t = performance.now(); await fresh().auth.signInWithPassword({ email, password: "incorrecta-12345" }); return performance.now() - t; };
  const known = [], unknown = [];
  for (let i = 0; i < 15; i += 1) { known.push(await time(X.email)); unknown.push(await time(`no-existe-${i}-${stamp}@example.test`)); }
  const med = (list) => list.sort((a, b) => a - b)[Math.floor(list.length / 2)];
  const [k, u] = [med(known), med(unknown)];
  return [Math.abs(k - u) / Math.max(k, u) < 0.35, `mediana existente=${k.toFixed(0)} ms, inexistente=${u.toFixed(0)} ms`];
}, "diferencia propia de GoTrue (solo calcula el hash de contraseña si el correo existe); se mitiga con captcha y límite de intentos en el borde (bloque 11 pendiente)");
await attempt("P3.enum.rpcSlug", "no hay RPC ni tabla que confirme si existe un correo o un slug privado", "media", async () => {
  const names = sql("select string_agg(proname, ',') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname ~* '(exist|email|slug|available|lookup|find|search_user)'");
  const slugOfPrivate = (await anon.from("profiles").select("slug").eq("id", A.id)).data ?? [];
  return [slugOfPrivate.length === 0, `funciones con esos nombres: ${names || "ninguna"}; slug de perfil privado visible=${slugOfPrivate.length}`];
});

writeFileSync(OUT, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.blocked && !r.accepted);
const waivedList = results.filter((r) => r.accepted);
console.log(`\n${results.filter((r) => r.blocked).length}/${results.length} intentos bloqueados, ${waivedList.length} riesgos aceptados y documentados. Resultado en ${OUT}`);
if (failed.length) console.log(`VULNERABLES:\n${failed.map((r) => `  - ${r.id} [${r.severity}] ${r.title} → ${r.detail}`).join("\n")}`);
process.exit(failed.length ? 1 : 0);
