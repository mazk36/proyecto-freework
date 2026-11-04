// Accessibility / responsive sweep over every real screen and its states. Called by journey.mjs with live users.
import { auditDialog, auditFocusOrder, auditReducedMotion, auditScreen, notes } from "./a11y-lib.mjs";
import { forgetNetworkErrors, newPlayer, register, sleep, sql, stamp } from "./lib.mjs";

export async function runSweep({ browser, desktop, companyA, freelancer, adminP, matchId, problemId }) {
  const visit = async (player, url, name, options) => {
    await player.page.goto(url);
    await player.page.waitForLoadState("networkidle").catch(() => {});
    await sleep(700);
    return auditScreen(player, name, options);
  };

  // --- Pantallas públicas ---
  const visitor = await newPlayer(browser, "visitante-a11y", desktop);
  for (const [url, name] of [["/", "landing"], ["/registro/", "registro"], ["/iniciar-sesion/", "iniciar sesión"], ["/recuperar-contrasena/", "recuperar contraseña"], ["/profesionales/", "profesionales (lista pública)"]]) await visit(visitor, url, `público · ${name}`);
  const slug = sql("select slug from public.profiles where is_public limit 1");
  if (slug) await visit(visitor, `/profesionales/?slug=${slug}`, "público · perfil de profesional");
  const consoleBefore404 = visitor.problems.length;
  await visit(visitor, "/ruta-que-no-existe/", "público · 404");
  forgetNetworkErrors(visitor, consoleBefore404); // the browser logs the intended HTTP 404
  await visitor.page.goto("/");
  await auditReducedMotion(visitor, "landing");
  for (const [url, name] of [["/", "landing"], ["/registro/", "registro"], ["/iniciar-sesion/", "iniciar sesión"]]) {
    await visitor.page.goto(url);
    await sleep(800);
    await auditFocusOrder(visitor, `público · ${name}`);
  }

  // --- Empresa verificada ---
  for (const [url, name] of [["/app/", "inicio"], ["/app/perfil/", "perfil + verificación (verificada)"], ["/app/problemas/", "mis problemas"], [`/app/problemas/detalle/?id=${problemId}`, "detalle del problema"], ["/app/explorar/", "explorar"], ["/app/likes/", "likes"], ["/app/matches/", "matches"], ["/app/guardados/", "guardados"], ["/app/propuestas/", "bandeja (sin problema elegido)"], [`/app/chats/?match=${matchId}`, "chat"], ["/app/chats/", "chats (lista)"]]) await visit(companyA, url, `empresa · ${name}`);
  for (const [url, name] of [["/app/", "inicio"], ["/app/perfil/", "perfil"], ["/app/propuestas/", "bandeja"]]) {
    await companyA.page.goto(url);
    await sleep(1200);
    await auditFocusOrder(companyA, `empresa · ${name}`);
  }
  // Bandeja con un problema elegido, ficha completa y comparación.
  await companyA.page.goto("/app/propuestas/");
  const select = companyA.page.getByLabel("Problema");
  const value = await select.evaluate((element) => [...element.options].find((option) => /Ordenar la atención/.test(option.textContent ?? ""))?.value ?? "");
  await select.selectOption(value);
  await companyA.page.getByText("Ana Torres").first().waitFor({ timeout: 15_000 });
  await auditScreen(companyA, "empresa · bandeja con propuestas");
  await companyA.page.getByRole("checkbox", { name: /Comparar/ }).nth(0).check();
  await companyA.page.getByRole("checkbox", { name: /Comparar/ }).nth(1).check();
  await companyA.page.getByRole("button", { name: /Ver comparación/ }).click();
  await companyA.page.getByRole("heading", { name: "Comparar propuestas" }).waitFor();
  await auditScreen(companyA, "empresa · comparación de propuestas");
  await companyA.page.getByRole("button", { name: /Volver a la bandeja/ }).click();
  const fullProposal = companyA.page.getByRole("button", { name: /Ver propuesta completa/ }).first();
  await auditDialog(companyA, "ficha completa de la propuesta", () => fullProposal.click(), fullProposal);
  // Asistente de publicación: paso 1 vacío, con errores y revisión.
  await companyA.page.goto("/app/problemas/nuevo/");
  await companyA.page.locator("#problem-title").waitFor();
  await auditScreen(companyA, "empresa · publicar paso 1");
  await companyA.page.getByRole("button", { name: "Continuar" }).click();
  await sleep(600);
  await auditScreen(companyA, "empresa · publicar paso 1 con errores");

  // --- Empresa nueva sin verificar (estado «sin solicitar» y diálogo del formulario) ---
  const newCompany = await newPlayer(browser, "empresa-nueva", desktop);
  const newName = `Empresa Nueva ${stamp}`;
  await register(newCompany, newName, "company");
  for (const [url, name] of [["/app/", "inicio vacío"], ["/app/propuestas/", "propuestas vacías"], ["/app/problemas/", "problemas vacíos"], ["/app/likes/", "likes vacíos"], ["/app/chats/", "chats vacíos"], ["/app/perfil/", "perfil sin completar"]]) await visit(newCompany, url, `empresa nueva · ${name}`);
  await newCompany.page.locator("#company-name").fill(newName);
  await newCompany.page.locator("#company-industry").fill("Comercio");
  await newCompany.page.locator("#company-description").fill("Tienda de prueba para la revisión de accesibilidad.");
  await newCompany.page.getByRole("button", { name: "Guardar perfil empresarial" }).click();
  await newCompany.page.getByText(/guardad/i).first().waitFor({ timeout: 15_000 });
  await auditScreen(newCompany, "empresa nueva · perfil + verificación (sin solicitar)");
  const verifyButton = newCompany.page.getByRole("button", { name: "Verificar mi empresa" });
  await auditDialog(newCompany, "formulario de verificación", () => verifyButton.click(), verifyButton);
  // Enviar una solicitud para que el admin tenga algo pendiente que rechazar.
  await newCompany.page.getByRole("button", { name: "Verificar mi empresa" }).click();
  const form = newCompany.page.getByRole("dialog");
  await form.getByLabel(/Razón social/i).fill("Empresa Nueva S.A.C.");
  await form.getByLabel(/RUC|Identificación/i).first().fill("20111222331");
  await form.getByLabel(/Sitio web/i).fill("https://empresa-nueva.example");
  await form.getByRole("button", { name: "Enviar solicitud" }).click();
  await newCompany.page.getByText("En revisión").first().waitFor({ timeout: 15_000 });
  await auditScreen(newCompany, "empresa nueva · verificación en revisión");

  // --- Freelancer (móvil) ---
  await freelancer.page.goto("/app/descubrir/");
  await freelancer.page.waitForLoadState("networkidle").catch(() => {});
  await auditScreen(freelancer, "freelancer · feed (mazo)");
  await freelancer.page.setViewportSize({ width: 1280, height: 800 });
  await auditFocusOrder(freelancer, "freelancer · feed (escritorio)");
  await freelancer.page.setViewportSize({ width: 390, height: 844 });
  const moreButton = freelancer.page.getByRole("button", { name: /Ver más/ }).first();
  await auditDialog(freelancer, "detalle del problema en el mazo", () => moreButton.click(), moreButton);
  const proposeButton = freelancer.page.getByRole("button", { name: /Proponer ahora/ }).first();
  await auditDialog(freelancer, "hoja de propuesta", () => proposeButton.click(), proposeButton);
  for (const [url, name] of [["/app/perfil/", "perfil"], ["/app/explorar/", "explorar"], ["/app/likes/", "likes (Me interesan)"], ["/app/matches/", "matches"], ["/app/guardados/", "guardados"], [`/app/chats/?match=${matchId}`, "chat"], ["/app/chats/", "lista de chats"]]) await visit(freelancer, url, `freelancer · ${name}`);
  await freelancer.page.goto("/app/likes/");
  for (const tab of ["Propuestas enviadas", "Matches"]) {
    await freelancer.page.getByRole("tab", { name: new RegExp(tab) }).click();
    await sleep(700);
    await auditScreen(freelancer, `freelancer · likes · ${tab}`);
  }
  await auditReducedMotion(freelancer, "feed del freelancer");
  // Estado de error: sin conexión con el servidor de datos.
  const consoleBeforeOffline = freelancer.problems.length;
  await freelancer.page.route(/\/rest\/v1\/rpc\//, (route) => route.abort());
  await freelancer.page.goto("/app/explorar/");
  await sleep(1500);
  await auditScreen(freelancer, "freelancer · explorar con error de conexión");
  await freelancer.page.unroute(/\/rest\/v1\/rpc\//);
  forgetNetworkErrors(freelancer, consoleBeforeOffline);

  // --- Admin ---
  for (const [tab, name] of [["empresas", "empresas"], ["usuarios", "usuarios"], ["problemas", "problemas"], ["ajustes", "ajustes"]]) await visit(adminP, `/app/admin/?tab=${tab}`, `admin · ${name}`);
  await adminP.page.goto("/app/admin/?tab=empresas");
  await sleep(1500);
  await auditFocusOrder(adminP, "admin · empresas");
  await adminP.page.getByRole("row", { name: new RegExp(newName) }).waitFor({ timeout: 15_000 });
  const rejectButton = adminP.page.getByRole("row", { name: new RegExp(newName) }).getByRole("button", { name: /Rechazar/ });
  await auditDialog(adminP, "rechazar solicitud (admin)", () => rejectButton.click(), rejectButton);
  await adminP.page.goto("/app/admin/?tab=ajustes");
  const strictSwitch = adminP.page.getByRole("switch");
  await auditDialog(adminP, "confirmar modo estricto (admin)", () => strictSwitch.click(), strictSwitch);
  await adminP.page.goto("/app/admin/?tab=usuarios");
  await adminP.page.getByRole("button", { name: "Suspender" }).first().waitFor({ timeout: 15_000 });
  const suspendButton = adminP.page.getByRole("button", { name: "Suspender" }).first();
  await auditDialog(adminP, "suspender usuario (admin)", () => suspendButton.click(), suspendButton);
  return { players: [visitor, newCompany], notes };
}
