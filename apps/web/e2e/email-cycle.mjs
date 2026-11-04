// Ciclo de correo completo (confirmación y recuperación) con Mailpit y la confirmación de correo ACTIVA.
// Requiere: MATCHWORK_STACK_FULL=1 bash supabase/scripts/local-stack.sh start  y la web compilada sin captcha.
// Uso: E2E_PSQL=<psql> node e2e/email-cycle.mjs
import { auditScreen, notes } from "./a11y-lib.mjs";
import { check, launch, newPlayer, PASSWORD, sleep, sql, stamp, summary } from "./lib.mjs";

const MAIL = process.env.E2E_MAIL_URL ?? "http://127.0.0.1:55424";
const NEW_PASSWORD = "Nueva-clave-segura-2026";
const MOBILE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

async function messagesFor(to) {
  const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)).json();
  return (list.messages ?? []).sort((a, b) => new Date(b.Created) - new Date(a.Created));
}
async function waitMessages(to, count, timeout = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await messagesFor(to);
    if (found.length >= count) return found;
    await sleep(400);
  }
  return messagesFor(to);
}
async function detail(id) { return (await fetch(`${MAIL}/api/v1/message/${id}`)).json(); }
function linkIn(message) {
  const match = /href="([^"]*token_hash[^"]*)"/.exec(message.HTML ?? "");
  return match ? match[1].replace(/&amp;/g, "&") : null;
}

async function registerUi(player, name, role = "freelancer", email = player.email) {
  const { page } = player;
  await page.goto("/registro/");
  await page.locator("#name").fill(name);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#confirmation").fill(PASSWORD);
  await page.getByRole("radio", { name: role === "company" ? /Empresa/ : /Freelancer/ }).check({ force: true });
  await page.getByRole("button", { name: /Crear cuenta/ }).click();
  await page.waitForURL(/revisa-tu-correo/, { timeout: 20_000 }).catch(async (error) => {
    const shown = await page.getByRole("alert").allTextContents();
    throw new Error(`${error.message.split("\n")[0]} · alertas: ${shown.join(" | ")} · url: ${page.url()}`);
  });
}

const browser = await launch();
const players = [];
const fresh = async (label, options = MOBILE) => { const player = await newPlayer(browser, label, options); players.push(player); return player; };

try {
  // ---------- 1) Registro con confirmación: pantalla «Revisa tu correo» ----------
  const ana = await fresh("ciclo-ana");
  await registerUi(ana, "Ana Ciclo");
  const { page } = ana;
  check("E1.1 tras registrarse se abre la pantalla «Revisa tu correo»", /\/registro\/revisa-tu-correo\/?$/.test(page.url()));
  check("E1.2 el correo NO está en la URL", !page.url().includes("@") && !page.url().includes("ana"), page.url());
  await page.getByRole("heading", { name: "Revisa tu correo" }).waitFor();
  check("E1.3 el foco queda en el título", (await page.evaluate(() => document.activeElement?.textContent)) === "Revisa tu correo");
  check("E1.4 muestra el correo escrito y la ayuda de spam", (await page.getByText(ana.email).count()) === 1 && (await page.getByText(/spam o correo no deseado/).count()) === 1);
  check("E1.5 el texto exacto de la especificación está presente", (await page.getByText(/Te enviamos un enlace de confirmación a/).count()) === 1 && (await page.getByText("¿Ya confirmaste? Inicia sesión").count()) === 1 && (await page.getByText("Usar otro correo").count()) === 1);
  const countdown = page.getByRole("button", { name: /Reenviar en \d:\d\d/ });
  check("E1.6 el reenvío arranca deshabilitado con cuenta atrás «Reenviar en m:ss»", (await countdown.count()) === 1 && (await countdown.isDisabled()));
  await page.reload();
  await page.getByRole("button", { name: /Reenviar en \d:\d\d/ }).waitFor();
  check("E1.7 la cuenta atrás sobrevive a recargar la página", (await page.getByText(ana.email).count()) === 1);
  const box = await page.getByRole("button", { name: /Reenviar/ }).boundingBox();
  check("E1.8 el botón de reenvío mide al menos 44 px y ocupa el ancho", box.height >= 44 && box.width > 300, `${Math.round(box.width)}x${Math.round(box.height)}`);
  await auditScreen(ana, "Revisa tu correo (390 px)", { widths: [360, 390, 768, 1280], axeWidths: [390, 1280] });

  // ---------- 2) Correo en español y enlace con token_hash ----------
  const first = (await waitMessages(ana.email, 1))[0];
  const firstMail = await detail(first.ID);
  check("E2.1 el asunto del correo está en español", firstMail.Subject === "Confirma tu cuenta en Matchwork", firstMail.Subject);
  check("E2.2 el HTML tiene botón, enlace de respaldo y aviso de «ignora este correo»", /Confirmar mi cuenta/.test(firstMail.HTML) && /Si el botón no funciona/.test(firstMail.HTML) && /ignora este correo/.test(firstMail.HTML));
  check("E2.3 el correo no carga imágenes remotas ni seguimiento", !/<img|http:\/\/[^"]*track|pixel/i.test(firstMail.HTML));
  const firstLink = linkIn(firstMail);
  check("E2.4 el enlace usa token_hash y type=signup (no un code ligado al navegador)", /token_hash=/.test(firstLink ?? "") && /type=signup/.test(firstLink ?? ""), String(firstLink).slice(0, 110));

  // ---------- 3) Reenvío: el enlace anterior queda inválido ----------
  await page.evaluate(() => { for (const key of Object.keys(sessionStorage)) if (key.startsWith("matchwork-resend-until")) sessionStorage.setItem(key, String(Date.now() - 1000)); });
  await page.reload();
  const resend = page.getByRole("button", { name: "Reenviar correo" });
  await resend.waitFor();
  await resend.click();
  await page.getByText(/muchos intentos|Te enviamos otro correo/).first().waitFor({ timeout: 15_000 });
  const throttled = await page.getByText(/Hiciste muchos intentos/).count();
  check("E3.1 reenviar antes de que GoTrue lo permita muestra el mensaje amable de límite", throttled === 1, throttled ? "" : "no hubo límite");
  check("E3.2 tras el límite vuelve la cuenta atrás (no se puede insistir)", (await page.getByRole("button", { name: /Reenviar en \d:\d\d/ }).count()) === 1);
  // GoTrue exige 60 s entre envíos por usuario: se adelanta la hora del último envío para probar el reenvío exitoso.
  sql(`update auth.users set confirmation_sent_at = now() - interval '2 minutes' where email = '${ana.email}'`);
  await page.evaluate(() => { for (const key of Object.keys(sessionStorage)) if (key.startsWith("matchwork-resend-until")) sessionStorage.setItem(key, String(Date.now() - 1000)); });
  await page.reload();
  await page.getByRole("button", { name: "Reenviar correo" }).click();
  await page.getByText("Te enviamos otro correo.").waitFor({ timeout: 15_000 });
  const second = await waitMessages(ana.email, 2);
  check("E3.3 el reenvío envía un segundo correo", second.length === 2, `correos=${second.length}`);
  const secondLink = linkIn(await detail(second[0].ID));

  const reused = (await fresh("ciclo-viejo")).page;
  await reused.goto(firstLink);
  await reused.getByRole("heading", { name: "Este enlace ya no es válido" }).waitFor({ timeout: 20_000 });
  check("E3.4 el enlace del primer correo queda inválido y la pantalla ofrece reenviar", (await reused.getByRole("button", { name: /Reenviar/ }).count()) === 1 && (await reused.getByRole("link", { name: "Iniciar sesión" }).count()) === 1);
  check("E3.5 la pantalla de enlace inválido lleva el foco al título", (await reused.evaluate(() => document.activeElement?.textContent)) === "Este enlace ya no es válido");

  // ---------- 4) Confirmar desde OTRO navegador (sin el almacenamiento de origen) ----------
  const other = await fresh("ciclo-otro-dispositivo", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await other.page.goto(secondLink);
  await other.page.getByRole("heading", { name: "¡Cuenta confirmada!" }).waitFor({ timeout: 20_000 });
  check("E4.1 el enlace confirma la cuenta en otro navegador con «¡Cuenta confirmada!»", (await other.page.getByText("Ya puedes completar tu perfil.").count()) === 1 && sql(`select count(*) from auth.users where email = '${ana.email}' and email_confirmed_at is not null`) === "1");
  check("E4.2 el token_hash se quita de la URL tras usarlo", !/token_hash/.test(other.page.url()), other.page.url());
  await auditScreen(other, "Cuenta confirmada (390 px)", { widths: [360, 390], axeWidths: [390] });
  await other.page.waitForURL(/\/app\/?$/, { timeout: 10_000 });
  check("E4.3 a los 2 s avanza sola a la app con la sesión iniciada", /\/app/.test(other.page.url()));

  const third = await fresh("ciclo-tercero");
  await third.page.goto(secondLink);
  await third.page.getByRole("heading", { name: "Este enlace ya no es válido" }).waitFor({ timeout: 20_000 });
  check("E4.4 un enlace ya usado muestra «Este enlace ya no es válido» con campo de correo", (await third.page.getByLabel("Correo electrónico").count()) === 1);
  await auditScreen(third, "Enlace ya no es válido (390 px)", { widths: [360, 390], axeWidths: [390] });
  await third.page.getByLabel("Correo electrónico").fill("ana@");

  // La pestaña original (esperando) avanza sola cuando la cuenta se confirma desde otro lugar del MISMO navegador.
  const sameBrowser = await fresh("ciclo-mismo-navegador");
  await registerUi(sameBrowser, "Bruno Ciclo");
  const brunoLink = linkIn(await detail((await waitMessages(sameBrowser.email, 1))[0].ID));
  const tab = await sameBrowser.context.newPage();
  await tab.goto(brunoLink);
  await tab.getByRole("heading", { name: "¡Cuenta confirmada!" }).waitFor({ timeout: 20_000 });
  await sameBrowser.page.waitForURL(/\/app\/?$/, { timeout: 15_000 }).catch(() => {});
  check("E4.5 la pestaña «Revisa tu correo» avanza sola cuando se confirma en otra pestaña del mismo navegador", /\/app/.test(sameBrowser.page.url()), sameBrowser.page.url());

  // ---------- 5) Iniciar sesión sin confirmar ----------
  const carla = await fresh("ciclo-carla");
  await registerUi(carla, "Carla Ciclo");
  await carla.page.goto("/iniciar-sesion/");
  await carla.page.locator("#login-email").fill(carla.email);
  await carla.page.locator("#login-password").fill(PASSWORD);
  await carla.page.getByRole("button", { name: /Iniciar sesión/ }).click();
  const alert = carla.page.getByRole("alert").filter({ hasText: "Aún no confirmaste tu correo" });
  await alert.waitFor({ timeout: 10_000 });
  check("E5.1 login sin confirmar muestra el aviso (sin navegar) con reenvío", /iniciar-sesion/.test(carla.page.url()) && (await alert.getByRole("button", { name: /Reenviar/ }).count()) === 1);
  const wrong = await fresh("ciclo-credenciales");
  await wrong.page.goto("/iniciar-sesion/");
  await wrong.page.locator("#login-email").fill(`no-existe-${stamp}@example.test`);
  await wrong.page.locator("#login-password").fill("cualquier-cosa-larga");
  await wrong.page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await wrong.page.getByText("El correo o la contraseña no son correctos.").waitFor({ timeout: 10_000 });
  check("E5.2 las credenciales incorrectas siguen siendo un mensaje genérico", (await wrong.page.getByText(/Aún no confirmaste/).count()) === 0);
  check("E5.3 sin NEXT_PUBLIC_GOOGLE_AUTH_ENABLED no hay botón de Google ni «No configurado»", (await wrong.page.getByText(/Google|No configurado/).count()) === 0);
  await auditScreen(carla, "Iniciar sesión sin confirmar (390 px)", { widths: [360, 390], axeWidths: [390] });

  // ---------- 6) Correo ya registrado: misma pantalla ----------
  const dup = await fresh("ciclo-repetido");
  await registerUi(dup, "Otra Persona", "freelancer", ana.email);
  check("E6.1 registrar un correo que ya existe muestra la misma pantalla «Revisa tu correo»", (await dup.page.getByRole("heading", { name: "Revisa tu correo" }).count()) === 1 && !dup.page.url().includes("@"));

  // ---------- 7) Recuperación completa ----------
  const rec = await fresh("ciclo-recuperacion", MOBILE);
  await rec.page.goto("/recuperar-contrasena/");
  await rec.page.locator("#recovery-email").fill(ana.email);
  await rec.page.getByRole("button", { name: /Enviar enlace/ }).click();
  await rec.page.getByRole("heading", { name: "Revisa tu correo" }).waitFor({ timeout: 15_000 });
  check("E7.1 tras pedir la recuperación sale el mensaje neutro", (await rec.page.getByText("Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva.").count()) === 1);
  check("E7.2 incluye reenvío con cuenta atrás y vuelta al inicio de sesión", (await rec.page.getByRole("button", { name: /Reenviar en \d:\d\d/ }).count()) === 1 && (await rec.page.getByRole("link", { name: /Volver al inicio de sesión/ }).count()) === 1);
  const recMail = (await waitMessages(ana.email, 3))[0];
  const recDetail = await detail(recMail.ID);
  check("E7.3 el correo de recuperación está en español", recDetail.Subject === "Crea una contraseña nueva en Matchwork", recDetail.Subject);
  const recLink = linkIn(recDetail);
  check("E7.4 el enlace de recuperación usa token_hash y type=recovery", /type=recovery/.test(recLink ?? "") && /token_hash=/.test(recLink ?? ""));
  await auditScreen(rec, "Recuperación enviada (390 px)", { widths: [360, 390], axeWidths: [390] });

  const unknown = await fresh("ciclo-recuperacion-desconocido");
  await unknown.page.goto("/recuperar-contrasena/");
  await unknown.page.locator("#recovery-email").fill(`nadie-${stamp}@example.test`);
  await unknown.page.getByRole("button", { name: /Enviar enlace/ }).click();
  await unknown.page.getByRole("heading", { name: "Revisa tu correo" }).waitFor({ timeout: 15_000 });
  check("E7.5 un correo inexistente recibe exactamente el mismo mensaje (no revela cuentas)", (await unknown.page.getByText("Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva.").count()) === 1);

  const recOther = await fresh("ciclo-recuperacion-otro-dispositivo");
  await recOther.page.goto(recLink);
  await recOther.page.getByRole("heading", { name: "Crea una contraseña nueva" }).waitFor({ timeout: 20_000 });
  check("E7.6 el enlace de recuperación abre desde otro navegador la pantalla de contraseña nueva", true);
  await recOther.page.locator("#new-password").fill("corta");
  await recOther.page.locator("#confirm-new-password").fill("corta");
  await recOther.page.getByRole("button", { name: "Actualizar contraseña" }).click();
  check("E7.7 una contraseña de menos de 10 caracteres se rechaza con mensaje", (await recOther.page.getByRole("alert").filter({ hasText: "al menos 10 caracteres" }).count()) === 1);
  await recOther.page.locator("#new-password").fill(NEW_PASSWORD);
  await recOther.page.locator("#confirm-new-password").fill(NEW_PASSWORD);
  await recOther.page.getByRole("button", { name: "Actualizar contraseña" }).click();
  await recOther.page.waitForURL(/\/app\/?$/, { timeout: 20_000 });
  check("E7.8 la nueva contraseña se guarda y deja la sesión iniciada", /\/app/.test(recOther.page.url()));

  const recAgain = await fresh("ciclo-recuperacion-reuso");
  await recAgain.page.goto(recLink);
  await recAgain.page.getByRole("heading", { name: "Este enlace de recuperación ya no es válido" }).waitFor({ timeout: 20_000 });
  check("E7.9 el enlace de recuperación ya usado muestra «Pedir otro enlace»", (await recAgain.page.getByRole("link", { name: "Pedir otro enlace" }).count()) === 1);

  const relogin = await fresh("ciclo-relogin");
  await relogin.page.goto("/iniciar-sesion/");
  await relogin.page.locator("#login-email").fill(ana.email);
  await relogin.page.locator("#login-password").fill(NEW_PASSWORD);
  await relogin.page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await relogin.page.waitForURL(/\/app\/?$/, { timeout: 20_000 });
  check("E7.10 se puede iniciar sesión con la contraseña nueva", true);

  // ---------- 8) Movimiento reducido y consola ----------
  const reduced = await fresh("ciclo-reducido", { ...MOBILE, reducedMotion: "reduce" });
  await reduced.page.goto("/registro/revisa-tu-correo/");
  await reduced.page.getByRole("heading", { name: "Revisa tu correo" }).waitFor();
  const anim = await reduced.page.evaluate(() => getComputedStyle(document.querySelector(".auth-icon-spring")).animationName);
  check("E8.1 con movimiento reducido el icono no usa el resorte", anim === "none", anim);

  const problems = players.flatMap((player) => player.problems).filter((line) => !/Failed to load resource|HTTP 401|No se pudo actualizar el contador|status of 4\d\d/.test(line));
  check("E8.2 consola sin errores ni avisos propios en todo el recorrido", problems.length === 0, problems.slice(0, 3).join(" | "));
  console.log(`\nNotas axe: ${notes.length ? notes.join(" | ") : "ninguna"}`);
} catch (error) {
  console.error("ERROR EN EL RECORRIDO:", error);
  check("el recorrido terminó sin excepciones", false, String(error).slice(0, 240));
} finally {
  await browser.close();
}
process.exit(summary() ? 0 : 1);
