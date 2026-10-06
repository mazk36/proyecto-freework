import type { Problem, ProblemBudget } from "@/types/domain";

export type BudgetBucket = "under-500" | "500-1000" | "1000-5000" | "over-5000" | "unknown";
export type BudgetTypeFilter = "fixed" | "range" | "unknown";
export type DateFilter = "24h" | "7d" | "30d";
export type ProposalCountFilter = "0-5" | "6-10" | "11-25" | "25+";
export type ProblemSort = "recent" | "fewest-proposals" | "highest-budget" | "lowest-budget";

export type ProblemFilters = {
  query: string;
  hashtags: string[];
  budget: BudgetBucket | "";
  budgetType: BudgetTypeFilter | "";
  date: DateFilter | "";
  proposals: ProposalCountFilter | "";
  sort: ProblemSort;
};

export const DEFAULT_PROBLEM_FILTERS: ProblemFilters = {
  query: "",
  hashtags: [],
  budget: "",
  budgetType: "",
  date: "",
  proposals: "",
  sort: "recent",
};

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatBudget(budget: ProblemBudget): string {
  if (budget.type === "unknown") return "Sin presupuesto definido";
  if (budget.type === "fixed") return formatMoney(budget.amount, budget.currency);
  return `${formatMoney(budget.min, budget.currency)} – ${formatMoney(budget.max, budget.currency)}`;
}

export function budgetSortValue(budget: ProblemBudget): number | null {
  if (budget.type === "unknown") return null;
  return budget.type === "fixed" ? budget.amount : budget.max;
}

function budgetInterval(budget: ProblemBudget): [number, number] | null {
  if (budget.type === "unknown") return null;
  if (budget.type === "fixed") return [budget.amount, budget.amount];
  return [budget.min, budget.max];
}

function matchesBudgetBucket(budget: ProblemBudget, bucket: BudgetBucket): boolean {
  if (bucket === "unknown") return budget.type === "unknown";
  const interval = budgetInterval(budget);
  if (!interval) return false;

  const [min, max] = interval;
  switch (bucket) {
    case "under-500":
      return min < 500;
    case "500-1000":
      return max >= 500 && min <= 1000;
    case "1000-5000":
      return max >= 1000 && min <= 5000;
    case "over-5000":
      return max > 5000;
  }
}

function matchesProposalCount(count: number, filter: ProposalCountFilter): boolean {
  switch (filter) {
    case "0-5":
      return count <= 5;
    case "6-10":
      return count >= 6 && count <= 10;
    case "11-25":
      return count >= 11 && count <= 25;
    case "25+":
      return count > 25;
  }
}

function matchesDate(publishedAt: string, filter: DateFilter, now: number): boolean {
  const published = Date.parse(publishedAt);
  const duration = filter === "24h" ? 24 : filter === "7d" ? 24 * 7 : 24 * 30;
  return Number.isFinite(published) && published >= now - duration * 60 * 60 * 1000 && published <= now;
}

function searchText(problem: Problem): string {
  return [
    problem.title,
    problem.summary,
    problem.currentSituation,
    problem.desiredOutcome,
    problem.company.name,
    ...problem.hashtags,
  ]
    .join(" ")
    .toLocaleLowerCase("es");
}

export function filterAndSortProblems(
  problems: Problem[],
  filters: ProblemFilters,
  now = Date.now(),
): Problem[] {
  const query = filters.query.trim().toLocaleLowerCase("es");

  const filtered = problems.filter((problem) => {
    if (query && !searchText(problem).includes(query)) return false;
    if (
      filters.hashtags.length > 0 &&
      !filters.hashtags.some((tag) => problem.hashtags.includes(tag))
    ) {
      return false;
    }
    if (filters.budget && !matchesBudgetBucket(problem.budget, filters.budget)) return false;
    if (filters.budgetType && problem.budget.type !== filters.budgetType) return false;
    if (filters.date && !matchesDate(problem.publishedAt, filters.date, now)) return false;
    if (filters.proposals && !matchesProposalCount(problem.proposalsCount, filters.proposals)) {
      return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sort === "fewest-proposals") return a.proposalsCount - b.proposalsCount;
    if (filters.sort === "highest-budget" || filters.sort === "lowest-budget") {
      const aBudget = budgetSortValue(a.budget);
      const bBudget = budgetSortValue(b.budget);
      if (aBudget === null && bBudget !== null) return 1;
      if (aBudget !== null && bBudget === null) return -1;
      if (aBudget === null || bBudget === null) return 0;
      return filters.sort === "highest-budget" ? bBudget - aBudget : aBudget - bBudget;
    }
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}

export function validateBudgetRange(min: number, max: number): boolean {
  return Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max > 0 && min <= max;
}

export function formatRelativeDate(publishedAt: string, now = Date.now()): string {
  const published = Date.parse(publishedAt);
  if (!Number.isFinite(published)) return "Fecha no disponible";
  const hours = Math.max(0, Math.floor((now - published) / (60 * 60 * 1000)));
  if (hours < 1) return "hace menos de 1 h";
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}
