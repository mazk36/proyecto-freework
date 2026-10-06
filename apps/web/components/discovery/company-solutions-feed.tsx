"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { DiscoverySolutionCard } from "@/components/discovery/discovery-solution-card";
import { MatchExperience } from "@/components/discovery/match-experience";
import { useDemoStore } from "@/components/discovery/demo-store";
import { ButtonLink } from "@/components/ui/button";
import { PROBLEMS } from "@/data/problems";
import { DEMO_COMPANY_ID, selectCompanyProposals } from "@/lib/discovery";
import type { Match } from "@/types/domain";

export function CompanySolutionsFeed({ problemId }: { problemId: string }) {
  const store = useDemoStore();
  const [celebrationMatch, setCelebrationMatch] = useState<Match | null>(null);
  const problem = PROBLEMS.find(
    (item) => item.id === problemId && item.company.id === DEMO_COMPANY_ID,
  );
  const companyProposals = useMemo(
    () => selectCompanyProposals(store.proposals, DEMO_COMPANY_ID, problemId),
    [store.proposals, problemId],
  );
  const eligibleProposals = companyProposals.filter(
    (proposal) =>
      (!store.proposalInteractions[proposal.id] || store.proposalInteractions[proposal.id] === "unseen") &&
      !store.matches.some((match) => match.proposalId === proposal.id),
  );
  const matchProposal = celebrationMatch
    ? store.proposals.find((proposal) => proposal.id === celebrationMatch.proposalId)
    : undefined;
  const matchProblem = celebrationMatch
    ? PROBLEMS.find((item) => item.id === celebrationMatch.problemId)
    : undefined;

  if (!problem) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-2xl font-semibold">No encontramos ese problema de empresa</h1>
        <ButtonLink className="mt-5" href="/company/problems" variant="outline">Volver a mis problemas</ButtonLink>
      </section>
    );
  }

  if (store.role !== "company") {
    return (
      <section className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Vista de empresa</p>
        <h1 className="mt-2 text-2xl font-semibold">Cambia el rol de demo para revisar soluciones</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Usa el selector de rol en la parte superior y vuelve a elegir el problema que quieres revisar.</p>
        <ButtonLink className="mt-5" href="/discover" variant="outline">Ir a Discover</ButtonLink>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[1100px] flex-col px-4 pb-8 pt-4 sm:px-7 sm:pt-6 lg:px-10">
      <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
        <div className="min-w-0">
          <Link className="mb-1 inline-flex min-h-8 items-center gap-1 rounded-lg pr-2 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/discover">
            <ArrowLeft aria-hidden="true" className="size-3.5" />Elegir otro problema
          </Link>
          <h1 className="line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.04em] text-foreground sm:text-2xl">{problem.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Soluciones privadas · {companyProposals.length} recibidas</p>
        </div>
        <Link className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-3" href="/discover/dismissed">
          <RotateCcw aria-hidden="true" className="size-3.5" />Descartadas
        </Link>
      </div>

      {companyProposals.length === 0 ? (
        <section className="grid min-h-[min(570px,calc(100dvh-220px))] place-items-center rounded-[24px] border border-dashed border-border bg-white px-6 py-10 text-center">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold text-foreground">Aún no has recibido soluciones para este problema.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Las propuestas enviadas a tu empresa aparecerán aquí para que las revises una por una.</p>
            <ButtonLink className="mt-5" href="/company/problems" variant="outline">Volver a mis problemas</ButtonLink>
          </div>
        </section>
      ) : eligibleProposals.length ? (
        <div aria-label="Soluciones recibidas" className="h-[calc(100dvh-210px)] min-h-[460px] snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth pb-2" role="region" tabIndex={0}>
          {eligibleProposals.map((proposal, index) => (
            <div className="flex h-[calc(100dvh-210px)] min-h-[460px] snap-start items-stretch py-1" key={proposal.id}>
              <DiscoverySolutionCard
                onDismiss={() => store.setProposalInteraction(proposal.id, "dismissed")}
                onInterested={() => {
                  const match = store.markProposalInterested(proposal.id);
                  if (match) setCelebrationMatch(match);
                }}
                onSave={() => store.setProposalInteraction(proposal.id, "saved")}
                position={index + 1}
                problemTitle={problem.title}
                proposal={proposal}
                total={eligibleProposals.length}
              />
            </div>
          ))}
        </div>
      ) : (
        <section className="grid min-h-[min(570px,calc(100dvh-220px))] place-items-center rounded-[24px] border border-dashed border-border bg-white px-6 py-10 text-center">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold text-foreground">Ya revisaste todas las soluciones disponibles.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Puedes volver a evaluar las que guardaste o revisar las propuestas descartadas.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <ButtonLink href="/saved" variant="outline">Ver guardadas</ButtonLink>
              <ButtonLink href="/discover/dismissed" variant="outline">Ver descartadas</ButtonLink>
              <ButtonLink href="/company/problems">Elegir problema</ButtonLink>
            </div>
          </div>
        </section>
      )}

      <MatchExperience
        match={celebrationMatch}
        onClose={() => setCelebrationMatch(null)}
        problem={matchProblem}
        proposal={matchProposal}
      />
    </section>
  );
}
