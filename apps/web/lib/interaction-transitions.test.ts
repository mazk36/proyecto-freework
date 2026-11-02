import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transitionFreelancerProblem } from "@/lib/discovery";
import type { StoredProblemInteraction } from "@/lib/interaction-service";

// pgTAP executes this same matrix against set_problem_interaction; SQL NULL is unseen.
const sql = readFileSync(
  new URL("../../../supabase/tests/database/freelancer_problem_interactions.test.sql", import.meta.url),
  "utf8",
);
const fixture = sql.split("-- BEGIN FREELANCER TRANSITION CASES")[1]
  ?.split("-- END FREELANCER TRANSITION CASES")[0];
if (!fixture) throw new Error("No se encontró la matriz compartida de transiciones.");

const value = (text: string): StoredProblemInteraction | null =>
  text === "null" ? null : text.slice(1, -1) as StoredProblemInteraction;
const cases = [...fixture.matchAll(/\(\s*\d+\s*,\s*(null|'\w+')\s*,\s*(null|'\w+')\s*,\s*(null|'\w+')\s*\)/g)]
  .map((match) => ({ current: value(match[1]), next: value(match[2]), expected: value(match[3]) }));

describe("freelancer problem transitions shared with SQL", () => {
  it("covers each of the 16 combinations exactly once", () => {
    expect(cases).toHaveLength(16);
    const combinations = new Set(cases.map(({ current, next }) => `${current}:${next}`));
    const states = [null, "saved", "dismissed", "proposal_submitted"] as const;
    expect(combinations).toEqual(new Set(states.flatMap((current) => states.map((next) => `${current}:${next}`))));
  });

  it.each(cases)("maps $current + $next to $expected", ({ current, next, expected }) => {
    expect(transitionFreelancerProblem(current ?? undefined, next) ?? "unseen")
      .toBe(expected ?? "unseen");
    if (current === null) {
      expect(transitionFreelancerProblem("unseen", next) ?? "unseen").toBe(expected ?? "unseen");
    }
  });
});
