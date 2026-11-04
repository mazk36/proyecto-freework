"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTurnstile } from "@/components/auth/turnstile-field";
import { resendEmail } from "@/lib/auth-email-service";
import {
  formatCountdown, readCooldownEnd, resendErrorMessage, secondsRemaining, startCooldown, type EmailKind,
} from "@/lib/email-cycle";

/** Cuenta atrás persistente (sessionStorage con la hora de fin). Se actualiza cada segundo y se reanuda tras recargar. */
export function useCooldown(kind: EmailKind) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setEndAt(readCooldownEnd(kind));
    setNow(Date.now());
  }, [kind]);

  const remaining = secondsRemaining(endAt, now);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  const start = useCallback(() => {
    const end = startCooldown(kind);
    setEndAt(end);
    setNow(Date.now());
  }, [kind]);

  return { remaining, start };
}

const toneClasses = {
  dark: "border border-white/15 bg-white/[0.06] text-[#F8FAFC] hover:bg-white/10 focus-visible:ring-[#8A4DFF] disabled:text-[#B6C1D0]",
  app: "border border-border bg-transparent text-foreground hover:border-foreground/30 hover:bg-surface focus-visible:ring-accent disabled:text-muted-foreground",
} as const;

/**
 * Botón de reenvío con cooldown de 60 s. El estado se anuncia en un aria-live educado, pero la cuenta atrás
 * NO se anuncia cada segundo: solo al empezar y al terminar.
 */
export function ResendEmail({ kind, email, tone = "dark", className = "" }: { kind: EmailKind; email: string; tone?: keyof typeof toneClasses; className?: string }) {
  const captcha = useTurnstile();
  const { remaining, start } = useCooldown(kind);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const wasCounting = useRef(false);

  useEffect(() => {
    if (remaining > 0 && !wasCounting.current) { wasCounting.current = true; setAnnouncement("Podrás reenviar el correo en 1 minuto."); }
    if (remaining === 0 && wasCounting.current) { wasCounting.current = false; setAnnouncement("Ya puedes reenviar el correo."); }
  }, [remaining]);

  async function handleClick() {
    setSending(true);
    setFeedback(null);
    const { error } = await resendEmail(kind, email, captcha.token);
    captcha.reset();
    setSending(false);
    if (error) {
      setFeedback({ kind: "error", text: resendErrorMessage(error) });
      if (error.code === "over_email_send_rate_limit" || error.status === 429) start();
      return;
    }
    setFeedback({ kind: "ok", text: "Te enviamos otro correo." });
    start();
  }

  const counting = remaining > 0;
  const disabled = sending || counting || !email.trim() || !captcha.ready;
  return (
    <div className={className}>
      {captcha.field}
      <button
        aria-describedby="resend-status"
        className={`flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-2.5 text-base font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-80 ${toneClasses[tone]}`}
        disabled={disabled}
        onClick={() => { void handleClick(); }}
        type="button"
      >
        {sending ? "Enviando…" : counting ? `Reenviar en ${formatCountdown(remaining)}` : "Reenviar correo"}
      </button>
      <div aria-live="polite" className="mt-2 min-h-5 text-sm" id="resend-status" role="status">
        {feedback ? <span className={feedback.kind === "ok" ? (tone === "dark" ? "text-emerald-200" : "text-emerald-800") : (tone === "dark" ? "text-rose-200" : "text-rose-700")}>{feedback.text}</span> : null}
        <span className="sr-only">{announcement}</span>
      </div>
    </div>
  );
}
