import { describe, expect, it } from "vitest";
import { isValidEmail } from "@/lib/auth";
import { authContinuationHref, isAppPath, isPublicAuthPath, legacyAppTarget, safeAppDestination } from "@/lib/auth-routing";

describe("email validation", () => {
  it("normalizes whitespace and validates the basic email shape", () => {
    expect(isValidEmail("  EQUIPO@Ejemplo.com ")).toBe(true);
    expect(isValidEmail("no-es-correo")).toBe(false);
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

  it("preserves only local app destinations after login", () => {
    expect(safeAppDestination("/app/problemas/nuevo")).toBe("/app/problemas/nuevo");
    expect(safeAppDestination("https://outside.example")).toBe("/app");
    expect(safeAppDestination("//outside.example")).toBe("/app");
    expect(safeAppDestination(null)).toBe("/app");
    expect(safeAppDestination("/app/problemas/detalle?id=abc#parte")).toBe("/app/problemas/detalle?id=abc#parte");
  });

  it("rejects destinations that normalize to another site (dot segments, encoded dots, backslashes, schemes)", () => {
    for (const hostile of [
      "/app/..//outside.example",
      "/app/%2e%2e//outside.example",
      "/app/./..//outside.example",
      "/app/%2E%2E/%2Foutside.example",
      "///outside.example",
      "/app\\@outside.example",
      "/app/\\outside.example",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "/app\n//outside.example",
      "/other/app/",
    ]) {
      expect(safeAppDestination(hostile), hostile).toBe("/app");
    }
    expect(safeAppDestination("/app/problemas/../perfil")).toBe("/app/perfil");
    expect(authContinuationHref("/registro", "/app/problemas/nuevo")).toBe(
      "/registro?next=%2Fapp%2Fproblemas%2Fnuevo",
    );
  });
});
