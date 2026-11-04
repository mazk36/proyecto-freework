import { loadSupabaseClient, SUPABASE_CONFIGURATION_MESSAGE } from "@/lib/supabase/client";
import { isPasswordLongEnough, passwordRequirementText, passwordTooShortMessage } from "@/lib/password-policy";

type ErrorLike = { code?: string | null; status?: number | null; message?: string | null } | null | undefined;

export type PasswordChangeFailure = { reauth: true } | { reauth: false; message: string };

/** Valida el formulario antes de llamar a GoTrue; devuelve un mensaje o null. */
export function validatePasswordChange(password: string, confirmation: string): string | null {
  if (!isPasswordLongEnough(password)) return passwordTooShortMessage;
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  return null;
}

/** Traduce el error de GoTrue; `reauth` indica que hay que confirmar con un código enviado al correo. */
export function passwordChangeFailure(error: ErrorLike): PasswordChangeFailure {
  const code = error?.code ?? "";
  if (code === "reauthentication_needed" || code === "reauthentication_not_valid") {
    return code === "reauthentication_not_valid" ? { reauth: false, message: "El código no es válido o ya venció. Pide uno nuevo." } : { reauth: true };
  }
  if (code === "same_password") return { reauth: false, message: "Elige una contraseña distinta a la actual." };
  if (code === "weak_password") return { reauth: false, message: `La contraseña no cumple los requisitos de seguridad. ${passwordRequirementText}` };
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || error?.status === 429) {
    return { reauth: false, message: "Hiciste muchos intentos. Espera unos minutos e inténtalo de nuevo." };
  }
  if (error?.status === 401 || code === "session_not_found" || code === "no_authorization") {
    return { reauth: false, message: "Tu sesión venció. Vuelve a iniciar sesión e inténtalo de nuevo." };
  }
  return { reauth: false, message: "No pudimos actualizar la contraseña. Revisa tu conexión e inténtalo de nuevo." };
}

export async function changePassword(password: string, nonce?: string): Promise<PasswordChangeFailure | null> {
  const client = await loadSupabaseClient();
  if (!client) return { reauth: false, message: SUPABASE_CONFIGURATION_MESSAGE };
  try {
    const { error } = await client.auth.updateUser(nonce ? { password, nonce } : { password });
    return error ? passwordChangeFailure(error) : null;
  } catch {
    return passwordChangeFailure(null);
  }
}

/** Envía al correo el código de reautenticación que GoTrue pide para cambiar la contraseña. */
export async function requestReauthentication(): Promise<string | null> {
  const client = await loadSupabaseClient();
  if (!client) return SUPABASE_CONFIGURATION_MESSAGE;
  try {
    const { error } = await client.auth.reauthenticate();
    if (!error) return null;
    const failure = passwordChangeFailure(error);
    return failure.reauth ? "No pudimos enviar el código." : failure.message;
  } catch {
    return "No pudimos enviar el código. Inténtalo de nuevo.";
  }
}
