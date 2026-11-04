// El mazo carga por páginas de 40: con 95 problemas abiertos se recorren todos sin duplicados ni saltos.
// Uso: E2E_PSQL=<psql> node e2e/paging.mjs
import { createClient } from "@supabase/supabase-js";
import { check, launch, login, newPlayer, PASSWORD, sleep, sql, stamp, summary, SUPABASE_URL } from "./lib.mjs";

const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const company = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
const free = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
const tag = `pag${stamp}`;
const co = await company.auth.signUp({ email: `${tag}-empresa@example.test`, password: PASSWORD, options: { data: { full_name: "Empresa Paginas", role: "company" } } });
const fl = await free.auth.signUp({ email: `${tag}-freelancer@example.test`, password: PASSWORD, options: { data: { full_name: "Freelancer Paginas", role: "freelancer" } } });
sql(`update auth.users set email_confirmed_at = now() where email like '${tag}-%'`);
sql(`insert into public.company_profiles (user_id, company_name, industry) values ('${co.data.user.id}', 'Empresa Paginas', 'Servicios')`);
// Se retiran del feed los problemas de otras pruebas para contar exacto.
sql(`update public.business_problems set status = 'closed' where status = 'open' and title not like '${tag}%'`);
sql(`insert into public.business_problems (company_user_id, status, title, description, published_at, show_company_name) select '${co.data.user.id}', 'open', '${tag} número ' || lpad(g::text, 3, '0'), 'Descripción', now() - (g * interval '1 minute'), true from generate_series(1, 95) g`);

const browser = await launch();
try {
  const player = await newPlayer(browser, "paginas", { viewport: { width: 1280, height: 900 } });
  player.email = `${tag}-freelancer@example.test`;
  const { page } = player;
  await login(player);
  await page.goto("/app/descubrir/");
  const card = page.locator("article[aria-label^='Problema:']").first();
  await card.waitFor({ timeout: 30_000 });
  const tutorial = page.getByRole("button", { name: "Cerrar tutorial" });
  if (await tutorial.count()) await tutorial.click();
  const titles = [];
  for (let i = 0; i < 95; i += 1) {
    const label = await card.getAttribute("aria-label");
    titles.push(label);
    await page.keyboard.press("ArrowLeft");
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const next = await card.getAttribute("aria-label").catch(() => "(vacío)");
      if (next !== label) break;
      await sleep(50);
    }
  }
  const unique = new Set(titles);
  check("PG1 se recorren las 95 tarjetas en orden, sin duplicados (3 páginas de 40)", unique.size === 95 && titles[0].includes("número 001") && titles[94].includes("número 095"), `únicas=${unique.size}`);
  check("PG2 cada decisión quedó guardada", sql(`select count(*) from public.freelancer_problem_interactions where freelancer_id = '${fl.data.user.id}' and state = 'dismissed'`) === "95");
  await sleep(1500);
  check("PG3 al terminar aparece «Ya viste todo por ahora»", (await page.getByText("Ya viste todo por ahora").count()) === 1);
  const payload = await page.evaluate(async () => performance.getEntriesByType("resource").filter((entry) => /list_open_problems_page/.test(entry.name)).map((entry) => Math.round(entry.transferSize)));
  check("PG4 se hicieron 3 o 4 peticiones paginadas (no una con todo el catálogo)", payload.length >= 3 && payload.length <= 5, JSON.stringify(payload));
} finally {
  await browser.close();
}
process.exit(summary() ? 0 : 1);
