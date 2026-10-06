"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw, Settings2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useDemoStore } from "@/components/discovery/demo-store";
import { PROBLEMS } from "@/data/problems";
import { DEMO_COMPANY_ID, selectCompanyProposals } from "@/lib/discovery";

export function ProblemSelector() {
  const store = useDemoStore();
  const problems = PROBLEMS.filter((problem) => problem.company.id === DEMO_COMPANY_ID);

  return (
    <section className="mx-auto w-full max-w-[1000px] px-5 pb-12 pt-8 sm:px-7 sm:pt-12 lg:px-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Para Nova Retail</p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
            ¿Para qué problema quieres revisar soluciones?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Elige una publicación para ver las propuestas privadas que recibió. Cada freelancer solo ve sus propias propuestas.
          </p>
        </div>
        <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/discover/dismissed">
          <RotateCcw aria-hidden="true" className="size-4" />
          Descartadas
        </Link>
      </div>

      <div className="grid gap-3">
        {problems.map((problem) => {
          const proposals = selectCompanyProposals(store.proposals, DEMO_COMPANY_ID, problem.id);
          return (
            <article className="flex flex-col gap-4 rounded-card border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" key={problem.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground/75">{problem.company.name}</span>
                  <span aria-hidden="true">·</span>
                  <span>{proposals.length} {proposals.length === 1 ? "solución" : "soluciones"}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-foreground">{problem.title}</h2>
                <p className="mt-1.5 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">{problem.summary}</p>
              </div>
              <ButtonLink className="w-full sm:w-auto" href={`/company/problems/${problem.id}/solutions/discover`} variant={proposals.length ? "primary" : "outline"}>
                {proposals.length ? "Revisar soluciones" : "Ver problema"}
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{proposals.length}</span>
                <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
            </article>
          );
        })}
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        <ButtonLink href="/company/problems" variant="outline"><Settings2 aria-hidden="true" className="size-4" />Mis problemas</ButtonLink>
        <ButtonLink href="/problems/new" variant="outline">Publicar otro problema</ButtonLink>
      </div>
    </section>
  );
}
