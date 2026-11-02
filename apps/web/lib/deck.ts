import type { PublicProblem } from "@/lib/problem-domain";
import type { FreelancerProblemInteraction } from "@/types/domain";

export function selectDeckProblems(
  problems: PublicProblem[],
  interactions: Record<string, FreelancerProblemInteraction>,
): PublicProblem[] {
  const publishedTime = (problem: PublicProblem) => {
    const time = problem.publishedAt ? Date.parse(problem.publishedAt) : NaN;
    return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
  };

  return problems
    .filter((problem) => !interactions[problem.id] || interactions[problem.id] === "unseen")
    .sort((a, b) => publishedTime(b) - publishedTime(a) || a.id.localeCompare(b.id));
}
