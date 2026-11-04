import { describe, expect, it } from "vitest";
import { browserSupportScript, oldBrowserNotice } from "@/lib/browser-support";

function run(supports: (property: string, value?: string) => boolean) {
  const inserted: string[] = [];
  const document = {
    addEventListener: (_event: string, callback: () => void) => callback(),
    createElement: () => ({ setAttribute: () => {}, style: {}, set textContent(value: string) { inserted.push(value); } }),
    documentElement: { appendChild: () => {} },
  };
  new Function("window", "CSS", "document", browserSupportScript)({ CSS: { supports } }, { supports }, document);
  return inserted;
}

describe("aviso de navegador antiguo", () => {
  it("no muestra nada si el navegador soporta color-mix y :is()", () => {
    expect(run(() => true)).toEqual([]);
  });
  it("muestra el aviso si falta color-mix", () => {
    expect(run((property) => !String(property).includes("color"))).toEqual([oldBrowserNotice]);
  });
  it("muestra el aviso si falta :is()", () => {
    expect(run((property) => !String(property).startsWith("selector"))).toEqual([oldBrowserNotice]);
  });
  it("no rompe si CSS.supports no existe", () => {
    const document = { addEventListener: () => {}, createElement: () => ({}), documentElement: {} };
    expect(() => new Function("window", "CSS", "document", browserSupportScript)({}, undefined, document)).not.toThrow();
  });
});
