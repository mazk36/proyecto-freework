/** Cloudflare Turnstile: solo se activa si hay clave pública; sin clave, el captcha queda apagado. */
export const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export function isCaptchaEnabled(): boolean {
  return getTurnstileSiteKey() !== "";
}

/** Opciones de GoTrue con el token del desafío; sin token no se envía la clave. */
export function captchaOptions(token: string | null | undefined): { captchaToken?: string } {
  return token ? { captchaToken: token } : {};
}
