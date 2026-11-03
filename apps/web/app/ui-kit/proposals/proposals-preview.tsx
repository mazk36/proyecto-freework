"use client";

import { useState } from "react";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import { MyProposals } from "@/components/proposals/my-proposals";
import { ProposalSheet } from "@/components/proposals/proposal-sheet";
import { Button } from "@/components/ui/button";
import { createSampleProposalServices, sampleProblems } from "./sample-data";

async function loadSampleProblems() { return sampleProblems; }

export function ProposalsPreview() {
  const [services] = useState(() => createSampleProposalServices());
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  return <main className="private-app-shell proposals-preview min-h-dvh bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8"><MatchWorkLogoLockup className="w-[6.5rem] sm:w-32" size="compact" variant="reversed" /><span className="rounded-full border border-warning/40 bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">Datos de muestra · sin Supabase</span></div></header>
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-lavender">Vista de muestra</p><h1 className="mt-3 font-display text-3xl font-semibold">Propuestas</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Los cambios son temporales y solo afectan estos datos de muestra.</p></div><Button onClick={() => setOpen(true)}>Abrir borrador de muestra</Button></div><div className="mt-10"><MyProposals key={version} loadProblems={loadSampleProblems} services={services} /></div></div>
    {open ? <ProposalSheet onClose={() => { setOpen(false); setVersion((value) => value + 1); }} onSubmitted={() => setVersion((value) => value + 1)} problem={sampleProblems[1]} services={services} /> : null}
  </main>;
}
