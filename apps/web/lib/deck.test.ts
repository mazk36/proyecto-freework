import { describe, expect, it } from "vitest";
import { selectDeckProblems } from "@/lib/deck";
import type { PublicProblem } from "@/lib/problem-domain";

function problem(id: string, publishedAt: string | null): PublicProblem {
  return {
    id, publishedAt, title: id, description: "", impacts: [], industrySnapshot: "", objectives: [],
    successCriteria: "", budgetChoice: "unknown", currency: "PEN", deadlineChoice: "flexible", companyName: null,
  };
}

describe("selectDeckProblems", () => {
  it("keeps only unseen problems and orders them by recency and id without mutating the input", () => {
    const problems = [
      problem("old", "2026-01-01T00:00:00Z"), problem("b", "2026-02-01T00:00:00Z"),
      problem("saved", "2026-03-01T00:00:00Z"), problem("a", "2026-02-01T00:00:00Z"),
      problem("dismissed", "2026-03-01T00:00:00Z"), problem("submitted", "2026-03-01T00:00:00Z"),
    ];
    expect(selectDeckProblems(problems, { old: "unseen", saved: "saved", dismissed: "dismissed", submitted: "proposal_submitted" }).map((item) => item.id))
      .toEqual(["a", "b", "old"]);
    expect(problems.map((item) => item.id)).toEqual(["old", "b", "saved", "a", "dismissed", "submitted"]);
  });

  it("places missing or invalid dates last, with a deterministic id tie-break", () => {
    expect(selectDeckProblems([problem("b", null), problem("dated", "2026-01-01"), problem("a", "invalid")], {}).map((item) => item.id))
      .toEqual(["dated", "a", "b"]);
  });
});
