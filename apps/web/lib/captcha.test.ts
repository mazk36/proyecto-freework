import { afterEach, describe, expect, it, vi } from "vitest";
import { captchaOptions, getTurnstileSiteKey, isCaptchaEnabled } from "@/lib/captcha";

afterEach(() => vi.unstubAllEnvs());

describe("captcha", () => {
  it("está apagado sin clave pública", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(isCaptchaEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "   ");
    expect(getTurnstileSiteKey()).toBe("");
    expect(isCaptchaEnabled()).toBe(false);
  });
  it("se activa con clave y envía el token solo si existe", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", " 1x00000000000000000000AA ");
    expect(isCaptchaEnabled()).toBe(true);
    expect(getTurnstileSiteKey()).toBe("1x00000000000000000000AA");
    expect(captchaOptions("tok")).toEqual({ captchaToken: "tok" });
    expect(captchaOptions(null)).toEqual({});
    expect(captchaOptions("")).toEqual({});
  });
});
