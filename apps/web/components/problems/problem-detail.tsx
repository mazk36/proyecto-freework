import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Info,
} from "lucide-react";
import Link from "next/link";
import { ProposalBoard } from "@/components/proposals/proposal-board";
import { BudgetDisplay } from "@/components/ui/budget-display";
import { Hashtag, StatusBadge } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/problem-utils";
import type { Problem, SolutionProposal } from "@/types/domain";

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: string | undefined;
}) {
  if (!children) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{children}</p>
    </section>
  );
}

function urgencyLabel(urgency: Problem["urgency"]): string {
  const labels: Record<Problem["urgency"], string> = {
    asap: "Lo antes posible",
    "this-month": "Durante este mes",
    "next-months": "En los próximos meses",
    "no-rush": "Sin urgencia",
  };
  return labels[urgency];
}

export function ProblemDetail({
  problem,
  proposals,
}: {
  problem: Problem;
  proposals: SolutionProposal[];
}) {
  const date = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(problem.publishedAt));

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 pb-16 pt-8 sm:px-7 sm:pb-20 sm:pt-10 lg:px-10">
      <Link
        className="mb-7 inline-flex min-h-10 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        href="/problems"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a problemas
      </Link>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-12">
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge status={problem.status} />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              Publicado el {date}
            </span>
          </div>
          <h1 className="mt-5 max-w-4xl text-balance text-3xl font-semibold leading-[1.12] tracking-[-0.05em] text-foreground sm:text-4xl lg:text-5xl">
            {problem.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-foreground ring-1 ring-border">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            <span>
              <strong className="font-semibold text-foreground">{problem.company.name}</strong>
              <span className="mx-1.5 text-border">·</span>
              {problem.company.industry}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <Clock3 aria-hidden="true" className="size-3.5" />
              {formatRelativeDate(problem.publishedAt)}
            </span>
          </div>
          <div aria-label="Áreas relacionadas" className="mt-5 flex flex-wrap gap-2">
            {problem.hashtags.map((tag) => <Hashtag key={tag} tag={tag} />)}
          </div>

          <section className="mt-8 rounded-card border border-border bg-white p-5 sm:p-8">
            <p className="mb-6 text-xs font-bold uppercase tracking-[0.14em] text-accent">
              El contexto importa
            </p>
            <div className="space-y-6">
              <DetailSection title="El problema" children={problem.summary} />
              <DetailSection title="Situación actual" children={problem.currentSituation} />
              <DetailSection title="Resultado esperado" children={problem.desiredOutcome} />
              <DetailSection title="A quién afecta" children={problem.impact} />
              <DetailSection title="Restricciones" children={problem.constraints} />
            </div>
          </section>

          <section className="mt-10 scroll-mt-28" id="propuestas">
            <div className="mb-5 flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Distintas maneras de abordarlo</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
                Soluciones propuestas
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Compara el enfoque, los entregables, el tiempo y el precio de cada propuesta. No hay una solución técnica predefinida.
              </p>
            </div>
            <ProposalBoard initialProposals={proposals} />
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-[100px]">
          <section className="rounded-card border border-border bg-white p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Presupuesto
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              <BudgetDisplay budget={problem.budget} />
            </p>
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Cuándo comenzar
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock3 aria-hidden="true" className="size-4 text-accent" />
                {urgencyLabel(problem.urgency)}
              </p>
            </div>
            <a
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              href="#propuestas"
            >
              Proponer una solución
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </section>

          <section className="rounded-card border border-accent/15 bg-accent-soft/55 p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-accent">
                <Info aria-hidden="true" className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Datos de demostración</h2>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  Esta publicación y sus propuestas son ficticias. Los formularios no envían ni almacenan información.
                </p>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 border-t border-accent/10 pt-4 text-xs text-muted-foreground">
              <Check aria-hidden="true" className="size-4 shrink-0 text-accent" />
              Una vista pública para comparar enfoques
            </p>
          </section>

          <ButtonLink href="/problems" variant="outline" className="w-full">
            Explorar otros problemas
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}
