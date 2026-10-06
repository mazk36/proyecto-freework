"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Check, Handshake } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/problem-utils";
import type { Match, Problem, SolutionProposal } from "@/types/domain";

export function MatchExperience({
  match,
  problem,
  proposal,
  onClose,
}: {
  match: Match | null;
  problem: Problem | undefined;
  proposal: SolutionProposal | undefined;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (match && !dialog.open) dialog.showModal();
    if (!match && dialog.open) dialog.close();
  }, [match]);

  return (
    <dialog
      aria-labelledby="match-heading"
      className="m-auto max-h-[90dvh] w-[calc(100%-1.25rem)] max-w-xl overflow-y-auto rounded-[26px] border border-border bg-white p-0 text-foreground shadow-2xl backdrop:bg-black/50"
      onClose={onClose}
      ref={dialogRef}
    >
      {match && problem && proposal ? (
        <div className="p-6 sm:p-8">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Handshake aria-hidden="true" className="size-7" />
          </div>
          <p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.15em] text-accent">Interés de ambas partes</p>
          <h2 className="mt-2 text-center text-3xl font-semibold tracking-[-0.05em]" id="match-heading">¡Hay Match!</h2>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-muted-foreground">
            Ambos quieren seguir adelante con esta solución. Pueden continuar a la negociación cuando esté habilitada.
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-background p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Problema</p>
            <p className="mt-1.5 text-sm font-semibold text-foreground">{problem.title}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Empresa</p>
                <p className="mt-1 font-medium">{problem.company.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Freelancer</p>
                <p className="mt-1 font-medium">{proposal.freelancer.name}</p>
              </div>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Solución</p>
              <p className="mt-1 text-sm font-semibold">{proposal.title}</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{formatMoney(proposal.price, proposal.currency)} · {proposal.estimatedTimeline}</p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
            Crear un Match no significa contratación, pago ni contrato.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <ButtonLink className="flex-1" href={`/matches/detail?match=${encodeURIComponent(match.id)}`}>
              Continuar a negociación <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink className="flex-1" href="/matches" variant="outline">
              Ver Matches <Check aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
          <button className="mt-3 min-h-10 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={onClose} type="button">
            Seguir revisando soluciones
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
