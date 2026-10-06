"use client";

import { ArrowDown, MessageSquareText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProposalCard } from "@/components/proposals/proposal-card";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { Button } from "@/components/ui/button";
import type { SolutionProposal } from "@/types/domain";

export function ProposalBoard({
  initialProposals,
}: {
  initialProposals: SolutionProposal[];
}) {
  const [proposals, setProposals] = useState(initialProposals);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formOpen) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [formOpen]);

  function addProposal(proposal: SolutionProposal) {
    setProposals((current) => [proposal, ...current]);
    setFormOpen(false);
    setNotice("La propuesta se añadió a esta vista de demostración.");
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText aria-hidden="true" className="size-4 text-accent" />
            {proposals.length} {proposals.length === 1 ? "propuesta" : "propuestas"}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            Todas las propuestas visibles en esta demostración son públicas.
          </p>
        </div>
        {!formOpen ? (
          <Button onClick={() => setFormOpen(true)}>
            Proponer una solución
            <ArrowDown aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>

      {notice ? (
        <p className="mb-4 rounded-xl border border-accent/20 bg-accent-soft/60 px-4 py-3 text-sm text-foreground" role="status">
          {notice}
        </p>
      ) : null}

      {formOpen ? (
        <div className="mb-5 scroll-mt-28" ref={formRef}>
          <ProposalForm onCancel={() => setFormOpen(false)} onSubmit={addProposal} />
        </div>
      ) : null}

      {proposals.length ? (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      ) : (
        <section className="rounded-card border border-dashed border-border bg-white px-5 py-10 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-surface text-muted-foreground">
            <MessageSquareText aria-hidden="true" className="size-5" />
          </span>
          <h3 className="mt-4 font-semibold text-foreground">Todavía no hay propuestas</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Puedes ser la primera persona en plantear una forma de abordar este problema.
          </p>
        </section>
      )}
    </div>
  );
}
