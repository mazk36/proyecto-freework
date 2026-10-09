"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";

export function PasswordRecoveryExperience() {
  const { requestPasswordReset, isReady, storageNotice } = useAuth();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    const values = new FormData(event.currentTarget);
    const result = await requestPasswordReset(String(values.get("email") ?? ""));
    if (result.ok) {
      setNotice("Si el correo está asociado a una cuenta, recibirás un enlace para cambiar la contraseña.");
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <main className="grid min-h-dvh place-items-center overflow-x-hidden bg-[#080D17] p-4 text-[#F8FAFC] sm:p-6">
      <section
        aria-labelledby="recovery-title"
        className="w-full max-w-[31rem] rounded-[1.5rem] border border-white/10 bg-[#0D1117] p-5 shadow-[0_32px_100px_rgba(0,0,0,0.48)] sm:p-8"
      >
        <Link
          aria-label="MatchWork, ir al inicio"
          className="mb-6 inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D1117]"
          href="/"
        >
          <MatchWorkLogoLockup preload size="large" variant="reversed" />
        </Link>

        <h1
          className="font-display text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-3xl"
          id="recovery-title"
        >
          Recupera tu contraseña
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#B6C1D0] sm:text-base">
          Ingresa el correo asociado a tu cuenta para solicitar un enlace seguro de recuperación.
        </p>

        {storageNotice ? <p className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2.5 text-sm leading-5 text-amber-100/90" role="status">{storageNotice}</p> : null}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <fieldset className="space-y-4" disabled={!isReady || isSubmitting || Boolean(storageNotice)}>
            <div>
              <label className="block text-sm font-medium text-[#F8FAFC]" htmlFor="recovery-email">
                Correo electrónico
              </label>
              <div className="relative mt-1.5">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-[#9BA7B6]" />
                <input
                  autoComplete="email"
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-[#161B22] py-2.5 pl-11 pr-4 text-base text-[#F8FAFC] outline-none placeholder:text-[#9BA7B6] disabled:cursor-not-allowed disabled:opacity-60"
                  id="recovery-email"
                  name="email"
                  placeholder="correo@ejemplo.com"
                  required
                  type="email"
                />
              </div>
            </div>

            <button
              className="flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-xl bg-[#8A4DFF] px-5 py-2.5 text-base font-semibold text-white opacity-55"
              type="submit"
            >
              {isSubmitting ? "Enviando…" : "Enviar enlace de recuperación"}
            </button>
          </fieldset>
          {error ? <p className="text-sm text-rose-200" role="alert">{error}</p> : null}
          {notice ? <p className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm leading-5 text-emerald-100" role="status">{notice}</p> : null}
        </form>

        <Link
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#D8C4FF] underline decoration-[#8A4DFF]/70 underline-offset-4 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF]"
          href="/iniciar-sesion"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}
