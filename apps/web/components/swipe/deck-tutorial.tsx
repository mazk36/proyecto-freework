"use client";

import { ArrowLeftRight, Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function DeckTutorial({ storageKey }: { storageKey: string }) {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) !== "done") setStep(1);
    } catch {
      setStep(1);
    }
  }, [storageKey]);

  function finish() {
    try { window.localStorage.setItem(storageKey, "done"); } catch { /* Storage may be unavailable. */ }
    setStep(null);
  }

  useEffect(() => {
    if (step === null) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      try { window.localStorage.setItem(storageKey, "done"); } catch { /* Storage may be unavailable. */ }
      setStep(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [step, storageKey]);

  if (step === null) return null;
  const Icon = step === 1 ? ArrowLeftRight : Heart;

  return (
    <section aria-label={`Cómo usar el mazo, paso ${step} de 2`} className="absolute inset-x-3 top-3 z-20 rounded-2xl border border-accent/40 bg-surface-raised p-4 shadow-2xl sm:inset-x-5 sm:top-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-brand-lavender"><Icon aria-hidden="true" className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="font-mono text-xs text-brand-lavender">{step} / 2</p><h2 className="mt-1 font-display text-sm font-semibold">{step === 1 ? "Explora a tu ritmo" : "Guarda lo que te interese"}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{step === 1 ? "Desliza a la izquierda para pasar o a la derecha si el problema te interesa." : "También puedes usar los botones, ver el detalle y deshacer tu última decisión."}</p></div>
        <button aria-label="Cerrar tutorial" className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={finish} type="button"><X aria-hidden="true" className="size-5" /></button>
      </div>
      <div className="mt-3 flex justify-end"><Button onClick={() => step === 1 ? setStep(2) : finish()} size="md">{step === 1 ? "Siguiente" : "Entendido"}</Button></div>
    </section>
  );
}
