"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import { ResendEmail } from "@/components/auth/resend-email";
import { readPendingEmail, savePendingEmail } from "@/lib/email-cycle";

const linkClass = "inline-flex min-h-11 items-center text-sm font-medium text-[#D8C4FF] underline decoration-[#8A4DFF]/70 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]";

/** Pantalla posterior al registro con confirmación de correo. Idéntica exista o no la cuenta (no revela nada). */
export function CheckEmailExperience() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setEmail(readPendingEmail());
  }, []);
  useEffect(() => {
    if (email !== null) titleRef.current?.focus();
  }, [email]);

  return (
    <main className="grid min-h-dvh place-items-center overflow-x-hidden bg-[#080D17] p-4 text-[#F8FAFC] sm:p-6">
      <section aria-labelledby="check-email-title" className="auth-enter w-full max-w-[31rem] rounded-[1.5rem] border border-white/10 bg-[#0D1117] p-5 shadow-[0_32px_100px_rgba(0,0,0,0.48)] sm:p-8">
        <Link aria-label="MatchWork, ir al inicio" className="mb-6 inline-flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D1117]" href="/">
          <MatchWorkLogoLockup size="large" variant="reversed" />
        </Link>

        <div aria-hidden="true" className="auth-icon-spring mx-auto grid size-[72px] place-items-center rounded-full bg-[#7940e8]/20 text-[#D8C4FF]">
          <Mail className="size-8" />
        </div>
        <h1 className="mt-5 text-center font-display text-2xl font-semibold leading-tight tracking-[-0.04em] outline-none sm:text-3xl" id="check-email-title" ref={titleRef} tabIndex={-1}>
          Revisa tu correo
        </h1>

        {email ? (
          <>
            <p className="mt-3 text-center text-base leading-6 text-[#B6C1D0]">
              Te enviamos un enlace de confirmación a <strong className="break-all font-medium text-[#F8FAFC]">{email}</strong>. Ábrelo para activar tu cuenta.
            </p>
            <p className="mt-3 text-center text-sm leading-5 text-[#B6C1D0]">Puede tardar un par de minutos. Mira también en spam o correo no deseado.</p>
          </>
        ) : email === "" ? (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              savePendingEmail(draft);
              setEmail(draft.trim());
            }}
          >
            <p className="text-center text-base leading-6 text-[#B6C1D0]">Escribe el correo con el que te registraste para poder reenviarte el enlace de confirmación.</p>
            <label className="block text-sm font-medium" htmlFor="check-email-input">Correo electrónico</label>
            <input
              autoComplete="email"
              className="min-h-11 w-full rounded-xl border border-white/10 bg-[#161B22] px-4 py-2.5 text-base text-[#F8FAFC] outline-none placeholder:text-[#9BA7B6] focus-visible:ring-2 focus-visible:ring-[#8A4DFF]"
              id="check-email-input"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="correo@ejemplo.com"
              required
              type="email"
              value={draft}
            />
            <button className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#7940e8] px-5 py-2.5 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]" type="submit">Continuar</button>
          </form>
        ) : null}

        {email ? <ResendEmail className="mt-5" email={email} kind="signup" /> : null}

        <div className="mt-3 flex flex-col items-start gap-1">
          <Link className={linkClass} href="/registro/#correo-nuevo">Usar otro correo</Link>
          <Link className={linkClass} href="/iniciar-sesion">¿Ya confirmaste? Inicia sesión</Link>
          <p className="text-sm leading-5 text-[#9BA7B6]">¿Ya tenías cuenta con este correo? <Link className="font-medium text-[#D8C4FF] underline underline-offset-4" href="/iniciar-sesion">Inicia sesión.</Link></p>
        </div>
      </section>
    </main>
  );
}
