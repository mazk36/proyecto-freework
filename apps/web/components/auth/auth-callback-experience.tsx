"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { ButtonLink } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

export function AuthCallbackExperience() {
  const router = useRouter();
  const { user, isReady, storageNotice, authIssue } = useAuth();
  const [failed, setFailed] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const recoveryFlow = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("flow") === "recovery";

  useEffect(() => {
    if (!isReady) return;
    if (user && recoveryFlow) return;
    if (user) {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("next");
      const safeNext = requested?.startsWith("/app/") && !requested.startsWith("//") && !requested.includes("\\")
        ? requested
        : "/app";
      router.replace(safeNext);
      return;
    }
    setFailed(true);
  }, [authIssue, isReady, recoveryFlow, router, storageNotice, user]);

  async function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") ?? "");
    const confirmation = String(values.get("confirmation") ?? "");
    if (password.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }
    const client = getSupabaseClient();
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

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-5 py-12 text-center">
      <section>
        {recoveryFlow && user ? (
          <>
            <h1 className="text-2xl font-semibold">Crea una contraseña nueva</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Elige una contraseña de al menos 8 caracteres para volver a tu cuenta.</p>
            <form className="mt-6 space-y-4 text-left" onSubmit={handlePasswordUpdate}>
              <div><label className="text-sm font-medium" htmlFor="new-password">Nueva contraseña</label><input autoComplete="new-password" className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-base outline-none focus:ring-2 focus:ring-accent/30" id="new-password" minLength={8} name="password" required type="password" /></div>
              <div><label className="text-sm font-medium" htmlFor="confirm-new-password">Confirmar contraseña</label><input autoComplete="new-password" className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-base outline-none focus:ring-2 focus:ring-accent/30" id="confirm-new-password" minLength={8} name="confirmation" required type="password" /></div>
              {passwordError ? <p className="text-sm text-rose-700" role="alert">{passwordError}</p> : null}
              {passwordNotice ? <p className="text-sm text-emerald-800" role="status">{passwordNotice}</p> : null}
              <button className="min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isUpdatingPassword} type="submit">{isUpdatingPassword ? "Actualizando…" : "Actualizar contraseña"}</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{failed ? "No pudimos confirmar tu cuenta" : "Confirmando tu cuenta…"}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {failed ? (authIssue || storageNotice || "El enlace ya venció o no es válido.") : "Estamos validando el enlace seguro de tu correo."}
            </p>
            {failed ? <ButtonLink className="mt-6" href="/iniciar-sesion">Ir a iniciar sesión</ButtonLink> : <p className="mt-6 text-sm text-muted-foreground" role="status">Espera un momento…</p>}
          </>
        )}
        <p className="mt-6 text-xs text-muted-foreground"><Link className="underline underline-offset-4" href="/">Volver a MatchWork</Link></p>
      </section>
    </main>
  );
}
