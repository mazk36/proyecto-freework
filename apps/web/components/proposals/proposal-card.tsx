import { Clock3, UserRound } from "lucide-react";
import type { SolutionProposal } from "@/types/domain";
import { formatMoney } from "@/lib/problem-utils";

export function ProposalCard({ proposal }: { proposal: SolutionProposal }) {
  return (
    <article className="rounded-card border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
            {proposal.freelancer.initials}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {proposal.freelancer.name}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <UserRound aria-hidden="true" className="size-3.5" />
              {proposal.freelancer.description}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground sm:justify-end">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="size-3.5" />
            {proposal.estimatedTimeline}
          </span>
          <span className="rounded-full bg-surface px-3 py-1.5 font-semibold text-foreground">
            {formatMoney(proposal.price, proposal.currency)}
          </span>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
          {proposal.title}
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Cómo resolvería el problema
            </h4>
            <p className="mt-2 text-sm leading-6 text-foreground/85">
              {proposal.approach}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Qué entregaría
            </h4>
            <p className="mt-2 text-sm leading-6 text-foreground/85">
              {proposal.deliverables}
            </p>
          </div>
        </div>
        {proposal.conditions ? (
          <div className="mt-4 rounded-xl bg-surface px-4 py-3">
            <h4 className="text-xs font-semibold text-muted-foreground">
              Condiciones y aclaraciones
            </h4>
            <p className="mt-1 text-sm leading-5 text-foreground/85">
              {proposal.conditions}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
