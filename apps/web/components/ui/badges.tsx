import type { ProblemStatus } from "@/types/domain";

export function Hashtag({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <span aria-hidden="true" className="mr-0.5 text-accent">
        #
      </span>
      {tag}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProblemStatus }) {
  const label = status === "open" ? "Recibiendo propuestas" : "En revisión";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${status === "open" ? "bg-accent" : "bg-muted-foreground/55"}`}
      />
      {label}
    </span>
  );
}
