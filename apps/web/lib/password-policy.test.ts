import { describe, expect, it } from "vitest";
import { isPasswordLongEnough, MIN_PASSWORD_LENGTH, passwordTooShortMessage } from "@/lib/password-policy";

describe("política de contraseña", () => {
  it("exige 10 caracteres y ninguna composición", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
    expect(isPasswordLongEnough("123456789")).toBe(false);
    expect(isPasswordLongEnough("aaaaaaaaaa")).toBe(true);
    expect(isPasswordLongEnough("una frase larga sin símbolos")).toBe(true);
  });
  it("cuenta caracteres, no unidades UTF-16", () => {
    expect(isPasswordLongEnough("🙂".repeat(9))).toBe(false);
    expect(isPasswordLongEnough("🙂".repeat(10))).toBe(true);
  });
  it("el mensaje menciona el mínimo", () => {
    expect(passwordTooShortMessage).toContain("10");
  });
});
