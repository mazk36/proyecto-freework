"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Bookmark, Compass, RotateCcw, SlidersHorizontal } from "lucide-react";
import { DiscoveryProblemCard } from "@/components/discovery/discovery-problem-card";
import { ProposalComposer } from "@/components/discovery/proposal-composer";
import { useDemoStore } from "@/components/discovery/demo-store";
import { ButtonLink } from "@/components/ui/button";
import { PROBLEMS } from "@/data/problems";
import { rankProblemsForFreelancer } from "@/lib/discovery";
import type { ProposalDraft } from "@/types/domain";

export function DiscoveryFeed() {
  const router = useRouter();
  const store = useDemoStore();
  const [composerProblemId, setComposerProblemId] = useState<string | null>(null);
  const rankedProblems = useMemo(
    () => rankProblemsForFreelancer(PROBLEMS, store.problemInteractions, store.preferences),
    [store.problemInteractions, store.preferences],
  );
  const composerProblem = PROBLEMS.find((problem) => problem.id === composerProblemId) ?? null;

  function submitProposal(problemId: string, draft: ProposalDraft): string | null {
    return store.submitProposal(problemId, draft);
  }

  return (
    <section className="mx-auto flex w-full max-w-[1100px] flex-col px-4 pb-8 pt-4 sm:px-7 sm:pt-6 lg:px-10">
      <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">Para ti</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-foreground sm:text-3xl">Discover</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-3" href="/discover/preferences">
            <SlidersHorizontal aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Preferencias</span>
          </Link>
          <Link className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-3" href="/discover/dismissed">
            <RotateCcw aria-hidden="true" className="size-3.5" />
            <span>Descartados</span>
          </Link>
        </div>
      </div>

      {rankedProblems.length ? (
        <div
          aria-label="Oportunidades para descubrir"
          className="h-[calc(100dvh-210px)] min-h-[460px] snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth pb-2"
          role="region"
          tabIndex={0}
        >
          {rankedProblems.map((problem, index) => (
            <div className="flex h-[calc(100dvh-210px)] min-h-[460px] snap-start items-stretch py-1" key={problem.id}>
              <DiscoveryProblemCard
                onPass={() => store.setProblemInteraction(problem.id, "dismissed")}
                onPropose={() => setComposerProblemId(problem.id)}
                onSave={() => store.setProblemInteraction(problem.id, "saved")}
                position={index + 1}
                problem={problem}
                total={rankedProblems.length}
              />
            </div>
          ))}
        </div>
      ) : (
        <section className="grid min-h-[min(580px,calc(100dvh-220px))] place-items-center rounded-[24px] border border-dashed border-border bg-white px-6 py-10 text-center">
          <div className="max-w-md">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Compass aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Ya viste todas las oportunidades disponibles.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Revisa los problemas que pasaste, ajusta tus preferencias o explora todo el catálogo.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <ButtonLink href="/discover/dismissed" variant="outline">
                <Bookmark aria-hidden="true" className="size-4" />
                Revisar descartados
              </ButtonLink>
              <ButtonLink href="/discover/preferences" variant="outline">Cambiar preferencias</ButtonLink>
              <ButtonLink href="/problems">
                Explorar todos <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      <ProposalComposer
        onClose={() => setComposerProblemId(null)}
        onSubmit={submitProposal}
        onSubmitted={() => {
          setComposerProblemId(null);
          router.push("/proposals");
        }}
        problem={composerProblem}
      />
    </section>
  );
}
