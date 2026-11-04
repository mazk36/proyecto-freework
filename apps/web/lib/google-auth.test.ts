import { afterEach, describe, expect, it, vi } from "vitest";
import { isGoogleAuthEnabled } from "@/lib/google-auth";

afterEach(() => vi.unstubAllEnvs());

describe("Google como acceso", () => {
  it("está apagado por defecto y con valores que no sean true", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED", "");
    expect(isGoogleAuthEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED", "1");
    expect(isGoogleAuthEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED", "false");
    expect(isGoogleAuthEnabled()).toBe(false);
  });
  it("se enciende solo con true", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED", " TRUE ");
    expect(isGoogleAuthEnabled()).toBe(true);
  });
});
