"use client";

import { useTurnstile } from "@/components/auth/turnstile-field";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ResendEmail } from "@/components/auth/resend-email";
import { readPendingEmail, savePendingEmail, startCooldown } from "@/lib/email-cycle";
import { useAuth } from "@/components/auth/auth-provider";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";

export function PasswordRecoveryExperience() {
  const { requestPasswordReset, isReady, storageNotice } = useAuth();
  const captcha = useTurnstile();
  const [error, setError] = useState("");
  const [prefill, setPrefill] = useState("");
  useEffect(() => { setPrefill(readPendingEmail()); }, []);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const sentTitleRef = useRef<HTMLHeadingElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sentTo) sentTitleRef.current?.focus();
  }, [sentTo]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const result = await requestPasswordReset(email, captcha.token);
    captcha.reset();
    if (result.ok) {
      startCooldown("recovery");
      savePendingEmail(email);
      setSentTo(email);
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
          className="mb-6 inline-flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D1117]"
          href="/"
        >
          <MatchWorkLogoLockup preload size="large" variant="reversed" />
        </Link>

        {sentTo ? (
          <div className="auth-enter">
            <div aria-hidden="true" className="auth-icon-spring mx-auto grid size-[72px] place-items-center rounded-full bg-[#7940e8]/20 text-[#D8C4FF]">
              <Mail className="size-8" />
            </div>
            <h1 className="mt-5 text-center font-display text-2xl font-semibold leading-tight tracking-[-0.04em] outline-none sm:text-3xl" id="recovery-title" ref={sentTitleRef} tabIndex={-1}>
              Revisa tu correo
            </h1>
            <p className="mt-3 text-center text-base leading-6 text-[#B6C1D0]">Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva.</p>
            <p className="mt-3 text-center text-sm leading-5 text-[#B6C1D0]">Puede tardar un par de minutos. Mira también en spam o correo no deseado.</p>
            <ResendEmail className="mt-5" email={sentTo} kind="recovery" />
          </div>
        ) : (
          <>
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
                    defaultValue={prefill}
                  id="recovery-email"
                  key={prefill}
                    name="email"
                    placeholder="correo@ejemplo.com"
                    required
                    type="email"
                  />
                </div>
              </div>

              {captcha.field}

              <button
                className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#7940e8] px-5 py-2.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                disabled={!captcha.ready}
                type="submit"
              >
                {isSubmitting ? "Enviando…" : "Enviar enlace de recuperación"}
              </button>
            </fieldset>
            {error ? <p className="text-sm text-rose-200" role="alert">{error}</p> : null}
            
          </form>

          </>
        )}

        <Link
          className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#D8C4FF] underline decoration-[#8A4DFF]/70 underline-offset-4 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF]"
          href="/iniciar-sesion"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}
