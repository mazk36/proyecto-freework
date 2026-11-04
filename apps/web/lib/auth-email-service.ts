import { captchaOptions } from "@/lib/captcha";
import { loadSupabaseClient, getAbsoluteSiteUrl, SUPABASE_CONFIGURATION_MESSAGE } from "@/lib/supabase/client";
import { classifyLinkError, type EmailErrorLike, type EmailKind, type LinkFailure } from "@/lib/email-cycle";

type AuthApiError = EmailErrorLike & { message?: string };

export const signupCallbackUrl = (next?: string) =>
  getAbsoluteSiteUrl(`/auth/callback/?flow=signup${next && next !== "/app" ? `&next=${encodeURIComponent(next)}` : ""}`);
export const recoveryCallbackUrl = () => getAbsoluteSiteUrl("/auth/callback/?flow=recovery");

/** Reenvía el correo de confirmación o de recuperación. Devuelve el error de GoTrue tal cual (sin revelar si la cuenta existe). */
export async function resendEmail(kind: EmailKind, email: string, captchaToken?: string | null): Promise<{ error: AuthApiError | null }> {
  const client = await loadSupabaseClient();
  if (!client) return { error: { message: SUPABASE_CONFIGURATION_MESSAGE } };
  try {
    if (kind === "signup") {
      const { error } = await client.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: signupCallbackUrl(), ...captchaOptions(captchaToken) } });
      return { error };
    }
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: recoveryCallbackUrl(), ...captchaOptions(captchaToken) });
    return { error };
  } catch (error) {
    return { error: { message: error instanceof Error ? error.message : "network" } };
  }
}

export type VerifyOutcome = { ok: true } | { ok: false; failure: LinkFailure };

/** Canjea el token_hash del correo por una sesión (funciona en cualquier navegador y no lo gastan los escáneres de enlaces). */
export async function verifyEmailLink(tokenHash: string, type: "signup" | "email" | "recovery"): Promise<VerifyOutcome> {
  const client = await loadSupabaseClient();
  if (!client) return { ok: false, failure: "network" };
  try {
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
    return error ? { ok: false, failure: classifyLinkError(error) } : { ok: true };
  } catch {
    return { ok: false, failure: "network" };
  }
}
