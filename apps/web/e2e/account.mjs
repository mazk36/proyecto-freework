// Cambio de contraseña con sesión abierta, a 390 px, con Mailpit (código de reautenticación).
// Requiere el stack completo (MATCHWORK_STACK_FULL=1). Uso: E2E_PSQL=<psql> node e2e/account.mjs
import { auditScreen } from "./a11y-lib.mjs";
import { check, launch, logout, newPlayer, register, sleep, sql, summary } from "./lib.mjs";

const MAIL = process.env.E2E_MAIL_URL ?? "http://127.0.0.1:55424";
const NEW = "Otra-clave-segura-2027";
const NEWER = "Tercera-clave-segura-2028";
const browser = await launch();
let debugPage = null;
try {
  const user = await newPlayer(browser, "cuenta-pass", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await register(user, "Marta Cuenta", "freelancer");
  const { page } = user;
  debugPage = page;
  await page.goto("/app/perfil/");
  const section = page.getByRole("region", { name: "Contraseña" });
  await section.waitFor({ timeout: 20_000 });
  check("A1 el perfil de freelancer tiene la sección «Contraseña»", true);
  await section.scrollIntoViewIfNeeded();
  const fill = async (password, confirmation) => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await section.getByLabel("Nueva contraseña").fill(password);
    await section.getByLabel("Confirmar contraseña").fill(confirmation);
    await section.getByLabel("Confirmar contraseña").press("Enter");
  };

  await fill("corta", "corta");
  check("A2 menos de 10 caracteres: mensaje amable en línea", (await section.getByRole("alert").filter({ hasText: "al menos 10 caracteres" }).count()) === 1);
  await fill(NEW, "no-coincide-abcdefg");
  check("A3 confirmación distinta: «Las contraseñas no coinciden.»", (await section.getByRole("alert").filter({ hasText: "no coinciden" }).count()) === 1);
  const toggle = section.getByRole("button", { name: "Mostrar contraseña" }).first();
  await toggle.click();
  check("A5 el ojo muestra la contraseña (tipo text) y mide al menos 44 px", (await section.getByLabel("Nueva contraseña").getAttribute("type")) === "text" && (await toggle.boundingBox()).height >= 44);
  await toggle.click();

  // GoTrue exige un código del correo para cambiar la contraseña (secure_password_change).
  const latestCode = async (count) => {
    const start = Date.now();
    while (Date.now() - start < 20_000) {
      const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${user.email} subject:"código de seguridad"`)}`)).json();
      if ((list.messages?.length ?? 0) >= count) {
        const newest = [...list.messages].sort((x, y) => new Date(y.Created) - new Date(x.Created))[0];
        return /\b(\d{6})\b/.exec((await (await fetch(`${MAIL}/api/v1/message/${newest.ID}`)).json()).HTML)?.[1] ?? null;
      }
      await sleep(500);
    }
    return null;
  };
  // Enviar con Enter desde el último campo (en 390 px el botón puede quedar bajo la barra fija durante la animación de scroll).
  const submit = async () => {
    const code = section.getByLabel("Código del correo");
    await ((await code.count()) ? code : section.getByLabel("Confirmar contraseña")).press("Enter");
  };

  await fill(NEW, NEW);
  await page.getByText("Contraseña actualizada").first().waitFor({ timeout: 15_000 });
  check("A6 con inicio de sesión reciente la contraseña se actualiza directamente («Contraseña actualizada»)", (await section.getByLabel("Nueva contraseña").inputValue()) === "");
  // Sesión de más de 24 h: GoTrue exige un código enviado al correo.
  sql(`update auth.sessions set created_at = now() - interval '2 days', refreshed_at = now() - interval '2 days' where user_id = (select id from auth.users where email = '${user.email}')`);
  sql(`update auth.users set last_sign_in_at = now() - interval '2 days' where email = '${user.email}'`);
  await page.reload();
  await page.getByText("Visibilidad del perfil").waitFor({ timeout: 20_000 });
  await section.waitFor();
  await fill(NEWER, NEWER);
  await section.getByLabel("Código del correo").waitFor({ timeout: 15_000 });
  check("A6b al actualizar con sesión antigua se pide un código del correo con una guía clara", (await section.getByText(/te enviamos un código a tu correo/).count()) === 1);
  const code = await latestCode(1);
  check("A7 el correo con el código llega en español", Boolean(code), String(code));
  await auditScreen(user, "Perfil con sección Contraseña y código (390 px)", { widths: [360, 390, 768], axeWidths: [390] });
  await section.getByLabel("Código del correo").fill("000000");
  await submit();
  await section.getByRole("alert").first().waitFor({ timeout: 10_000 });
  check("A8 un código incorrecto da un mensaje amable", /código/.test(await section.getByRole("alert").first().innerText()), await section.getByRole("alert").first().innerText());
  const code2 = (await latestCode(1)) ?? code;
  await section.getByLabel("Código del correo").fill(code2);
  await submit();
  await page.getByText("Contraseña actualizada").first().waitFor({ timeout: 15_000 });
  check("A9 con el código correcto la contraseña se actualiza y sale «Contraseña actualizada»", true);
  check("A10 tras actualizar el formulario queda vacío y sin el campo de código", (await section.getByLabel("Nueva contraseña").inputValue()) === "" && (await section.getByLabel("Código del correo").count()) === 0);


  await logout(user);
  const relogin = await newPlayer(browser, "cuenta-pass-2", { viewport: { width: 390, height: 844 } });
  relogin.email = user.email;
  await relogin.page.goto("/iniciar-sesion/");
  await relogin.page.locator("#login-email").fill(user.email);
  await relogin.page.locator("#login-password").fill(NEW);
  await relogin.page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await relogin.page.getByText("El correo o la contraseña no son correctos.").waitFor({ timeout: 10_000 });
  await relogin.page.locator("#login-password").fill(NEWER);
  await relogin.page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await relogin.page.waitForURL(/\/app\/?$/, { timeout: 20_000 });
  check("A11 la contraseña anterior deja de servir y la nueva inicia sesión", true);

  // Perfil de empresa: también tiene la sección.
  const company = await newPlayer(browser, "cuenta-pass-empresa", { viewport: { width: 390, height: 844 } });
  await register(company, "Empresa Cuenta", "company");
  await company.page.goto("/app/perfil/");
  await company.page.getByRole("region", { name: "Contraseña" }).waitFor({ timeout: 20_000 });
  check("A12 el perfil de empresa también tiene la sección «Contraseña»", true);
  const problems = [user, relogin, company].flatMap((p) => p.problems).filter((line) => !/Failed to load resource|HTTP 401|HTTP 4\d\d|No se pudo actualizar el contador|status of 4\d\d/.test(line));
  check("A13 consola sin errores propios", problems.length === 0, problems.slice(0, 2).join(" | "));
} catch (error) {
  console.error("ERROR EN EL RECORRIDO:", error);
  if (process.env.E2E_DEBUG_SHOT) await debugPage?.screenshot({ path: process.env.E2E_DEBUG_SHOT });
  check("el recorrido terminó sin excepciones", false, String(error).slice(0, 240));
} finally {
  await browser.close();
}
process.exit(summary() ? 0 : 1);
