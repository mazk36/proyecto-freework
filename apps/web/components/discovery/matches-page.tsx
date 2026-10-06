"use client";

import { ArrowRight, Handshake } from "lucide-react";
import { useDemoStore } from "@/components/discovery/demo-store";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/problem-utils";
import { DEMO_COMPANY_ID, DEMO_FREELANCER } from "@/lib/discovery";
import { PROBLEMS } from "@/data/problems";

export function MatchesPage() {
  const store = useDemoStore();
  const visibleMatches = store.matches.filter((match) =>
    store.role === "company"
      ? match.companyId === DEMO_COMPANY_ID
      : match.freelancerId === DEMO_FREELANCER.id,
  );

  return (
    <section className="mx-auto w-full max-w-[1000px] px-5 pb-16 pt-8 sm:px-7 sm:pt-12 lg:px-10">
      <header className="mb-7 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Interés de ambas partes</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">Matches</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Un Match significa que la empresa y el freelancer quieren continuar la conversación. No significa contratación, pago ni contrato.</p>
      </header>
      {visibleMatches.length ? (
        <div className="grid gap-3">
          {visibleMatches.map((match) => {
            const problem = PROBLEMS.find((item) => item.id === match.problemId);
            const proposal = store.proposals.find((item) => item.id === match.proposalId);
            if (!problem || !proposal) return null;
            return (
              <article className="rounded-card border border-accent/20 bg-white p-5 sm:p-6" key={match.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold text-accent"><Handshake aria-hidden="true" className="size-4" />¡Hay Match!</p>
                  <time className="text-xs text-muted-foreground" dateTime={match.createdAt}>{new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(match.createdAt))}</time>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-foreground">{problem.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{problem.company.name} · {proposal.freelancer.name}</p>
                <div className="mt-4 grid gap-3 rounded-xl bg-surface/80 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{proposal.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{proposal.estimatedTimeline} · {formatMoney(proposal.price, proposal.currency)}</p>
                  </div>
                  <ButtonLink className="w-full sm:w-auto" href={`/matches/detail?match=${encodeURIComponent(match.id)}`}>
                    Continuar a negociación <ArrowRight aria-hidden="true" className="size-4" />
                  </ButtonLink>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="grid min-h-[300px] place-items-center rounded-card border border-dashed border-border bg-white px-6 py-10 text-center">
          <div className="max-w-md">
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><Handshake aria-hidden="true" className="size-5" /></span>
            <h2 className="mt-4 text-lg font-semibold text-foreground">Todavía no tienes Matches.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Cuando ambas partes quieran continuar, el Match aparecerá aquí.</p>
            <ButtonLink className="mt-5" href="/discover">Volver a Discover</ButtonLink>
          </div>
        </section>
      )}
    </section>
  );
}
