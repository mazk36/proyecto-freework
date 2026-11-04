import { describe, expect, it } from "vitest";
import {
  classifyLinkError, clearPendingEmail, formatCountdown, readCooldownEnd, readPendingEmail, resendErrorMessage,
  RESEND_COOLDOWN_SECONDS, savePendingEmail, secondsRemaining, startCooldown,
} from "@/lib/email-cycle";

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data };
}

describe("cooldown", () => {
  it("calcula segundos restantes sin bajar de cero", () => {
    expect(secondsRemaining(61_000, 1_000)).toBe(60);
    expect(secondsRemaining(1_500, 1_000)).toBe(1);
    expect(secondsRemaining(1_000, 2_000)).toBe(0);
    expect(secondsRemaining(null, 0)).toBe(0);
    expect(secondsRemaining(Number.NaN, 0)).toBe(0);
  });
  it("da formato m:ss", () => {
    expect(formatCountdown(45)).toBe("0:45");
    expect(formatCountdown(60)).toBe("1:00");
    expect(formatCountdown(5)).toBe("0:05");
    expect(formatCountdown(-3)).toBe("0:00");
  });
  it("guarda la hora de fin por tipo y sobrevive a recargas", () => {
    const storage = memoryStorage();
    const endAt = startCooldown("signup", 10_000, storage);
    expect(endAt).toBe(10_000 + RESEND_COOLDOWN_SECONDS * 1000);
    expect(readCooldownEnd("signup", storage)).toBe(endAt);
    expect(readCooldownEnd("recovery", storage)).toBeNull();
  });
  it("tolera valores corruptos y sin almacenamiento", () => {
    const storage = memoryStorage();
    storage.setItem("matchwork-resend-until:signup", "abc");
    expect(readCooldownEnd("signup", storage)).toBeNull();
    expect(readCooldownEnd("signup", null)).toBeNull();
    expect(() => startCooldown("signup", 0, null)).not.toThrow();
  });
});

describe("correo pendiente", () => {
  it("se guarda recortado, se lee y se borra", () => {
    const storage = memoryStorage();
    savePendingEmail("  ana@ejemplo.com ", storage);
    expect(readPendingEmail(storage)).toBe("ana@ejemplo.com");
    clearPendingEmail(storage);
    expect(readPendingEmail(storage)).toBe("");
  });
});

describe("errores", () => {
  it("mapea por código sin revelar si la cuenta existe", () => {
    expect(resendErrorMessage({ code: "over_email_send_rate_limit" })).toMatch(/muchos intentos/);
    expect(resendErrorMessage({ status: 429 })).toMatch(/muchos intentos/);
    expect(resendErrorMessage({ code: "captcha_failed" })).toMatch(/verificar que eres una persona/);
    expect(resendErrorMessage({ code: "user_not_found", message: "User not found" })).toBe("No pudimos enviar el correo. Inténtalo de nuevo.");
    expect(resendErrorMessage(null)).toBe("No pudimos enviar el correo. Inténtalo de nuevo.");
  });
  it("distingue enlace vencido de problemas de red", () => {
    expect(classifyLinkError({ code: "otp_expired" })).toBe("expired");
    expect(classifyLinkError({ status: 403, message: "Email link is invalid or has expired" })).toBe("expired");
    expect(classifyLinkError({ message: "Failed to fetch" })).toBe("network");
    expect(classifyLinkError({ status: 0 })).toBe("network");
  });
});
