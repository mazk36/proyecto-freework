import { describe, expect, it } from "vitest";
import {
  findAuthAccount,
  isValidEmail,
  normalizeEmail,
  parseAuthAccounts,
  parseAuthUser,
  upsertAuthAccount,
  type AuthUser,
} from "@/lib/auth";
import {
  isAppPath,
  isPublicAuthPath,
  legacyAppTarget,
} from "@/lib/auth-routing";

const companyAccount: AuthUser = {
  id: "account-1",
  name: "Equipo",
  email: "equipo@ejemplo.com",
  role: "company",
};

describe("temporary account data", () => {
  it("normalizes and checks email without accepting whitespace", () => {
    expect(normalizeEmail("  EQUIPO@Ejemplo.com ")).toBe("equipo@ejemplo.com");
    expect(isValidEmail("equipo@ejemplo.com")).toBe(true);
    expect(isValidEmail("no-es-correo")).toBe(false);
  });

  it("parses only account metadata and ignores invalid or duplicate entries", () => {
    const serialized = JSON.stringify([
      { ...companyAccount, password: "never persisted" },
      { ...companyAccount, id: "duplicate" },
      { id: "bad", name: "Sin correo", email: "", role: "company" },
    ]);

    expect(parseAuthAccounts(serialized)).toEqual([companyAccount]);
    expect(parseAuthUser({ ...companyAccount, role: "admin" })).toBeNull();
    expect(parseAuthAccounts("{malformed")).toEqual([]);
  });

  it("finds and replaces accounts by normalized email", () => {
    expect(findAuthAccount([companyAccount], " EQUIPO@EJEMPLO.COM ")).toEqual(companyAccount);
    const updated = { ...companyAccount, name: "Equipo MatchWork" };
    expect(upsertAuthAccount([companyAccount], updated)).toEqual([updated]);
  });
});

describe("public and private route boundaries", () => {
  it("keeps only landing and auth routes public", () => {
    expect(isPublicAuthPath("/")).toBe(true);
    expect(isPublicAuthPath("/iniciar-sesion/")).toBe(true);
    expect(isPublicAuthPath("/registro")).toBe(true);
    expect(isPublicAuthPath("/recuperar-contrasena/")).toBe(true);
    expect(isPublicAuthPath("/discover")).toBe(false);
  });

  it("classifies private app routes and maps old routes to the new shell", () => {
    expect(isAppPath("/app")).toBe(true);
    expect(isAppPath("/app/guardados/")).toBe(true);
    expect(isAppPath("/saved")).toBe(false);
    expect(legacyAppTarget("/discover/preferences")).toBe("/app/descubrir");
    expect(legacyAppTarget("/problems/new")).toBe("/app/problemas/nuevo");
    expect(legacyAppTarget("/company/problems/old/solutions/discover")).toBe("/app/problemas");
    expect(legacyAppTarget("/otra-ruta")).toBeNull();
  });
});
