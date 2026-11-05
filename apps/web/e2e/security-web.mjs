// Revisión final de seguridad, lado web: redirecciones abiertas, enlaces de correo, XSS por contenido de usuario y enlaces externos.
// Uso: E2E_PSQL=<psql> node e2e/security-web.mjs      (stack local completo y export servido en E2E_BASE_URL)
import { createClient } from "@supabase/supabase-js";
import { BASE_URL, PASSWORD, check, launch, sleep, sql, stamp, summary, SUPABASE_URL } from "./lib.mjs";

const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const MAIL = process.env.E2E_MAIL_URL ?? "http://127.0.0.1:55424";
const email = `sw-${stamp}@example.test`;
const evil = "https://evil.example";

// ---- cuenta de prueba (freelancer con perfil público cargado de contenido hostil)
const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
const { data } = await client.auth.signUp({ email, password: PASSWORD, options: { data: { full_name: `<img src=x onerror=alert(1)> Hostil`, role: "freelancer" } } });
sql(`update auth.users set email_confirmed_at = now() where lower(email) = lower('${email}')`);
await client.auth.signInWithPassword({ email, password: PASSWORD });
const id = data.user.id;
const short = `<img src=x onerror="window.__xss=1"> Hostil`;
const payload = `<script>window.__xss=1</script><img src=x onerror="window.__xss=1"><svg onload="window.__xss=1">"'\`><a href="javascript:window.__xss=1">x</a>`;
sql(`update public.profiles set is_public = true, display_name = '${short.replace(/'/g, "''")}' where id = '${id}'`);
sql(`update public.freelancer_profiles set headline = '${short.replace(/'/g, "''")}', bio = '${payload.replace(/'/g, "''")}', location_text = '${short.replace(/'/g, "''")}' where user_id = '${id}'`);
sql(`insert into public.portfolio_projects (freelancer_user_id, title, description, external_url, is_published) values ('${id}', '${short.replace(/'/g, "''")}', '${payload.replace(/'/g, "''")}', 'https://ejemplo.example/proyecto', true)`);
const slug = sql(`select slug from public.profiles where id = '${id}'`);

const browser = await launch();
const newPage = async (options = {}) => {
  const context = await browser.newContext({ baseURL: BASE_URL, locale: "es-PE", ignoreHTTPSErrors: process.env.E2E_IGNORE_HTTPS === "1", ...options });
  const page = await context.newPage();
  await page.addInitScript(() => { window.__xss = 0; window.alert = () => { window.__xss = 1; }; });
  return { context, page };
};

// 1) XSS: el perfil público, el panel propio y el chat muestran el contenido como texto
{
  const { context, page } = await newPage();
  await page.goto(`/profesionales/?slug=${slug}`);
  await sleep(2500);
  const body = await page.locator("body").innerText();
  const xss = await page.evaluate(() => window.__xss);
  const injected = await page.evaluate(() => document.querySelectorAll("main img[onerror], main svg[onload], main script, main a[href^='javascript:']").length);
  check("W1.1 perfil público: el HTML hostil se muestra como texto y no se ejecuta", xss === 0 && injected === 0 && body.includes("<script>"), `xss=${xss} nodos inyectados=${injected}`);
  await context.close();
}
{
  const { context, page } = await newPage();
  await page.goto("/iniciar-sesion/");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(PASSWORD);
  await page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await page.waitForURL(/\/app/, { timeout: 20_000 });
  await page.goto("/app/perfil/");
  await sleep(2500);
  const xss = await page.evaluate(() => window.__xss);
  const injected = await page.evaluate(() => document.querySelectorAll("main img[onerror], main svg[onload], main script, main a[href^='javascript:']").length);
  check("W1.2 perfil propio (cabecera, formulario y portafolio): el HTML hostil no se ejecuta", xss === 0 && injected === 0, `xss=${xss} nodos=${injected}`);
  const links = await page.evaluate(() => [...document.querySelectorAll("main a[target=_blank]")].map((a) => ({ href: a.href, rel: a.rel })));
  check("W1.3 enlaces externos del portafolio: target=_blank con noopener noreferrer", links.every((l) => /noopener/.test(l.rel) && /noreferrer/.test(l.rel) && /^https?:/.test(l.href)), JSON.stringify(links).slice(0, 200));
  await context.close();
}

// 2) Redirecciones abiertas con ?next= en inicio de sesión y registro, con sesión abierta
{
  const attempts = ["//evil.example", "/\\evil.example", evil, "javascript:window.__xss=1", "/app/..//evil.example", "/app@evil.example", "/app/%2e%2e//evil.example", "///evil.example", "/app\\@evil.example", "data:text/html,<script>window.__xss=1</script>"];
  const { context, page } = await newPage();
  await page.goto("/iniciar-sesion/");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(PASSWORD);
  await page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await page.waitForURL(/\/app/, { timeout: 20_000 });
  const stayed = [];
  for (const next of attempts) {
    for (const route of ["/iniciar-sesion/", "/registro/"]) {
      await page.goto(`${route}?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" }).catch(() => {});
      await sleep(1300);
      const url = new URL(page.url());
      const xss = await page.evaluate(() => window.__xss).catch(() => 0);
      stayed.push({ next, route, local: url.origin === new URL(BASE_URL).origin && !url.pathname.startsWith("//"), xss });
    }
  }
  const bad = stayed.filter((s) => !s.local || s.xss);
  check("W2.1 open redirect: ningún ?next= saca al usuario del sitio ni ejecuta código", bad.length === 0, bad.length ? JSON.stringify(bad).slice(0, 220) : `${stayed.length} intentos, todos en el mismo origen`);
  await context.close();
}

// 3) Correos: redirect_to ajeno en recuperación y confirmación no llega al enlace del correo
{
  const probe = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  await probe.auth.resetPasswordForEmail(email, { redirectTo: `${evil}/auth/callback/?flow=recovery` });
  await sleep(2500);
  const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
  const message = (list.messages ?? [])[0];
  let links = [];
  if (message) {
    const full = await (await fetch(`${MAIL}/api/v1/message/${message.ID}`)).json();
    links = [...`${full.HTML ?? ""} ${full.Text ?? ""}`.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((m) => m[0]);
  }
  check("W3.1 el enlace del correo de recuperación no apunta a un dominio ajeno aunque se pida redirect_to ajeno", Boolean(message) && links.length > 0 && links.every((l) => !l.includes("evil.example")), `enlaces=${links.map((l) => l.slice(0, 90)).join(" | ")}`);
  // token_hash: un valor inventado no inicia sesión ni redirige
  const { context, page } = await newPage();
  await page.goto(`/auth/callback/?flow=recovery&token_hash=${"a".repeat(40)}&type=recovery`);
  await sleep(2500);
  const url = new URL(page.url());
  const text = await page.locator("main").innerText();
  check("W3.2 token_hash inventado: no hay sesión, no redirige fuera y muestra el error", url.origin === new URL(BASE_URL).origin && /enlace|expir|vuelve|solicit/i.test(text), `url=${url.pathname} texto=${text.replace(/\n+/g, " ").slice(0, 100)}`);
  const hijack = await page.evaluate(() => Object.keys(localStorage).filter((k) => /auth-token/.test(k)).length);
  check("W3.3 token_hash inventado no deja sesión en el navegador", hijack === 0, `claves de sesión=${hijack}`);
  await context.close();
  // type inesperado
  const { context: c2, page: p2 } = await newPage();
  await p2.goto(`/auth/callback/?flow=signup&token_hash=${"b".repeat(40)}&type=magiclink`);
  await sleep(2000);
  check("W3.4 type distinto de signup/recovery no se acepta", new URL(p2.url()).origin === new URL(BASE_URL).origin && (await p2.evaluate(() => Object.keys(localStorage).filter((k) => /auth-token/.test(k)).length)) === 0, p2.url().slice(0, 100));
  await c2.close();
}

// 4) Parámetros y rutas: el visor de perfiles público no ejecuta slugs con HTML ni consulta con comodines
{
  const { context, page } = await newPage();
  for (const slugParam of ['"><script>window.__xss=1</script>', "%", "*", "' or 1=1 --", "../../etc/passwd"]) {
    await page.goto(`/profesionales/?slug=${encodeURIComponent(slugParam)}`);
    await sleep(1500);
    const xss = await page.evaluate(() => window.__xss);
    const text = await page.locator("main").innerText().catch(() => "");
    check(`W4 slug hostil ${JSON.stringify(slugParam).slice(0, 30)}: sin ejecución y sin perfiles ajenos`, xss === 0 && !text.includes("Hostil"), `xss=${xss}`);
  }
  await context.close();
}

await browser.close();
process.exit(summary() ? 0 : 1);
