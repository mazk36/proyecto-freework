"use client";

import { useState } from "react";
import { Bookmark, Building2, Clock3, Eye, Lightbulb, SkipForward } from "lucide-react";
import { BudgetDisplay } from "@/components/ui/budget-display";
import { Hashtag } from "@/components/ui/badges";
import { formatRelativeDate } from "@/lib/problem-utils";
import type { Problem } from "@/types/domain";

type DiscoveryProblemCardProps = {
  problem: Problem;
  position: number;
  total: number;
  onPass: () => void;
  onSave: () => void;
  onPropose: () => void;
};

export function DiscoveryProblemCard({
  problem,
  position,
  total,
  onPass,
  onSave,
  onPropose,
}: DiscoveryProblemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `problem-details-${problem.id}`;
  const urgent = problem.urgency === "asap";

  return (
    <article className="mx-auto flex h-full min-h-[min(640px,calc(100dvh-230px))] w-full max-w-[850px] flex-col rounded-[24px] border border-border bg-white p-4 shadow-[0_20px_70px_-52px_rgba(35,25,67,0.5)] sm:p-8 lg:p-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/75">
              <Building2 aria-hidden="true" className="size-3.5" />
              {problem.company.name}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeDate(problem.publishedAt)}</span>
          </div>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.13em] text-accent">
            Problema {position} de {total}
          </p>
        </div>
        {urgent ? (
          <span className="shrink-0 rounded-full bg-[#fff3e7] px-3 py-1.5 text-[11px] font-semibold text-[#8a4a14]">
            Prioridad alta
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-center py-5 sm:py-7">
        <h2 className="max-w-3xl text-balance text-[clamp(1.7rem,4vw,3.15rem)] font-semibold leading-[1.08] tracking-[-0.055em] text-foreground">
          {problem.title}
        </h2>
        <p className="mt-4 max-w-3xl text-pretty text-sm leading-6 text-muted-foreground sm:mt-5 sm:text-base sm:leading-7">
          {problem.summary}
        </p>

        <div aria-label="Áreas relacionadas" className="mt-5 flex flex-wrap gap-2">
          {problem.hashtags.map((tag) => <Hashtag key={tag} tag={tag} />)}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 border-y border-border py-4 sm:mt-7 sm:gap-6 sm:py-5">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Presupuesto</dt>
            <dd className="mt-1.5 text-sm font-semibold text-foreground"><BudgetDisplay budget={problem.budget} /></dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Propuestas recibidas</dt>
            <dd className="mt-1.5 text-sm font-semibold text-foreground">{problem.proposalsCount}</dd>
          </div>
          {urgent ? (
            <div className="col-span-2 flex items-center gap-1.5 text-xs font-medium text-[#8a4a14]">
              <Clock3 aria-hidden="true" className="size-3.5" />
              La empresa quiere empezar lo antes posible
            </div>
          ) : null}
        </dl>

        <div className="mt-4">
          <button
            aria-controls={detailsId}
            aria-expanded={expanded}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-accent hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            <Eye aria-hidden="true" className="size-4" />
            {expanded ? "Ver menos" : "Ver más"}
          </button>
          {expanded ? (
            <div className="mt-3 grid gap-3 rounded-2xl bg-surface/80 p-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4 sm:p-5" id={detailsId}>
              <DetailItem title="Situación actual" text={problem.currentSituation} />
              <DetailItem title="Resultado esperado" text={problem.desiredOutcome} />
              {problem.impact ? <DetailItem title="Impacto" text={problem.impact} /> : null}
              {problem.constraints ? <DetailItem title="Restricciones" text={problem.constraints} /> : null}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Urgencia</p>
                <p className="mt-1.5 text-sm leading-5 text-foreground/85">{urgencyLabel(problem.urgency)}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 sm:gap-3 sm:pt-5">
        <button
          aria-label={`Pasar: ${problem.title}`}
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-border px-2 text-xs font-semibold text-foreground transition-colors hover:border-foreground/25 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:gap-2 sm:text-sm"
          onClick={onPass}
          type="button"
        >
          <SkipForward aria-hidden="true" className="size-4" />
          Pasar
        </button>
        <button
          aria-label={`Guardar: ${problem.title}`}
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent-soft/50 px-2 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:gap-2 sm:text-sm"
          onClick={onSave}
          type="button"
        >
          <Bookmark aria-hidden="true" className="size-4" />
          Guardar
        </button>
        <button
          aria-label={`Proponer solución para: ${problem.title}`}
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-accent px-2 text-xs font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:gap-2 sm:text-sm"
          onClick={onPropose}
          type="button"
        >
          <Lightbulb aria-hidden="true" className="size-4" />
          Proponer solución
        </button>
      </div>
    </article>
  );
}

function DetailItem({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
      <p className="mt-1.5 text-sm leading-5 text-foreground/85">{text}</p>
    </div>
  );
}

function urgencyLabel(urgency: Problem["urgency"]): string {
  const labels: Record<Problem["urgency"], string> = {
    asap: "Lo antes posible",
    "this-month": "Durante este mes",
    "next-months": "En los próximos meses",
    "no-rush": "Sin urgencia definida",
  };
  return labels[urgency];
}
