import { ProblemCard } from "@/components/problems/problem-card";
import type { Problem } from "@/types/domain";

export function ProblemGrid({
  problems,
  className = "",
  now,
}: {
  problems: Problem[];
  className?: string;
  now?: number;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 ${className}`}>
      {problems.map((problem) => (
        <ProblemCard key={problem.id} now={now} problem={problem} />
      ))}
    </div>
  );
}
