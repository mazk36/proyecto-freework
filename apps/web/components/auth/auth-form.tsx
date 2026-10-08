"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/auth";

type AuthFormProps = { mode: "login" | "register" };

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30";

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { login, register, isReady, storageNotice } = useAuth();
  const [role, setRole] = useState<UserRole | "">("");
  const [error, setError] = useState("");
  const isRegistration = mode === "register";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");

    if (isRegistration) {
      const name = String(values.get("name") ?? "").trim();
      const confirmation = String(values.get("confirmation") ?? "");
      if (password !== confirmation) {
        setError("Las contraseñas no coinciden.");
        return;
      }
      if (!role) {
        setError("Selecciona si tu cuenta será de empresa o freelancer.");
        return;
      }
      const result = register({ name, email, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
    } else {
      if (!password) {
        setError("Escribe tu contraseña.");
        return;
      }
      const result = login({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
    }

    router.replace("/app");
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-md">
        <Link aria-label="MatchWork, ir al inicio" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/">
          <MatchWorkLogoLockup preload />
        </Link>
        <section aria-labelledby="auth-title" className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Acceso temporal de desarrollo
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight" id="auth-title">
            {isRegistration ? "Crea tu cuenta" : "Inicia sesión"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isRegistration
              ? "Regístrate en MatchWork y elige tu tipo de cuenta."
              : "Ingresa con el correo que registraste en este navegador."}
          </p>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            {isRegistration ? (
              <div>
                <label className={labelClass} htmlFor="name">Nombre</label>
                <input autoComplete="name" className={inputClass} id="name" maxLength={100} name="name" required />
              </div>
            ) : null}

            <div>
              <label className={labelClass} htmlFor="email">Correo electrónico</label>
              <input autoComplete="email" className={inputClass} id="email" name="email" required type="email" />
            </div>

            <div>
              <label className={labelClass} htmlFor="password">Contraseña</label>
              <input
                autoComplete={isRegistration ? "new-password" : "current-password"}
                className={inputClass}
                id="password"
                minLength={1}
                name="password"
                required
                type="password"
              />
            </div>

            {isRegistration ? (
              <>
                <div>
                  <label className={labelClass} htmlFor="confirmation">Confirmar contraseña</label>
                  <input
                    autoComplete="new-password"
                    className={inputClass}
                    id="confirmation"
                    minLength={1}
                    name="confirmation"
                    required
                    type="password"
                  />
                </div>
                <fieldset>
                  <legend className={labelClass}>Tipo de cuenta</legend>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${role === "company" ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground"}`}>
                      <input checked={role === "company"} className="accent-accent focus-visible:ring-2 focus-visible:ring-accent" name="role" onChange={() => setRole("company")} type="radio" value="company" />
                      Empresa
                    </label>
                    <label className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${role === "freelancer" ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground"}`}>
                      <input checked={role === "freelancer"} className="accent-accent focus-visible:ring-2 focus-visible:ring-accent" name="role" onChange={() => setRole("freelancer")} type="radio" value="freelancer" />
                      Freelancer
                    </label>
                  </div>
                </fieldset>
              </>
            ) : null}

            <p className="text-xs leading-5 text-muted-foreground">
              La contraseña solo se solicita para probar el formulario. No se guarda ni se verifica.
            </p>
            {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
            {storageNotice ? <p className="text-sm text-amber-800" role="status">{storageNotice}</p> : null}

            <Button className="w-full" disabled={!isReady} size="lg" type="submit">
              {isRegistration ? "Crear cuenta" : "Iniciar sesión"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {isRegistration ? "¿Ya tienes cuenta? " : "¿No tienes una cuenta? "}
            <Link className="font-semibold text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href={isRegistration ? "/iniciar-sesion" : "/registro"}>
              {isRegistration ? "Inicia sesión" : "Regístrate"}
            </Link>
          </p>
        </section>
        <p className="mt-10 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
          Esta autenticación es una simulación frontend. No protege información ni reemplaza una sesión validada en servidor.
        </p>
      </div>
    </main>
  );
}
