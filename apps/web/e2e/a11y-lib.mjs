// Accessibility and responsive audit helpers (axe-core + layout checks). Used by journey.mjs.
import AxeBuilder from "@axe-core/playwright";
import { check, sleep } from "./lib.mjs";

export const WIDTHS = [360, 390, 768, 1280, 1536];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
export const notes = [];

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await sleep(500);
}

/** Layout checks that axe does not cover: horizontal scroll, touch target size and 200 % text. */
async function layoutReport(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const hscroll = doc.scrollWidth > doc.clientWidth + 1;
    const offenders = hscroll ? [...document.querySelectorAll("body *")].filter((element) => {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.right <= doc.clientWidth + 1 || getComputedStyle(element).position === "fixed") return false;
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const overflow = getComputedStyle(parent).overflowX;
        if (["hidden", "auto", "scroll", "clip"].includes(overflow) && parent.getBoundingClientRect().right <= doc.clientWidth + 1) return false;
      }
      return true;
    }).slice(0, 3).map((element) => `${element.tagName.toLowerCase()}.${String(element.className).split(" ").slice(0, 4).join(".")} «${(element.textContent ?? "").trim().slice(0, 18)}»`) : [];
    const small = [];
    for (const element of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], [role=radio], [role=checkbox]")) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden" || style.display === "none") continue;
      if (element.closest("[aria-hidden='true'], .sr-only") || /sr-only/.test(element.className)) continue;
      if (element instanceof HTMLInputElement && ["radio", "checkbox"].includes(element.type) && (element.closest("label")?.getBoundingClientRect().height ?? 0) >= 44) continue;
      if (style.display === "inline" && element.closest("p, li, span, h1, h2, h3, dd, dt, label")) continue; // inline text links are exempt (WCAG 2.5.8)
      if (rect.height < 44 - 0.5 || rect.width < 44 - 0.5) {
        // Controls whose hit area is padded by a larger parent link/label are fine; otherwise report.
        small.push(`${element.tagName.toLowerCase()}${element.getAttribute("aria-label") ? `[${element.getAttribute("aria-label")}]` : ""}:${Math.round(rect.width)}x${Math.round(rect.height)} «${(element.textContent ?? "").trim().slice(0, 20)}»`);
      }
    }
    return { hscroll, offenders, small: [...new Set(small)].slice(0, 6) };
  });
}

/** Runs the audit on the page's current screen. `name` identifies the screen/state in the report. */
export async function auditScreen(player, name, { widths = WIDTHS, axeWidths = [390, 1280] } = {}) {
  const { page } = player;
  const original = page.viewportSize();
  const problems = [];
  await settle(page);
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 700 ? 800 : 860 });
    await sleep(350);
    const report = await layoutReport(page);
    if (report.hscroll) problems.push(`scroll horizontal a ${width}px`);
    if (report.small.length) problems.push(`objetivos <44px a ${width}px: ${report.small.join("; ")}`);
    if (axeWidths.includes(width)) {
      const result = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      for (const violation of result.violations) {
        const line = `axe ${violation.id} (${violation.impact}) a ${width}px en ${violation.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`;
        if (["serious", "critical"].includes(violation.impact ?? "")) problems.push(line);
        else notes.push(`${name}: ${line}`);
      }
    }
  }
  // 200 % text size without horizontal page scroll.
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await sleep(300);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await sleep(200);
    const zoomed = await layoutReport(page);
    if (zoomed.hscroll) problems.push(`con texto al 200 % hay scroll horizontal a ${width}px por: ${zoomed.offenders.join(" | ")}`);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
  if (original) await page.setViewportSize(original);
  check(`A11Y ${name}`, problems.length === 0, problems.join(" || "));
  return problems;
}

/** Opens a dialog/sheet, verifies focus entry, a focus trap, Escape and focus return to the opener. */
export async function auditDialog(player, name, open, opener = null) {
  const { page } = player;
  const problems = [];
  if (opener) await opener.focus().catch(() => {});
  await open();
  const dialog = page.getByRole("dialog").last();
  await dialog.waitFor({ timeout: 8000 });
  await sleep(500);
  const inside = () => dialog.evaluate((node) => node.contains(document.activeElement));
  if (!(await inside())) problems.push("el foco no entra al diálogo al abrirlo");
  for (let i = 0; i < 18; i += 1) {
    await page.keyboard.press("Tab");
    if (!(await inside())) { problems.push(`el foco escapa del diálogo con Tab (pulsación ${i + 1})`); break; }
  }
  await page.keyboard.press("Shift+Tab");
  if (!(await inside())) problems.push("el foco escapa con Shift+Tab");
  const labelled = await dialog.evaluate((node) => Boolean(node.getAttribute("aria-label") || node.getAttribute("aria-labelledby")) && node.getAttribute("aria-modal") === "true");
  if (!labelled) problems.push("el diálogo no tiene nombre accesible o aria-modal");
  await page.keyboard.press("Escape");
  const closed = await dialog.waitFor({ state: "detached", timeout: 4000 }).then(() => true).catch(() => false);
  if (!closed) problems.push("Escape no cierra el diálogo");
  else if (opener) {
    const returned = await opener.evaluate((element) => element === document.activeElement).catch(() => false);
    if (!returned) problems.push("el foco no vuelve al botón que abrió el diálogo");
  }
  check(`DIÁLOGO ${name}`, problems.length === 0, problems.join(" || "));
  return problems;
}

/** With prefers-reduced-motion the page must not run transform animations. */
export async function auditReducedMotion(player, name) {
  const { page } = player;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await sleep(1200);
  const moving = await page.evaluate(() => document.getAnimations().filter((animation) => {
    const keyframes = animation.effect?.getKeyframes?.() ?? [];
    const timing = animation.effect?.getComputedTiming?.();
    return keyframes.some((frame) => "transform" in frame && frame.transform && frame.transform !== "none") && (timing?.duration ?? 0) > 20 && animation.playState === "running";
  }).map((animation) => animation.animationName ?? animation.transitionProperty ?? "animation"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  check(`MOVIMIENTO REDUCIDO ${name}`, moving.length === 0, moving.slice(0, 4).join(", "));
}

/** Keyboard pass: every Tab stop is visible, has a visible focus style and follows document order (no positive tabindex). */
export async function auditFocusOrder(player, name, stops = 28) {
  const { page } = player;
  await page.evaluate(() => { document.activeElement?.blur?.(); document.querySelectorAll("[data-e2e-first]").forEach((node) => node.removeAttribute("data-e2e-first")); window.scrollTo(0, 0); });
  const problems = [];
  let previous = null;
  for (let i = 0; i < stops; i += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate((prev) => {
      const element = document.activeElement;
      if (!element || element === document.body) return { body: true };
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const outline = parseFloat(style.outlineWidth) > 0 && style.outlineStyle !== "none";
      const ring = style.boxShadow !== "none" && style.boxShadow !== "";
      const marker = "e2e-prev";
      if (element.hasAttribute("data-e2e-first")) return { body: true }; // the cycle closed: focus is back at the first stop
      if (!prev) element.setAttribute("data-e2e-first", "1");
      const before = prev ? document.querySelector(`[data-${marker}]`) : null;
      const inOrder = !before || Boolean(before.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) || element.closest("[role=dialog]") !== null;
      document.querySelectorAll(`[data-${marker}]`).forEach((node) => node.removeAttribute(`data-${marker}`));
      element.setAttribute(`data-${marker}`, "1");
      return { label: `${element.tagName.toLowerCase()}${element.getAttribute("aria-label") ? `[${element.getAttribute("aria-label")}]` : ""} «${(element.textContent ?? "").trim().slice(0, 18)}»`, visible: box.width > 0 && box.height > 0, focusStyle: outline || ring, positiveTabindex: element.tabIndex > 0, inOrder };
    }, previous !== null);
    if (info.body) break; // reached the end of the page and wrapped to the browser UI
    if (!info.visible) problems.push(`parada de foco invisible: ${info.label}`);
    if (!info.focusStyle) problems.push(`sin indicador de foco: ${info.label}`);
    if (info.positiveTabindex) problems.push(`tabindex positivo: ${info.label}`);
    if (!info.inOrder) problems.push(`orden de tabulación fuera del orden del documento: ${info.label}`);
    previous = info.label;
  }
  check(`TECLADO ${name}`, problems.length === 0, [...new Set(problems)].slice(0, 5).join(" || "));
}
