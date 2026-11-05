// Datos de demostración para la vista previa local (puerto 3100): cuentas fijas y contenido creíble en español y soles.
// Deja el producto listo para recorrerlo a mano: propuestas por comparar, problemas por descubrir, un Match con chat y
// una verificación pendiente para el admin. Pensado para una base recién reseteada:
//   MATCHWORK_STACK_FULL=1 bash supabase/scripts/local-stack.sh reset   (y esperar ~30 s)
//   E2E_PSQL=<psql> node e2e/seed-preview.mjs
import { createClient } from "@supabase/supabase-js";
import { sleep, sql, SUPABASE_URL } from "./lib.mjs";

export const DEMO_PASSWORD = "Matchwork-demo-2026";
const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const q = (text) => String(text).replace(/'/g, "''");

async function account(email, name, role) {
  const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({ email, password: DEMO_PASSWORD, options: { data: { full_name: name, role } } });
  if (error) throw error;
  sql(`update auth.users set email_confirmed_at = now() where lower(email) = lower('${email}')`);
  return { id: data.user.id, email, name };
}

const company = (user, name, industry, description) => sql(`insert into public.company_profiles (user_id, company_name, industry, description) values ('${user.id}', '${q(name)}', '${q(industry)}', '${q(description)}') on conflict (user_id) do nothing`);
const problem = (user, industry, [title, description, impacts, objectives, budget, deadline, showName = true]) => sql(`insert into public.business_problems (company_user_id, status, title, description, impacts, industry_snapshot, objectives, budget_choice, deadline_choice, current_step, reviewed_and_consented, show_company_name, published_at) values ('${user.id}', 'open', '${q(title)}', '${q(description)}', '${impacts}', '${q(industry)}', '${objectives}', '${budget}', '${deadline}', 5, true, ${showName}, now() - interval '${Math.floor(Math.random() * 40) + 5} minutes') returning id`).split("\n")[0];
const proposal = (freelancer, problemId, p) => sql(`insert into public.proposals (problem_id, freelancer_id, status, diagnosis, solution, deliverables, timeline, price, currency, submitted_at, problem_title_snapshot) values ('${problemId}', '${freelancer.id}', 'submitted', '${q(p.diagnosis)}', '${q(p.solution)}', '${q(p.deliverables)}', '${q(p.timeline)}', ${p.price}, '${p.currency}', now() - interval '${p.minutes} minutes', '${q(p.title)}') returning id`).split("\n")[0];

// ---------- empresas ----------
const rosa = await account("rosa@example.test", "Rosa Quispe", "company");
company(rosa, "Panadería Los Andes", "Alimentos y bebidas", "Panadería artesanal con tres locales en Arequipa y pedidos por encargo para matrimonios y cumpleaños.");
sql(`insert into public.company_verifications (company_user_id, status, legal_name, country_code, tax_id, website_url, verified_at) values ('${rosa.id}', 'verified', 'Panadería Los Andes S.A.C.', 'PE', '20512345678', 'https://panaderialosandes.example', now())`);

const ferreteria = await account("ferreteria@example.test", "Julio Ferreyra", "company");
company(ferreteria, "Ferretería Santa Rosa", "Comercio minorista", "Ferretería familiar con más de 15 años en Miraflores y venta por mayor a constructores.");
const clinica = await account("clinica@example.test", "Dra. Patricia Núñez", "company");
company(clinica, "Clínica Dental Sonrisa Andina", "Salud", "Consultorio dental con cuatro especialistas y atención de lunes a sábado.");
sql(`insert into public.company_verifications (company_user_id, status, legal_name, country_code, tax_id, website_url) values ('${clinica.id}', 'pending', 'Sonrisa Andina E.I.R.L.', 'PE', '20498765432', 'https://sonrisaandina.example')`);
const transportes = await account("transportes@example.test", "Marco Villanueva", "company");
company(transportes, "Transportes Pacífico", "Logística", "Reparto de paquetería en Lima y Callao con 12 camionetas propias.");

const problems = {
  inventario: problem(rosa, "Alimentos y bebidas", ["Controlar el inventario de insumos y las mermas", "Compramos harina, mantequilla y huevos para tres locales y no sabemos cuánto se gasta ni cuánto se pierde. Queremos un control simple de entradas, salidas y mermas por local.", "{time,errors,financial}", "{organize,reduce_errors}", "1000_3000", "within_one_month"]),
  encargos: problem(rosa, "Alimentos y bebidas", ["Ordenar los pedidos por encargo de tortas", "Los pedidos de tortas llegan por WhatsApp, llamadas y en el local, y a veces se cruzan las fechas de entrega. Buscamos un calendario compartido con el detalle de cada pedido.", "{customers,errors}", "{organize,customer_service}", "under_1000", "under_two_weeks"]),
  stock: problem(ferreteria, "Comercio minorista", ["Organizar el inventario de más de 2,000 productos", "Llevamos el stock en cuadernos y hojas de cálculo. Cada semana descubrimos faltantes o sobrantes y perdemos ventas. Queremos saber qué hay, qué falta y cuándo reponer.", "{time,errors,financial}", "{organize,reduce_errors}", "1000_3000", "within_one_month"]),
  whatsapp: problem(ferreteria, "Comercio minorista", ["Responder los pedidos de WhatsApp sin perder ninguno", "Recibimos pedidos por WhatsApp a toda hora y varios se pierden entre mensajes. Necesitamos ordenarlos, asignarlos y avisar al cliente cuando estén listos.", "{customers,time}", "{customer_service,automate}", "under_1000", "under_two_weeks"]),
  citas: problem(clinica, "Salud", ["Reducir las citas perdidas con recordatorios automáticos", "Cerca de 1 de cada 5 pacientes no llega a su cita y el consultorio queda vacío. Queremos recordatorios por mensaje y una forma fácil de reprogramar.", "{financial,time}", "{automate,customer_service}", "1000_3000", "within_one_month", false]),
  historias: problem(clinica, "Salud", ["Digitalizar las historias clínicas en papel", "Tenemos 8 años de historias clínicas en folders. Buscamos una forma segura de digitalizarlas y consultarlas rápido desde recepción.", "{time,repetitive}", "{organize,save_time}", "3000_5000", "one_to_three_months", false]),
  seguimiento: problem(transportes, "Logística", ["Saber dónde está cada entrega sin llamar al conductor", "Los clientes preguntan todo el día por su pedido y tenemos que llamar a cada conductor. Queremos un seguimiento sencillo de entregas con avisos automáticos.", "{customers,time,repetitive}", "{customer_service,automate}", "3000_5000", "one_to_three_months"]),
  rutas: problem(transportes, "Logística", ["Cuadrar las rutas de reparto de la semana", "Armamos las rutas a mano cada domingo y casi siempre hay cruces y kilómetros de más. Buscamos ayuda para planificarlas mejor.", "{time,financial}", "{save_time,organize}", "1000_3000", "flexible"]),
};

// ---------- freelancers ----------
const camila = await account("camila@example.test", "Camila Rojas", "freelancer");
sql(`update public.profiles set is_public = true where id = '${camila.id}'`);
sql(`update public.freelancer_profiles set headline = 'Diseñadora de servicios digitales', bio = 'Ayudo a negocios pequeños a ordenar sus procesos con herramientas simples: hojas conectadas, formularios y paneles. Trabajo con comercio, salud y alimentos.', years_experience = 6, location_text = 'Lima, Perú', availability_status = 'available' where user_id = '${camila.id}'`);
const diego = await account("diego@example.test", "Diego Salazar", "freelancer");
sql(`update public.profiles set is_public = true where id = '${diego.id}'`);
sql(`update public.freelancer_profiles set headline = 'Desarrollador de aplicaciones para pymes', bio = 'Construyo sistemas de inventario, pedidos y reservas a medida, con entrega por etapas y capacitación al equipo.', years_experience = 8, location_text = 'Cusco, Perú' where user_id = '${diego.id}'`);
await account("sofia@example.test", "Sofía Medina", "freelancer"); // cuenta nueva, sin perfil completo
for (const [user, skills] of [[camila, ["Procesos y flujos de trabajo", "Hojas de cálculo", "Atención al cliente"]], [diego, ["Aplicaciones web", "Bases de datos", "Automatización"]]]) {
  for (const skill of skills) sql(`insert into public.freelancer_skills (freelancer_user_id, custom_name) values ('${user.id}', '${q(skill)}')`);
}

// ---------- propuestas (la bandeja de Rosa queda lista para comparar y hacer Match) ----------
proposal(camila, problems.inventario, { title: "Controlar el inventario de insumos y las mermas", diagnosis: "El stock de cada local vive en la memoria del equipo y en cuadernos distintos; por eso no se detectan las mermas a tiempo.", solution: "Un tablero compartido con entradas, salidas y mermas por local, con alertas cuando un insumo baja del mínimo y un resumen semanal.", deliverables: "Tablero de inventario, formulario para registrar movimientos, guía de uso y una sesión de capacitación.", timeline: "3 semanas", price: 1800, currency: "PEN", minutes: 90 });
proposal(diego, problems.inventario, { title: "Controlar el inventario de insumos y las mermas", diagnosis: "Hay tres locales con compras separadas, así que nadie ve el consumo total ni compara mermas entre locales.", solution: "Una aplicación web sencilla para registrar compras y consumo, con reportes de mermas por local y exportación a Excel.", deliverables: "Aplicación web, panel de reportes, manual de uso y un mes de soporte.", timeline: "5 semanas", price: 3200, currency: "USD", minutes: 60 });
const propuestaMatch = proposal(diego, problems.stock, { title: "Organizar el inventario de más de 2,000 productos", diagnosis: "El catálogo no tiene códigos únicos y el stock se actualiza a mano al cierre del día.", solution: "Un catálogo con códigos, lectura por código de barras desde el celular y alertas de reposición.", deliverables: "Catálogo, app de conteo, alertas y capacitación.", timeline: "4 semanas", price: 2400, currency: "PEN", minutes: 200 });
const match = sql(`insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id) values ('${problems.stock}', '${propuestaMatch}', '${ferreteria.id}', '${diego.id}') returning id`).split("\n")[0];
const chat = [
  [ferreteria, "Hola Diego, nos gustó tu propuesta. ¿Cómo lo harías para los productos que no tienen código?"],
  [diego, "Hola Julio, gracias. Los primeros días generamos códigos propios y los imprimimos en etiquetas; el conteo inicial lo hacemos juntos."],
  [ferreteria, "Perfecto. ¿Cuántas personas del equipo necesitarían usar la app?"],
  [diego, "Con 2 o 3 personas en el almacén es suficiente para empezar. Puedo mostrarte un avance en una videollamada corta esta semana."],
  [ferreteria, "Me parece bien. ¿Te viene bien el jueves por la tarde?"],
];
for (const [index, [sender, body]] of chat.entries()) sql(`insert into public.messages (match_id, sender_id, body, created_at) values ('${match}', '${sender.id}', '${q(body)}', now() - interval '${(chat.length - index) * 7} minutes')`);

// ---------- Camila: algunos problemas ya vistos para que Likes tenga contenido ----------
sql(`insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state) values ('${camila.id}', '${problems.rutas}', 'saved'), ('${camila.id}', '${problems.whatsapp}', 'dismissed'), ('${camila.id}', '${problems.inventario}', 'proposal_submitted'), ('${diego.id}', '${problems.inventario}', 'proposal_submitted'), ('${diego.id}', '${problems.stock}', 'proposal_submitted')`);

// ---------- admin ----------
const admin = await account("admin@example.test", "Admin MatchWork", "freelancer");
sql(`insert into public.admins (user_id) values ('${admin.id}') on conflict do nothing`);

// Solo quedan abiertos los problemas de la demostración (si la base tenía otros).
await sleep(300);
console.log("Datos de demostración listos. Contraseña de todas las cuentas:", DEMO_PASSWORD);
