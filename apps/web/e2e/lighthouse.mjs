// Lighthouse móvil (simulación de red y CPU por defecto) sobre la landing, /registro, /iniciar-sesion y una pantalla de la app.
// Pensado para la pila de producción local (Caddy con br/gzip): ver «Contra la pila de producción» en e2e/README.md.
// Lighthouse no es dependencia del repositorio: instálalo aparte (npm i lighthouse@12 --prefix <carpeta>) y pasa LIGHTHOUSE_DIR.
// Uso: LIGHTHOUSE_DIR=<carpeta> E2E_BASE_URL=https://web.matchwork.localhost:9443 node e2e/lighthouse.mjs
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { BASE_URL, PASSWORD, sleep } from "./lib.mjs";
import { ensurePersonas } from "./ui-data.mjs";

const dir = process.env.LIGHTHOUSE_DIR;
if (!dir) { console.error("Falta LIGHTHOUSE_DIR (carpeta donde está instalado lighthouse)."); process.exit(2); }
const lighthouse = (await import(createRequire(join(dir, "package.json")).resolve("lighthouse"))).default;
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), "lh-chrome-"));
const context = await chromium.launchPersistentContext(profile, {
  channel: "chrome", headless: true, ignoreHTTPSErrors: true,
  args: [`--remote-debugging-port=${PORT}`, "--ignore-certificate-errors", "--no-first-run"],
});

const personas = await ensurePersonas(await chromium.launch({ channel: "chrome", args: ["--ignore-certificate-errors"] }));
async function signIn() {
  // Solo después de medir las pantallas públicas: con sesión abierta redirigen a /app.
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/iniciar-sesion/`);
  await page.locator("#login-email").fill(personas.freelancerRich.email);
  await page.locator("#login-password").fill(PASSWORD);
  await page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await page.waitForURL(/\/app\/?/, { timeout: 30_000 });
  await sleep(1500);
  await page.close();
}

const targets = [
  ["landing", "/", true], ["registro", "/registro/", true], ["iniciar-sesion", "/iniciar-sesion/", true], ["app-descubrir (autenticada)", "/app/descubrir/", false],
];
const results = [];
let signedIn = false;
for (const [name, path, clearStorage] of targets) {
  if (!clearStorage && !signedIn) { await signIn(); signedIn = true; }
  // Las pantallas públicas se miden sin sesión; la de la app conserva el almacenamiento (disableStorageReset).
  const url = `${BASE_URL}${path}`;
  const run = await lighthouse(url, { port: PORT, output: "json", logLevel: "error", disableStorageReset: !clearStorage }, {
    extends: "lighthouse:default",
    settings: { onlyCategories: ["performance", "accessibility", "best-practices", "seo"], formFactor: "mobile", screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false }, disableStorageReset: !clearStorage },
  });
  const lhr = run.lhr;
  const score = (id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
  const failed = Object.values(lhr.audits).filter((audit) => audit.score !== null && audit.score < 0.9 && ["accessibility", "best-practices", "seo"].some((cat) => lhr.categories[cat].auditRefs.some((ref) => ref.id === audit.id && ref.weight > 0))).map((audit) => audit.id);
  results.push({ name, url, performance: score("performance"), accessibility: score("accessibility"), bestPractices: score("best-practices"), seo: score("seo"), lcp: lhr.audits["largest-contentful-paint"].displayValue, cls: lhr.audits["cumulative-layout-shift"].displayValue, tbt: lhr.audits["total-blocking-time"].displayValue, failed, final: lhr.finalDisplayedUrl });
  writeFileSync(join(tmpdir(), `lh-${name.split(" ")[0]}.json`), JSON.stringify(lhr));
}
await context.close();
console.log("\n| Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT |\n|---|---|---|---|---|---|---|---|");
for (const r of results) console.log(`| ${r.name} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} | ${r.lcp} | ${r.cls} | ${r.tbt} |`);
for (const r of results) if (r.failed.length) console.log(`Auditorías por debajo de 0,9 en ${r.name}: ${r.failed.join(", ")}`);
for (const r of results) if (new URL(r.final ?? "http://x").pathname !== new URL(r.url).pathname) console.log(`AVISO ${r.name}: Lighthouse terminó en ${r.final}`);
