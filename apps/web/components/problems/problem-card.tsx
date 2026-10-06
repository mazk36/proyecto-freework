import { ArrowUpRight, Building2, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { BudgetDisplay } from "@/components/ui/budget-display";
import { Hashtag, StatusBadge } from "@/components/ui/badges";
import { formatRelativeDate } from "@/lib/problem-utils";
import type { Problem } from "@/types/domain";

export function ProblemCard({ problem, now }: { problem: Problem; now?: number }) {
  return (
    <article className="group relative flex min-h-[360px] flex-col rounded-card border border-border bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_16px_40px_-28px_rgba(44,32,79,0.32)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-muted-foreground">
            <Building2 aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {problem.company.name}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatRelativeDate(problem.publishedAt, now)}
            </p>
          </div>
        </div>
        <StatusBadge status={problem.status} />
      </div>

      <h3 className="text-pretty text-lg font-semibold leading-6 tracking-[-0.025em] text-foreground sm:text-xl sm:leading-7">
        <Link
          className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-accent"
          href={`/problems/${problem.id}`}
        >
          {problem.title}
        </Link>
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {problem.summary}
      </p>

      <div aria-label="Áreas relacionadas" className="mt-5 flex flex-wrap gap-2">
        {problem.hashtags.slice(0, 3).map((tag) => (
          <Hashtag key={tag} tag={tag} />
        ))}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-4 border-t border-border pt-5 mt-6">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Presupuesto
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            <BudgetDisplay budget={problem.budget} />
          </p>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Propuestas
          </p>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <MessageSquareText aria-hidden="true" className="size-3.5 text-muted-foreground" />
            {problem.proposalsCount}
          </p>
        </div>
      </div>

      <Link
        className="relative z-10 mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
        href={`/problems/${problem.id}`}
      >
        Ver problema
        <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}
