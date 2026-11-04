"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { ResendEmail } from "@/components/auth/resend-email";
import { Button, ButtonLink } from "@/components/ui/button";
import { verifyEmailLink } from "@/lib/auth-email-service";
import { readPendingEmail, savePendingEmail } from "@/lib/email-cycle";
import { isPasswordLongEnough, MIN_PASSWORD_LENGTH, passwordTooShortMessage } from "@/lib/password-policy";
import { loadSupabaseClient } from "@/lib/supabase/client";

type Phase = "verifying" | "success" | "expired" | "network" | "recovery-form";

const inputClass = "mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-base outline-none focus:ring-2 focus:ring-accent/30";

function safeNext(requested: string | null): string {
  return requested?.startsWith("/app/") && !requested.startsWith("//") && !requested.includes("\\") ? requested : "/app";
}

export function AuthCallbackExperience() {
  const router = useRouter();
  const { user, isReady, storageNotice } = useAuth();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>("verifying");
  const [flow, setFlow] = useState<"signup" | "recovery">("signup");
  const [email, setEmail] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const destination = useCallback(() => safeNext(new URLSearchParams(window.location.search).get("next")), []);

  // Canjea el enlace del correo (token_hash). Sin token_hash se conserva el flujo anterior (sesión ya presente en la URL).
  useEffect(() => {
    if (!isReady || started.current) return;
    const params = new URLSearchParams(window.location.search);
    const currentFlow = params.get("flow") === "recovery" ? "recovery" : "signup";
    setFlow(currentFlow);
    setEmail(readPendingEmail());
    const tokenHash = params.get("token_hash");

    if (!tokenHash) {
      started.current = true;
      if (user && params.get("flow") === "oauth") { router.replace(safeNext(params.get("next"))); return; }
      if (user) setPhase(currentFlow === "recovery" ? "recovery-form" : "success");
      else setPhase("expired");
      return;
    }

    started.current = true;
    const type = currentFlow === "recovery" ? "recovery" : params.get("type") === "email" ? "email" : "signup";
    void verifyEmailLink(tokenHash, type).then((outcome) => {
      // El token es de un solo uso: se quita de la URL para que no quede en el historial.
      window.history.replaceState(null, "", `${window.location.pathname}?flow=${currentFlow}${params.get("next") ? `&next=${encodeURIComponent(params.get("next") ?? "")}` : ""}`);
      if (outcome.ok) setPhase(currentFlow === "recovery" ? "recovery-form" : "success");
      else setPhase(outcome.failure === "expired" ? "expired" : "network");
    });
  }, [attempt, isReady, router, user]);

  useEffect(() => {
    if (phase !== "verifying") titleRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "success") return;
    const timer = window.setTimeout(() => router.replace(destination()), 2000);
    return () => window.clearTimeout(timer);
  }, [destination, phase, router]);

  async function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") ?? "");
    const confirmation = String(values.get("confirmation") ?? "");
    if (!isPasswordLongEnough(password)) {
      setPasswordError(passwordTooShortMessage);
      return;
    }
    if (password !== confirmation) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }
    const client = await loadSupabaseClient();
    if (!client) {
      setPasswordError(storageNotice);
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setPasswordNotice("Tu contraseña quedó actualizada. Abriendo MatchWork…");
      router.replace("/app");
    } catch {
      setPasswordError("El enlace pudo vencer. Solicita uno nuevo e inténtalo otra vez.");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  const heading = "text-2xl font-semibold outline-none";
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-5 py-12 text-center">
      <section aria-live="polite" className="auth-enter w-full max-w-md">
        {phase === "verifying" ? (
          <>
            <h1 className={heading} ref={titleRef} tabIndex={-1}>Confirmando tu cuenta…</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{flow === "recovery" ? "Estamos validando el enlace seguro de recuperación." : "Estamos validando el enlace seguro de tu correo."}</p>
            <div aria-hidden="true" className="mx-auto mt-6 size-8 animate-spin rounded-full border-2 border-border border-t-accent motion-reduce:animate-none" />
          </>
        ) : null}

        {phase === "success" ? (
          <>
            <svg aria-hidden="true" className="mx-auto size-16 text-emerald-600" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path className="auth-check-draw" d="M7.5 12.5l3 3 6-6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
            <h1 className={`${heading} mt-5`} ref={titleRef} tabIndex={-1}>¡Cuenta confirmada!</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Ya puedes completar tu perfil.</p>
            <Button className="mt-6 w-full !bg-[#7940e8] !text-white hover:!bg-[#6733ca] sm:w-auto" onClick={() => router.replace(destination())}>Continuar</Button>
          </>
        ) : null}

        {phase === "expired" ? (
          flow === "recovery" ? (
            <>
              <h1 className={heading} ref={titleRef} tabIndex={-1}>Este enlace de recuperación ya no es válido</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Los enlaces caducan y solo se pueden usar una vez. Pide uno nuevo para crear tu contraseña.</p>
              <ButtonLink className="mt-6 w-full !bg-[#7940e8] !text-white hover:!bg-[#6733ca] sm:w-auto" href="/recuperar-contrasena">Pedir otro enlace</ButtonLink>
            </>
          ) : (
            <>
              <h1 className={heading} ref={titleRef} tabIndex={-1}>Este enlace ya no es válido</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Los enlaces caducan y solo se pueden usar una vez. Si pediste un correo nuevo, usa el más reciente. Si ya confirmaste tu cuenta, inicia sesión.</p>
              <div className="mt-6 space-y-3 text-left">
                <label className="block text-sm font-medium" htmlFor="callback-email">Correo electrónico</label>
                <input autoComplete="email" className={inputClass} id="callback-email" onChange={(event) => { setEmail(event.target.value); savePendingEmail(event.target.value); }} placeholder="correo@ejemplo.com" type="email" value={email} />
                <ResendEmail email={email} kind="signup" tone="app" />
                <ButtonLink className="w-full" href="/iniciar-sesion" variant="outline">Iniciar sesión</ButtonLink>
              </div>
            </>
          )
        ) : null}

        {phase === "network" ? (
          <>
            <h1 className={heading} ref={titleRef} tabIndex={-1}>No pudimos confirmar tu cuenta</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">No pudimos confirmar tu cuenta. Revisa tu conexión e inténtalo de nuevo.</p>
            <Button className="mt-6 !bg-[#7940e8] !text-white hover:!bg-[#6733ca]" onClick={() => { started.current = false; setPhase("verifying"); setAttempt((value) => value + 1); }}>Reintentar</Button>
          </>
        ) : null}

        {phase === "recovery-form" ? (
          <>
            <Mail aria-hidden="true" className="mx-auto size-8 text-accent" />
            <h1 className={`${heading} mt-3`} ref={titleRef} tabIndex={-1}>Crea una contraseña nueva</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Elige una contraseña de al menos {MIN_PASSWORD_LENGTH} caracteres para volver a tu cuenta.</p>
            <form className="mt-6 space-y-4 text-left" noValidate onSubmit={handlePasswordUpdate}>
              <div><label className="text-sm font-medium" htmlFor="new-password">Nueva contraseña</label><input autoComplete="new-password" className={inputClass} id="new-password" name="password" required type="password" /></div>
              <div><label className="text-sm font-medium" htmlFor="confirm-new-password">Confirmar contraseña</label><input autoComplete="new-password" className={inputClass} id="confirm-new-password" name="confirmation" required type="password" /></div>
              {passwordError ? <p className="text-sm text-rose-700" role="alert">{passwordError}</p> : null}
              {passwordNotice ? <p className="text-sm text-emerald-800" role="status">{passwordNotice}</p> : null}
              <Button className="w-full !bg-[#7940e8] !text-white hover:!bg-[#6733ca]" disabled={isUpdatingPassword} type="submit">{isUpdatingPassword ? "Actualizando…" : "Actualizar contraseña"}</Button>
            </form>
          </>
        ) : null}

        <p className="mt-6 text-xs text-muted-foreground"><Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/">Volver a MatchWork</Link></p>
      </section>
    </main>
  );
}
