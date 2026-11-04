import { getAbsoluteSiteUrl, loadSupabaseClient, SUPABASE_CONFIGURATION_MESSAGE } from "@/lib/supabase/client";

/** El botón de Google solo se muestra con NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true (apagado por defecto). */
export function isGoogleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED?.trim().toLowerCase() === "true";
}

export const googleCallbackUrl = (next?: string) =>
  getAbsoluteSiteUrl(`/auth/callback/?flow=oauth${next && next !== "/app" ? `&next=${encodeURIComponent(next)}` : ""}`);

/** Redirige a Google; al volver, /auth/callback/ abre la sesión y continúa en `next`. Devuelve un mensaje si falla. */
export async function startGoogleSignIn(next?: string): Promise<string | null> {
  const client = await loadSupabaseClient();
  if (!client) return SUPABASE_CONFIGURATION_MESSAGE;
  try {
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: googleCallbackUrl(next) } });
    return error ? "No pudimos conectar con Google. Inténtalo de nuevo o usa tu correo." : null;
  } catch {
    return "No pudimos conectar con Google. Revisa tu conexión e inténtalo de nuevo.";
  }
}
