// Almacenamiento en vivo desde la UI real a 390 px y por la API de Storage (Storage real, confirmación de correo ACTIVA).
// Requiere el stack completo: MATCHWORK_STACK_FULL=1 bash supabase/scripts/local-stack.sh start|reset
// (Mailpit en http://127.0.0.1:55424 y Storage). Uso: E2E_PSQL=<psql> node e2e/mail-storage.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { check, launch, newPlayer, PASSWORD, sql, summary, SUPABASE_URL } from "./lib.mjs";

const KEY = process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const NEW_PASSWORD = "Nueva-clave-segura-2026";
const dir = join(tmpdir(), `matchwork-e2e-images-${Date.now()}`);
mkdirSync(dir, { recursive: true });

// ---------- imágenes de prueba (se generan en el navegador) ----------
const browser = await launch();
async function makeImages() {
  const page = await (await browser.newContext()).newPage();
  const files = await page.evaluate(async () => {
    const make = async (w, h, type, noise) => {
      const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (noise) { const data = ctx.createImageData(w, h); for (let o = 0; o < data.data.length; o += 65536) crypto.getRandomValues(new Uint8Array(data.data.buffer, o, Math.min(65536, data.data.length - o))); for (let i = 3; i < data.data.length; i += 4) data.data[i] = 255; ctx.putImageData(data, 0, 0); }
      else { ctx.fillStyle = "#7940e8"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#fff"; ctx.fillRect(w / 4, h / 4, w / 2, h / 2); }
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.95));
      const buffer = new Uint8Array(await blob.arrayBuffer()); let binary = ""; for (let i = 0; i < buffer.length; i += 32768) binary += String.fromCharCode(...buffer.subarray(i, i + 32768));
      return btoa(binary);
    };
    return {
      jpg: await make(200, 200, "image/jpeg"), png: await make(200, 200, "image/png"), webp: await make(200, 200, "image/webp"),
      bigPng: await make(900, 900, "image/png", true), hugePng: await make(1500, 1500, "image/png", true),
    };
  });
  await page.close();
  const out = {};
  for (const [name, b64] of Object.entries(files)) { out[name] = join(dir, `${name}.${name === "jpg" ? "jpg" : name.endsWith("Png") || name === "png" ? "png" : "webp"}`); writeFileSync(out[name], Buffer.from(b64, "base64")); }
  out.pdf = join(dir, "documento.pdf"); writeFileSync(out.pdf, "%PDF-1.4 prueba");
  out.html = join(dir, "pagina.html"); writeFileSync(out.html, "<script>alert(1)</script>");
  return out;
}

try {
  const img = await makeImages();
  const freelancer = await newPlayer(browser, "almacen-freelancer", { viewport: { width: 1280, height: 800 } });
  
  // Usuario confirmado (el ciclo de correo se prueba en e2e/email-cycle.mjs).
  const seed = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  await seed.auth.signUp({ email: freelancer.email, password: NEW_PASSWORD, options: { data: { full_name: "Lucía Almacén", role: "freelancer" } } });
  sql(`update auth.users set email_confirmed_at = now() where email = '${freelancer.email}'`);

  // ================= C) Almacenamiento desde la UI a 390 px =================
  const mobile = await newPlayer(browser, "storage-freelancer", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  mobile.email = freelancer.email;
  const m = mobile.page;
  await m.goto("/iniciar-sesion/");
  await m.locator("#login-email").fill(freelancer.email);
  await m.locator("#login-password").fill(NEW_PASSWORD);
  await m.getByRole("button", { name: /Iniciar sesión/ }).click();
  await m.waitForURL(/\/app\/?/, { timeout: 20_000 });
  await m.goto("/app/perfil/");
  const avatarInput = m.locator("input[type='file']").first();
  await avatarInput.waitFor({ state: "attached", timeout: 20_000 });

  async function tryAvatar(file) {
    await avatarInput.setInputFiles(file);
    const save = m.getByRole("button", { name: "Guardar fotografía" });
    if (await save.count()) { await save.click(); await m.waitForTimeout(2500); }
    return (await m.locator("[role='alert'], [role='status']").allTextContents()).join(" | ");
  }
  const uid = sql(`select id from auth.users where email = '${freelancer.email}'`);
  for (const [label, file] of [["jpeg", img.jpg], ["png", img.png], ["webp", img.webp]]) {
    const message = await tryAvatar(file);
    const stored = sql(`select count(*) from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = '${uid}'`);
    check(`ST1 avatar ${label} se sube desde la UI`, Number(stored) >= 1 && !/no debe superar|elige una imagen/i.test(message), `objetos=${stored} · ${message.slice(0, 80)}`);
  }
  const before = sql(`select count(*) from storage.objects where bucket_id = 'avatars'`);
  const bigMessage = await tryAvatar(img.bigPng);
  check("ST2 un avatar de más de 2 MiB se rechaza con mensaje amable", /2 MiB/.test(bigMessage) && sql(`select count(*) from storage.objects where bucket_id = 'avatars'`) === before, bigMessage.slice(0, 100));
  const pdfMessage = await tryAvatar(img.pdf);
  check("ST3 un PDF como avatar se rechaza con mensaje amable", /JPEG, PNG o WebP/.test(pdfMessage), pdfMessage.slice(0, 100));

  await m.getByRole("button", { name: "Agregar proyecto" }).click();
  await m.locator("#portfolio-title-input").fill("Proyecto con imagen");
  const cover = m.locator("#portfolio-cover");
  await cover.setInputFiles(img.hugePng);
  await m.waitForTimeout(800);
  const hugeText = (await m.locator("[role='alert'], [role='status'], form").allTextContents()).join(" ");
  check("ST4 una imagen de portafolio de más de 5 MiB se rechaza con mensaje amable", /5 MiB/.test(hugeText) && !/Imagen seleccionada: huge/.test(hugeText));
  await cover.setInputFiles(img.webp);
  await m.getByRole("button", { name: "Guardar proyecto" }).click();
  await m.getByText("Proyecto con imagen").first().waitFor({ timeout: 15_000 });
  const mediaPath = sql(`select cover_image_path from public.portfolio_projects where title = 'Proyecto con imagen' and freelancer_user_id = '${uid}'`);
  check("ST5 el proyecto con imagen WebP se guarda en el bucket privado", Boolean(mediaPath) && sql(`select count(*) from storage.objects where bucket_id = 'portfolio-media' and name = '${mediaPath}'`) === "1", mediaPath);
  const horizontal = await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  check("ST6 a 390 px la pantalla del perfil con imágenes no tiene scroll horizontal", !horizontal);

  // ---- API de Storage: rutas ajenas, lectura privada, tipos, suspensión ----
  const publicRead = await fetch(`${SUPABASE_URL}/storage/v1/object/public/portfolio-media/${mediaPath}`);
  const anonSigned = await fetch(`${SUPABASE_URL}/storage/v1/object/portfolio-media/${mediaPath}`, { headers: { apikey: KEY } });
  check("ST7 el medio de un proyecto NO publicado no se lee de forma anónima (URL pública ni autenticada)", publicRead.status >= 400 && anonSigned.status >= 400, `pública=${publicRead.status}, anon=${anonSigned.status}`);

  const owner = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  await owner.auth.signInWithPassword({ email: freelancer.email, password: NEW_PASSWORD });
  const publishedId = sql(`select id from public.portfolio_projects where title = 'Proyecto con imagen' and freelancer_user_id = '${uid}'`);
  sql(`update public.profiles set is_public = true where id = '${uid}'`);
  sql(`update public.portfolio_projects set is_published = true where id = '${publishedId}'`);
  const publishedRead = await fetch(`${SUPABASE_URL}/storage/v1/object/portfolio-media/${mediaPath}`, { headers: { apikey: KEY } });
  check("ST8 con perfil público y proyecto publicado el medio sí se lee de forma anónima", publishedRead.status === 200, `estado=${publishedRead.status}`);
  sql(`update public.portfolio_projects set is_published = false where id = '${publishedId}'`);
  const unpublishedRead = await fetch(`${SUPABASE_URL}/storage/v1/object/portfolio-media/${mediaPath}`, { headers: { apikey: KEY } });
  check("ST9 al despublicar vuelve a quedar bloqueado", unpublishedRead.status >= 400, `estado=${unpublishedRead.status}`);

  const other = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  const otherEmail = `almacen-otro-${Date.now()}@example.test`;
  const signUp = await other.auth.signUp({ email: otherEmail, password: PASSWORD, options: { data: { role: "freelancer", full_name: "Otro" } } });
  sql(`update auth.users set email_confirmed_at = now() where email = '${otherEmail}'`);
  await other.auth.signInWithPassword({ email: otherEmail, password: PASSWORD });
  const otherId = signUp.data.user.id;
  const png = (await import("node:fs")).readFileSync(img.png);
  const intoVictim = await other.storage.from("avatars").upload(`${uid}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" });
  check("ST10 nadie puede escribir en la ruta de otro usuario (avatars)", Boolean(intoVictim.error), intoVictim.error?.message ?? "SUBIÓ");
  const intoVictimPortfolio = await other.storage.from("portfolio-media").upload(`${uid}/${crypto.randomUUID()}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" });
  check("ST11 nadie puede escribir en la ruta de otro usuario (portfolio-media)", Boolean(intoVictimPortfolio.error), intoVictimPortfolio.error?.message ?? "SUBIÓ");
  const overwrite = await other.storage.from("avatars").upload(sql(`select name from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = '${uid}' limit 1`), png, { contentType: "image/png", upsert: true });
  check("ST12 nadie puede sobrescribir el avatar de otro usuario", Boolean(overwrite.error), overwrite.error?.message ?? "SOBRESCRIBIÓ");
  const deleteVictim = await other.storage.from("avatars").remove([sql(`select name from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = '${uid}' limit 1`)]);
  check("ST13 nadie puede borrar el avatar de otro usuario", sql(`select count(*) from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = '${uid}'`) !== "0" && (deleteVictim.data?.length ?? 0) === 0);
  const listVictim = await other.storage.from("portfolio-media").list(uid);
  check("ST14 nadie lista los medios privados de otro usuario", (listVictim.data?.length ?? 0) === 0, `filas=${listVictim.data?.length}`);

  const ownPath = `${otherId}/${crypto.randomUUID()}.png`;
  const badType = await other.storage.from("avatars").upload(`${otherId}/${crypto.randomUUID()}.pdf`, Buffer.from("%PDF-1.4"), { contentType: "application/pdf" });
  check("ST15 el bucket rechaza tipos no permitidos (PDF)", Boolean(badType.error), badType.error?.message ?? "SUBIÓ");
  const badName = await other.storage.from("avatars").upload(`${otherId}/cualquier-nombre.png`, png, { contentType: "image/png" });
  check("ST16 el bucket rechaza nombres que no son uuid.extensión (rutas adivinables)", Boolean(badName.error), badName.error?.message ?? "SUBIÓ");
  const tooBig = await other.storage.from("avatars").upload(ownPath, (await import("node:fs")).readFileSync(img.bigPng), { contentType: "image/png" });
  check("ST17 el bucket rechaza más de 2 MiB aunque se salte la UI", Boolean(tooBig.error), tooBig.error?.message ?? "SUBIÓ");
  const spoof = await other.storage.from("avatars").upload(`${otherId}/${crypto.randomUUID()}.png`, Buffer.from("<script>alert(1)</script>"), { contentType: "image/png" });
  if (!spoof.error) {
    const served = await fetch(`${SUPABASE_URL}/storage/v1/object/public/avatars/${spoof.data.path}`);
    check("ST18 un archivo que se declara PNG pero es HTML se sirve con tipo image/png (no como HTML); nosniff lo añade Caddy en la API", /image\/png/.test(served.headers.get("content-type") ?? ""), `tipo=${served.headers.get("content-type")} nosniff=${served.headers.get("x-content-type-options")}`);
  } else check("ST18 el contenido se valida (rechazado)", true, spoof.error.message);

  sql(`update public.app_users set suspended_at = now(), suspension_reason = 'prueba' where id = '${otherId}'`);
  const suspended = await other.storage.from("avatars").upload(`${otherId}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" });
  check("ST19 una cuenta suspendida no puede subir archivos", Boolean(suspended.error), suspended.error?.message ?? "SUBIÓ");
  sql(`update public.app_users set suspended_at = null, suspension_reason = null where id = '${otherId}'`);
  const reactivated = await other.storage.from("avatars").upload(`${otherId}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" });
  check("ST20 reactivada la cuenta, vuelve a poder subir", !reactivated.error, reactivated.error?.message ?? "");
} catch (error) {
  console.error("ERROR EN EL RECORRIDO:", error);
  check("el recorrido terminó sin excepciones", false, String(error).slice(0, 200));
} finally {
  await browser.close();
}
process.exit(summary() ? 0 : 1);
