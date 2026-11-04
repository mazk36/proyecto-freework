/** Lógica pura del ciclo de correo (confirmación y recuperación): cooldown de reenvío, correo pendiente y mensajes de error. */
export type EmailKind = "signup" | "recovery";

export const RESEND_COOLDOWN_SECONDS = 60;
const PENDING_EMAIL_KEY = "matchwork-pending-email";
const cooldownKey = (kind: EmailKind) => `matchwork-resend-until:${kind}`;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Segundos que faltan hasta `endAt` (milisegundos epoch); nunca negativo. */
export function secondsRemaining(endAt: number | null, now: number): number {
  if (endAt === null || !Number.isFinite(endAt)) return 0;
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

/** 45 → «0:45», 60 → «1:00». */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function readCooldownEnd(kind: EmailKind, storage: StorageLike | null = safeStorage()): number | null {
  try {
    const raw = storage?.getItem(cooldownKey(kind));
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function startCooldown(kind: EmailKind, now: number = Date.now(), storage: StorageLike | null = safeStorage()): number {
  const endAt = now + RESEND_COOLDOWN_SECONDS * 1000;
  try { storage?.setItem(cooldownKey(kind), String(endAt)); } catch { /* sin sessionStorage el cooldown solo vive en memoria */ }
  return endAt;
}

/** El correo se guarda en sessionStorage y nunca en la URL. */
export function savePendingEmail(email: string, storage: StorageLike | null = safeStorage()): void {
  try { storage?.setItem(PENDING_EMAIL_KEY, email.trim()); } catch { /* ignorado */ }
}

export function readPendingEmail(storage: StorageLike | null = safeStorage()): string {
  try { return storage?.getItem(PENDING_EMAIL_KEY) ?? ""; } catch { return ""; }
}

export function clearPendingEmail(storage: StorageLike | null = safeStorage()): void {
  try { storage?.removeItem(PENDING_EMAIL_KEY); } catch { /* ignorado */ }
}

export type EmailErrorLike = { code?: string | null; status?: number | null; message?: string | null } | null | undefined;

/** Mensajes por código, sin revelar si la cuenta existe. */
export function resendErrorMessage(error: EmailErrorLike): string {
  const code = error?.code ?? "";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || error?.status === 429) {
    return "Hiciste muchos intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  if (code === "captcha_failed") return "No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.";
  return "No pudimos enviar el correo. Inténtalo de nuevo.";
}

export type LinkFailure = "expired" | "network";

/** Clasifica el fallo de verifyOtp: enlace vencido, ya usado o inválido frente a problemas de red. */
export function classifyLinkError(error: EmailErrorLike): LinkFailure {
  const code = error?.code ?? "";
  if (code === "otp_expired" || code === "validation_failed" || code === "bad_jwt" || code === "flow_state_not_found" || code === "flow_state_expired") return "expired";
  if (error?.status && error.status >= 400 && error.status < 500) return "expired";
  if (/expired|invalid|not found|already/i.test(error?.message ?? "")) return "expired";
  return "network";
}
