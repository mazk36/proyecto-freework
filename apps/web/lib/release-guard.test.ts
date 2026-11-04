import { describe, expect, it } from "vitest";
import { releaseSiteUrlProblem } from "@/lib/release-guard";

describe("guarda del build de release", () => {
  it("no hace nada fuera de un release", () => {
    expect(releaseSiteUrlProblem(undefined, undefined)).toBeNull();
    expect(releaseSiteUrlProblem("0", "http://localhost:3000")).toBeNull();
  });
  it("falla si falta la URL o apunta a localhost", () => {
    expect(releaseSiteUrlProblem("1", undefined)).toMatch(/falta/);
    expect(releaseSiteUrlProblem("1", "  ")).toMatch(/falta/);
    for (const url of ["http://localhost:3000", "https://localhost", "https://127.0.0.1:8443", "https://web.matchwork.localhost:9443", "https://[::1]/"]) {
      expect(releaseSiteUrlProblem("1", url)).toMatch(/localhost|https/);
    }
  });
  it("exige https y una URL válida", () => {
    expect(releaseSiteUrlProblem("1", "http://matchwork.pe")).toMatch(/https/);
    expect(releaseSiteUrlProblem("1", "no es url")).toMatch(/no es una URL válida/);
  });
  it("acepta un dominio público con https", () => {
    expect(releaseSiteUrlProblem("1", "https://matchwork.pe")).toBeNull();
  });
});
