"use client";

import { Sparkles, X } from "lucide-react";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, ButtonLink } from "@/components/ui/button";

export function MatchCelebration({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const reducedMotion = useReducedMotion();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!mounted) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.focus();

    function focusable() {
      return Array.from(panel!.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"))
        .filter((element) => element.getClientRects().length > 0);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      } else if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) { event.preventDefault(); panel!.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    function keepFocus(event: FocusEvent) {
      if (event.target instanceof Node && !panel!.contains(event.target)) panel!.focus();
    }
    document.addEventListener("keydown", handleKey, true);
    document.addEventListener("focusin", keepFocus, true);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      document.removeEventListener("focusin", keepFocus, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
      else document.getElementById("inbox-heading")?.focus();
    };
  }, [mounted]);

  if (!mounted) return null;
  const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
  return createPortal(<MotionConfig reducedMotion="user">
    <div className="ui-portal fixed inset-0 z-[110] grid place-items-center overflow-y-auto p-4">
      <motion.div animate={{ opacity: 1 }} aria-hidden="true" className="fixed inset-0 bg-black/75" initial={{ opacity: 0 }} onClick={() => closeRef.current()} transition={{ duration: 0.18 }} />
      <motion.section animate={{ opacity: 1 }} aria-describedby={descriptionId} aria-labelledby={titleId} aria-modal="true" className="relative my-auto w-full max-w-md rounded-3xl border border-border bg-surface p-6 text-center text-foreground shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-8" initial={{ opacity: 0 }} ref={panelRef} role="dialog" tabIndex={-1} transition={{ duration: 0.2 }}>
        <button aria-label="Cerrar celebración" className="absolute right-3 top-3 grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => closeRef.current()} type="button"><X aria-hidden="true" className="size-5" /></button>
        <div aria-hidden="true" className="relative mx-auto mt-4 flex h-24 w-44 items-center justify-center gap-10">
          <motion.span animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 15 }} className="size-12 rounded-full border-2 border-brand-lavender bg-accent/30" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }} transition={reducedMotion ? { duration: 0.15 } : spring} />
          <motion.span animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: -15 }} className="size-12 rounded-full border-2 border-brand-lavender bg-accent/30" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 8 }} transition={reducedMotion ? { duration: 0.15 } : spring} />
          <motion.span animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }} className="absolute grid size-9 place-items-center rounded-full bg-accent text-white" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }} transition={reducedMotion ? { duration: 0.15 } : { ...spring, delay: 0.12 }}><Sparkles className="size-5" /></motion.span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl" id={titleId}>Hicieron Match</h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground" id={descriptionId}>Un Match significa interés mutuo para conversar; no es una contratación ni un pago.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center"><ButtonLink href={`/app/chats?match=${encodeURIComponent(matchId)}`}>Abrir chat</ButtonLink><Button onClick={() => closeRef.current()} variant="outline">Seguir revisando</Button></div>
      </motion.section>
    </div>
  </MotionConfig>, document.body);
}
