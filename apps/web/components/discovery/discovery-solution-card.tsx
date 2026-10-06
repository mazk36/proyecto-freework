"use client";

import { Bookmark, Building2, Check, X } from "lucide-react";
import { formatMoney } from "@/lib/problem-utils";
import type { SolutionProposal } from "@/types/domain";

type DiscoverySolutionCardProps = {
  proposal: SolutionProposal;
  problemTitle: string;
  position: number;
  total: number;
  onDismiss: () => void;
  onSave: () => void;
  onInterested: () => void;
};

export function DiscoverySolutionCard({
  proposal,
  problemTitle,
  position,
  total,
  onDismiss,
  onSave,
  onInterested,
}: DiscoverySolutionCardProps) {
  return (
    <article className="mx-auto flex h-full min-h-[min(640px,calc(100dvh-230px))] w-full max-w-[850px] flex-col rounded-[24px] border border-border bg-white p-4 shadow-[0_20px_70px_-52px_rgba(35,25,67,0.5)] sm:p-8 lg:p-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
            <Building2 aria-hidden="true" className="size-3.5" />
            {problemTitle}
          </p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.13em] text-accent">
            Solución {position} de {total}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-muted-foreground">Propuesta privada</span>
      </div>

      <div className="flex flex-1 flex-col justify-center py-5 sm:py-7">
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent sm:size-12">
            {proposal.freelancer.initials}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{proposal.freelancer.name}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{proposal.freelancer.description}</p>
          </div>
        </div>

        <h2 className="text-balance text-[clamp(1.6rem,4vw,2.65rem)] font-semibold leading-[1.08] tracking-[-0.05em] text-foreground">
          {proposal.title}
        </h2>
        <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 sm:gap-6">
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Cómo resolvería el problema</h3>
            <p className="mt-2 text-sm leading-6 text-foreground/85">{proposal.approach}</p>
          </section>
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Qué entregaría</h3>
            <p className="mt-2 text-sm leading-6 text-foreground/85">{proposal.deliverables}</p>
          </section>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-surface/80 p-4 sm:mt-6 sm:gap-6 sm:p-5">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Tiempo estimado</dt>
            <dd className="mt-1.5 text-sm font-semibold text-foreground">{proposal.estimatedTimeline}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Precio</dt>
            <dd className="mt-1.5 text-sm font-semibold text-foreground">{formatMoney(proposal.price, proposal.currency)}</dd>
          </div>
          {proposal.conditions ? (
            <div className="col-span-2 border-t border-border/80 pt-3">
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Condiciones / aclaraciones</dt>
              <dd className="mt-1.5 text-sm leading-5 text-foreground/85">{proposal.conditions}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 sm:gap-3 sm:pt-5">
        <button
          aria-label={`Descartar la propuesta de ${proposal.freelancer.name}`}
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-border px-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:gap-2 sm:text-sm"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />Descartar
        </button>
        <button
          aria-label={`Guardar la propuesta de ${proposal.freelancer.name}`}
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent-soft/50 px-2 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:gap-2 sm:text-sm"
          onClick={onSave}
          type="button"
        >
          <Bookmark aria-hidden="true" className="size-4" />Guardar
        </button>
        <button
          aria-label={`Me interesa la propuesta de ${proposal.freelancer.name}`}
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-accent px-2 text-xs font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:gap-2 sm:text-sm"
          onClick={onInterested}
          type="button"
        >
          <Check aria-hidden="true" className="size-4" />Me interesa
        </button>
      </div>
    </article>
  );
}
