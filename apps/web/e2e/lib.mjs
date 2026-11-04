// Shared helpers for the end-to-end journey and the accessibility sweep.
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:4173";
export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:55421";
export const DB_URL = process.env.E2E_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:55422/postgres";
export const PSQL = process.env.E2E_PSQL ?? "psql";
export const PASSWORD = "Passw0rd!e2e-journey";
export const stamp = Date.now();

const results = [];
export function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  return Boolean(ok);
}
export function summary() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} comprobaciones correctas`);
  if (failed.length) console.log(`FALLARON:\n${failed.map((r) => `  - ${r.name}${r.detail ? ` (${r.detail})` : ""}`).join("\n")}`);
  return failed.length === 0;
}

export function sql(statement) {
  return execFileSync(PSQL, [DB_URL, "-X", "-A", "-t", "-q", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" }).trim();
}
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function launch() {
  // Uses the system Chrome so no browser download is needed; set E2E_CHROMIUM_PATH to use another binary.
  return chromium.launch(process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : { channel: "chrome" });
}

export async function newPlayer(browser, label, options = {}) {
  const context = await browser.newContext({ baseURL: BASE_URL, locale: "es-PE", ignoreHTTPSErrors: process.env.E2E_IGNORE_HTTPS === "1", ...options });
  const page = await context.newPage();
  const problems = [];
  page.on("response", (response) => { if (response.status() === 401) problems.push(`[${label}] HTTP 401 ${response.request().method()} ${response.url().replace(/^https?:\/\/[^/]+/, "").slice(0, 80)}`); });
  page.on("pageerror", (error) => problems.push(`[${label}] pageerror: ${String(error).slice(0, 200)}`));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) problems.push(`[${label}] console.${message.type()}: ${message.text().slice(0, 200)}`);
  });
  return { label, context, page, problems, email: `${label}-${stamp}@example.test` };
}

/** Drops browser-logged network failures that are the intended effect of a step (sign-out, quota, offline). */
export function forgetNetworkErrors(player, sinceIndex) {
  const kept = player.problems.slice(sinceIndex).filter((line) => !/Failed to load resource|HTTP 401|No se pudo actualizar el contador/.test(line));
  player.problems.splice(sinceIndex, player.problems.length, ...kept);
}

export async function register(player, name, role) {
  const { page } = player;
  await page.goto("/registro/");
  await page.locator("#name").fill(name);
  await page.locator("#email").fill(player.email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#confirmation").fill(PASSWORD);
  await page.getByRole("radio", { name: role === "company" ? "Empresa" : "Freelancer" }).check();
  await page.getByRole("button", { name: /Crear cuenta/ }).click();
  await page.waitForURL(/\/app\/?|revisa-tu-correo/, { timeout: 20_000 });
  if (/revisa-tu-correo/.test(page.url())) {
    // Con la confirmación de correo activa (stack completo) se confirma por SQL; el ciclo real se prueba en email-cycle.mjs.
    sql(`update auth.users set email_confirmed_at = now() where email = '${player.email}'`);
    await login(player);
  }
}

export async function login(player) {
  const { page } = player;
  await page.goto("/iniciar-sesion/");
  await page.locator("#login-email").fill(player.email);
  await page.locator("#login-password").fill(PASSWORD);
  await page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await page.waitForURL(/\/app\/?/, { timeout: 20_000 });
}

export async function logout(player) {
  await player.page.getByRole("button", { name: /Cerrar sesión/ }).first().click();
  await player.page.waitForURL(/\/iniciar-sesion|\/$|\/app\/chats/, { timeout: 15_000 }).catch(() => {});
  await player.page.waitForFunction(() => !Object.keys(localStorage).some((key) => key.startsWith("sb-") && key.endsWith("-auth-token")), null, { timeout: 15_000 });
}

export async function userId(player) {
  return sql(`select id from auth.users where email = '${player.email}'`);
}
