import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROBLEM_FILTERS,
  filterAndSortProblems,
  formatBudget,
  formatRelativeDate,
  validateBudgetRange,
  type ProblemFilters,
} from "@/lib/problem-utils";
import type { Problem } from "@/types/domain";

const NOW = Date.parse("2026-10-06T12:00:00.000Z");

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "problem",
    title: "Errores al preparar pedidos",
    summary: "El equipo repite tareas en cada pedido.",
    currentSituation: "Las tareas se repiten manualmente.",
    desiredOutcome: "Reducir pasos repetidos.",
    hashtags: ["operaciones", "logistica"],
    budget: { type: "fixed", amount: 750, currency: "USD" },
    urgency: "this-month",
    company: { id: "empresa-ejemplo", name: "Empresa de ejemplo", industry: "Servicios" },
    proposalsCount: 3,
    publishedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
    status: "open",
    ...overrides,
  };
}

function filters(overrides: Partial<ProblemFilters> = {}): ProblemFilters {
  return { ...DEFAULT_PROBLEM_FILTERS, ...overrides };
}

describe("filterAndSortProblems", () => {
  it("searches titles, descriptions, and context hashtags without case sensitivity", () => {
    const matching = makeProblem();
    const other = makeProblem({
      id: "other",
      title: "Facturas pendientes",
      summary: "Hay muchos documentos por revisar.",
      hashtags: ["finanzas"],
    });

    expect(filterAndSortProblems([matching, other], filters({ query: "LOGISTICA" }), NOW)).toEqual([
      matching,
    ]);
    expect(filterAndSortProblems([matching, other], filters({ query: "facturas" }), NOW)).toEqual([
      other,
    ]);
  });

  it("filters by selected problem areas and budget types", () => {
    const fixed = makeProblem({ id: "fixed", budget: { type: "fixed", amount: 750, currency: "USD" } });
    const range = makeProblem({ id: "range", budget: { type: "range", min: 1000, max: 2500, currency: "USD" } });
    const unknown = makeProblem({ id: "unknown", budget: { type: "unknown" }, hashtags: ["finanzas"] });

    expect(
      filterAndSortProblems([fixed, range, unknown], filters({ hashtags: ["finanzas"] }), NOW).map(
        (problem) => problem.id,
      ),
    ).toEqual(["unknown"]);
    expect(
      filterAndSortProblems([fixed, range, unknown], filters({ budgetType: "range" }), NOW).map(
        (problem) => problem.id,
      ),
    ).toEqual(["range"]);
  });

  it("filters budget bands and treats an unknown budget as undefined", () => {
    const lower = makeProblem({ id: "lower", budget: { type: "fixed", amount: 400, currency: "USD" } });
    const higher = makeProblem({ id: "higher", budget: { type: "fixed", amount: 6000, currency: "USD" } });
    const unknown = makeProblem({ id: "unknown", budget: { type: "unknown" } });

    expect(filterAndSortProblems([lower, higher, unknown], filters({ budget: "under-500" }), NOW).map((item) => item.id)).toEqual(["lower"]);
    expect(filterAndSortProblems([lower, higher, unknown], filters({ budget: "over-5000" }), NOW).map((item) => item.id)).toEqual(["higher"]);
    expect(filterAndSortProblems([lower, higher, unknown], filters({ budget: "unknown" }), NOW).map((item) => item.id)).toEqual(["unknown"]);
  });

  it("filters by publication recency and proposal count", () => {
    const recent = makeProblem({ id: "recent", proposalsCount: 4, publishedAt: new Date(NOW - 3 * 60 * 60 * 1000).toISOString() });
    const week = makeProblem({ id: "week", proposalsCount: 8, publishedAt: new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString() });
    const old = makeProblem({ id: "old", proposalsCount: 27, publishedAt: new Date(NOW - 40 * 24 * 60 * 60 * 1000).toISOString() });

    expect(filterAndSortProblems([recent, week, old], filters({ date: "24h" }), NOW).map((item) => item.id)).toEqual(["recent"]);
    expect(filterAndSortProblems([recent, week, old], filters({ date: "7d" }), NOW).map((item) => item.id)).toEqual(["recent", "week"]);
    expect(filterAndSortProblems([recent, week, old], filters({ proposals: "25+" }), NOW).map((item) => item.id)).toEqual(["old"]);
  });

  it("sorts by proposal count, budget, and recency without mutating the input", () => {
    const low = makeProblem({ id: "low", proposalsCount: 1, budget: { type: "fixed", amount: 300, currency: "USD" }, publishedAt: new Date(NOW - 8 * 60 * 60 * 1000).toISOString() });
    const high = makeProblem({ id: "high", proposalsCount: 9, budget: { type: "range", min: 2000, max: 5000, currency: "USD" } });
    const unknown = makeProblem({ id: "unknown", proposalsCount: 2, budget: { type: "unknown" } });
    const input = [high, unknown, low];

    expect(filterAndSortProblems(input, filters({ sort: "fewest-proposals" }), NOW).map((item) => item.id)).toEqual(["low", "unknown", "high"]);
    expect(filterAndSortProblems(input, filters({ sort: "highest-budget" }), NOW).map((item) => item.id)).toEqual(["high", "low", "unknown"]);
    expect(filterAndSortProblems(input, DEFAULT_PROBLEM_FILTERS, NOW).map((item) => item.id)).toEqual(["high", "unknown", "low"]);
    expect(input.map((item) => item.id)).toEqual(["high", "unknown", "low"]);
  });
});

describe("budget helpers", () => {
  it("formats fixed, range, and undefined budgets", () => {
    expect(formatBudget({ type: "fixed", amount: 1500, currency: "USD" })).toBe("$1,500");
    expect(formatBudget({ type: "range", min: 500, max: 1500, currency: "USD" })).toBe("$500 – $1,500");
    expect(formatBudget({ type: "unknown" })).toBe("Sin presupuesto definido");
  });

  it("validates budget ranges", () => {
    expect(validateBudgetRange(500, 1200)).toBe(true);
    expect(validateBudgetRange(1200, 500)).toBe(false);
    expect(validateBudgetRange(-1, 500)).toBe(false);
    expect(validateBudgetRange(0, 0)).toBe(false);
  });

  it("formats relative publication time", () => {
    expect(formatRelativeDate(new Date(NOW - 30 * 60 * 1000).toISOString(), NOW)).toBe("hace menos de 1 h");
    expect(formatRelativeDate(new Date(NOW - 4 * 60 * 60 * 1000).toISOString(), NOW)).toBe("hace 4 h");
    expect(formatRelativeDate(new Date(NOW - 48 * 60 * 60 * 1000).toISOString(), NOW)).toBe("hace 2 días");
  });
});
