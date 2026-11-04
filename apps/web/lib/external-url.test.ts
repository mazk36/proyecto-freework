import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "@/lib/external-url";

describe("safeExternalUrl", () => {
  it("acepta http y https", () => {
    expect(safeExternalUrl("https://ejemplo.com/a?b=1")).toBe("https://ejemplo.com/a?b=1");
    expect(safeExternalUrl(" http://ejemplo.com ")).toBe("http://ejemplo.com/");
  });
  it("descarta esquemas peligrosos, relativos y vacíos", () => {
    for (const value of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<b>x</b>", "vbscript:x", "//evil.com", "/ruta", "no es url", "", null, undefined]) {
      expect(safeExternalUrl(value)).toBeNull();
    }
  });
});
