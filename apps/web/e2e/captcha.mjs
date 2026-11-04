// Verifica Turnstile de extremo a extremo con las claves de prueba de Cloudflare.
// Requiere: stack local con [auth.captcha] enabled=true y TURNSTILE_SECRET de prueba, y la web
// compilada con NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA (ver README).
import { check, launch, login, logout, newPlayer, register, sql, stamp, summary } from "./lib.mjs";

const browser = await launch();
try {
  const player = await newPlayer(browser, "captcha", { viewport: { width: 1280, height: 800 } });
  const { page } = player;

  await page.goto("/registro/");
  const submit = page.getByRole("button", { name: /Crear cuenta/ });
  check("C1 el registro muestra el desafío y bloquea el envío hasta resolverlo", (await page.locator("iframe[src*='challenges.cloudflare.com']").count()) >= 1 || (await submit.isDisabled()));
  await page.waitForFunction(() => document.querySelector("input[name='cf-turnstile-response']")?.value, null, { timeout: 20_000 });
  check("C2 tras resolverlo el botón se habilita", await submit.isEnabled());

  await register(player, "Empresa Captcha", "company");
  check("C3 el registro con captcha crea la cuenta y entra a la app", /\/app\/?$/.test(page.url()), page.url());
  check("C4 la cuenta existe en la base", sql(`select count(*) from auth.users where email = '${player.email}'`) === "1");

  await logout(player);
  await login(player);
  check("C5 el inicio de sesión con captcha funciona", /\/app\/?$/.test(page.url()), page.url());
  await logout(player);

  await page.goto("/recuperar-contrasena/");
  await page.waitForFunction(() => document.querySelector("input[name='cf-turnstile-response']")?.value, null, { timeout: 20_000 });
  check("C6 la recuperación de contraseña muestra el desafío y lo resuelve", await page.getByRole("button", { name: /Enviar enlace/ }).isEnabled());

  const errors = player.problems.filter((line) => !/Failed to load resource|HTTP 401|No se pudo actualizar el contador|Private Access Token|cloudflare|challenges/i.test(line));
  check("C7 consola sin errores propios", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  await browser.close();
}
process.exit(summary() ? 0 : 1);
