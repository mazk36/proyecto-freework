import { formatBudget } from "@/lib/problem-utils";
import type { ProblemBudget } from "@/types/domain";

export function BudgetDisplay({ budget }: { budget: ProblemBudget }) {
  return <span>{formatBudget(budget)}</span>;
}
