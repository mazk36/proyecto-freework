import { describe, expect, it } from "vitest";
import { passwordChangeFailure, validatePasswordChange } from "@/lib/password-change";

describe("cambio de contraseña", () => {
  it("valida longitud y coincidencia", () => {
    expect(validatePasswordChange("corta", "corta")).toMatch(/al menos 10/);
    expect(validatePasswordChange("una-clave-larga-1", "otra-clave-larga-2")).toBe("Las contraseñas no coinciden.");
    expect(validatePasswordChange("una-clave-larga-1", "una-clave-larga-1")).toBeNull();
  });
  it("pide reautenticación cuando GoTrue la exige", () => {
    expect(passwordChangeFailure({ code: "reauthentication_needed" })).toEqual({ reauth: true });
  });
  it("traduce los errores conocidos a mensajes amables", () => {
    expect(passwordChangeFailure({ code: "same_password" })).toEqual({ reauth: false, message: "Elige una contraseña distinta a la actual." });
    expect(passwordChangeFailure({ code: "weak_password" })).toMatchObject({ reauth: false });
    expect(passwordChangeFailure({ code: "reauthentication_not_valid" })).toMatchObject({ message: expect.stringMatching(/código/) });
    expect(passwordChangeFailure({ status: 429 })).toMatchObject({ message: expect.stringMatching(/muchos intentos/) });
    expect(passwordChangeFailure({ status: 401 })).toMatchObject({ message: expect.stringMatching(/sesión venció/) });
    expect(passwordChangeFailure(null)).toMatchObject({ message: expect.stringMatching(/No pudimos actualizar/) });
  });
});
