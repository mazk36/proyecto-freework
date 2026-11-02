import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("No se encontró Playwright. Usa una instalación disponible en NODE_PATH para ejecutar las capturas.");
  process.exit(1);
}

const outputDir = resolve(dirname(fileURLToPath(import.meta.url)), "../.ui-captures");
const sizes = [
  [360, 740],
  [390, 844],
  [768, 1024],
  [1280, 800],
  [1536, 864],
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ignoreDefaultArgs: ["--hide-scrollbars"],
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});

try {
  for (const [width, height] of sizes) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    try {
      await page.goto("http://localhost:3000/ui-kit", { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Una base para conectar" }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: resolve(outputDir, `ui-kit-${width}x${height}.png`), fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: "Abrir panel" }).click();
      await page.getByRole("dialog", { name: "Un espacio para los detalles" }).waitFor();
      await page.screenshot({ path: resolve(outputDir, `ui-kit-panel-${width}x${height}.png`), animations: "disabled" });
      console.log(`Capturas guardadas: ${width}x${height}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
