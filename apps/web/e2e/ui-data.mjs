// Personas y datos de ejemplo para las pruebas de interfaz (ui-matrix.mjs y a11y.mjs).
// Crea (una vez por ejecución) empresas y freelancers con y sin datos, un admin, y guarda su sesión de navegador.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { BASE_URL, PASSWORD, sleep, sql, stamp, SUPABASE_URL } from "./lib.mjs";

const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const DIR = process.env.UI_DATA_DIR ?? join(tmpdir(), "matchwork-ui-data");
const FILE = join(DIR, "personas.json");
const q = (text) => String(text).replace(/'/g, "''");

async function signUp(email, name, role) {
  const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD, options: { data: { full_name: name, role } } });
  if (error) throw error;
  sql(`update auth.users set email_confirmed_at = now() where lower(email) = lower('${email}')`);
  return { id: data.user.id, email, name, role };
}

export async function ensurePersonas(browser) {
  mkdirSync(DIR, { recursive: true });
  if (existsSync(FILE) && !process.env.UI_DATA_FRESH) return JSON.parse(readFileSync(FILE, "utf8"));

  const tag = `ui${stamp}`;
  const p = {
    companyRich: await signUp(`${tag}-empresa-rica@example.test`, "Rosa Quispe", "company"),
    companyEmpty: await signUp(`${tag}-empresa-vacia@example.test`, "Luis Paredes", "company"),
    freelancerRich: await signUp(`${tag}-freelancer-rica@example.test`, "Camila Rojas", "freelancer"),
    freelancerEmpty: await signUp(`${tag}-freelancer-vacia@example.test`, "Iván Soto", "freelancer"),
    freelancerTwo: await signUp(`${tag}-freelancer-dos@example.test`, "Diego Salazar", "freelancer"),
    admin: await signUp(`${tag}-admin@example.test`, "Admin Matchwork", "freelancer"),
    otherCompany: await signUp(`${tag}-empresa-otra@example.test`, "Ana Ferreyra", "company"),
  };
  const profileSql = (user, name, industry) => sql(`insert into public.company_profiles (user_id, company_name, industry, description) values ('${user.id}', '${q(name)}', '${q(industry)}', 'Empresa de ejemplo con más de diez años en su rubro.') on conflict (user_id) do nothing`);
  profileSql(p.companyRich, "Panadería Los Andes", "Alimentos y bebidas");
  profileSql(p.companyEmpty, "Estudio Contable Paredes", "Servicios");
  profileSql(p.otherCompany, "Ferretería Santa Rosa", "Comercio minorista");
  sql(`update public.profiles set is_public = true where id in ('${p.freelancerRich.id}', '${p.freelancerTwo.id}')`);
  sql(`update public.freelancer_profiles set headline = 'Diseñadora de servicios digitales', bio = 'Ayudo a negocios pequeños a ordenar sus procesos con herramientas simples.', years_experience = 6, location_text = 'Lima, Perú' where user_id = '${p.freelancerRich.id}'`);
  sql(`update public.freelancer_profiles set headline = 'Desarrollador de aplicaciones para pymes' where user_id = '${p.freelancerTwo.id}'`);
  sql(`insert into public.admins (user_id) values ('${p.admin.id}') on conflict do nothing`);

  const problem = (company, title, status, minutes) => sql(`insert into public.business_problems (company_user_id, status, title, description, impacts, industry_snapshot, objectives, budget_choice, deadline_choice, current_step, reviewed_and_consented, show_company_name, published_at) values ('${company.id}', '${status}', '${q(title)}', 'Llevamos el control en cuadernos y mensajes sueltos, y cada semana se nos pierden pedidos. Queremos un sistema simple para ordenar el trabajo.', '{time,errors}', 'Servicios', '{organize,automate}', '1000_3000', 'within_one_month', 5, true, true, ${status === "draft" ? "null" : `now() - interval '${minutes} minutes'`}) returning id`).split("\n")[0];
  p.problemId = problem(p.companyRich, "Controlar el inventario de insumos y mermas", "open", 5);
  problem(p.companyRich, "Digitalizar los pedidos por encargo", "paused", 60);
  problem(p.companyRich, "Borrador sin terminar", "draft", 0);
  const others = [
    problem(p.otherCompany, "Organizar el inventario de más de 2,000 productos", "open", 20),
    problem(p.otherCompany, "Responder los pedidos de WhatsApp sin perder ninguno", "open", 30),
    problem(p.otherCompany, "Cuadrar las rutas de reparto de la semana", "open", 40),
  ];
  const proposal = (freelancer, problemId, price, currency) => sql(`insert into public.proposals (problem_id, freelancer_id, status, diagnosis, solution, deliverables, timeline, price, currency, submitted_at, problem_title_snapshot) values ('${problemId}', '${freelancer.id}', 'submitted', 'El stock vive en la memoria del equipo.', 'Un tablero simple con alertas.', 'Tablero, formulario y guía de uso.', '3 semanas', ${price}, '${currency}', now(), 'Problema') returning id`).split("\n")[0];
  const proposalCamila = proposal(p.freelancerRich, p.problemId, 1800, "PEN");
  proposal(p.freelancerTwo, p.problemId, 3200, "USD");
  p.matchId = sql(`insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id) values ('${p.problemId}', '${proposalCamila}', '${p.companyRich.id}', '${p.freelancerRich.id}') returning id`).split("\n")[0];
  sql(`insert into public.messages (match_id, sender_id, body, created_at) select '${p.matchId}', case when g % 2 = 0 then '${p.companyRich.id}'::uuid else '${p.freelancerRich.id}'::uuid end, 'Mensaje ' || g || ': seguimos coordinando el alcance, los plazos y los entregables del proyecto.', now() - ((20 - g) || ' minutes')::interval from generate_series(1, 12) g`);
  sql(`insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state) values ('${p.freelancerRich.id}', '${others[0]}', 'saved'), ('${p.freelancerRich.id}', '${others[1]}', 'dismissed')`);
  sql(`update public.business_problems set status = 'closed' where status = 'open' and id not in ('${p.problemId}', '${others.join("', '")}')`);
  p.slug = sql(`select slug from public.profiles where id = '${p.freelancerRich.id}'`);

  // Sesión de navegador de cada persona (una sola vez).
  for (const key of ["companyRich", "companyEmpty", "freelancerRich", "freelancerEmpty", "admin"]) {
    const context = await browser.newContext({ baseURL: BASE_URL, locale: "es-PE", ignoreHTTPSErrors: process.env.E2E_IGNORE_HTTPS === "1", viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto("/iniciar-sesion/");
    await page.locator("#login-email").fill(p[key].email);
    await page.locator("#login-password").fill(PASSWORD);
    await page.getByRole("button", { name: /Iniciar sesión/ }).click();
    await page.waitForURL(/\/app\/?/, { timeout: 30_000 });
    await sleep(800);
    const state = join(DIR, `${key}.json`);
    await context.storageState({ path: state });
    p[key].state = state;
    await context.close();
  }
  writeFileSync(FILE, JSON.stringify(p));
  return p;
}

/** Persona a usar para cada rol de una ruta: lista de [clave, etiqueta]. */
export function personasForRoles(roles) {
  const map = {
    company: [["companyRich", "empresa con datos"], ["companyEmpty", "empresa nueva"]],
    freelancer: [["freelancerRich", "freelancer con datos"], ["freelancerEmpty", "freelancer nuevo"]],
    admin: [["admin", "admin"]],
  };
  return roles.flatMap((role) => map[role] ?? []);
}

export function resolvePath(path, p) {
  return path.replace("{problemId}", p.problemId).replace("{matchId}", p.matchId).replace("{slug}", p.slug);
}
