import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transitionCompanyProposal } from "@/lib/discovery";
import type { CompanyProposalInteraction } from "@/types/domain";

// pgTAP executes this same matrix against set_proposal_interaction; SQL NULL is unseen.
const sql = readFileSync(
  new URL("../../../supabase/tests/database/company_inbox_matches.test.sql", import.meta.url),
  "utf8",
);
const fixture = sql.split("-- BEGIN COMPANY TRANSITION CASES")[1]
  ?.split("-- END COMPANY TRANSITION CASES")[0];
if (!fixture) throw new Error("No se encontró la matriz compartida de transiciones de empresa.");

const value = (text: string): CompanyProposalInteraction | null =>
  text === "null" ? null : text.slice(1, -1) as CompanyProposalInteraction;
const cases = [...fixture.matchAll(/\(\s*\d+\s*,\s*(null|'\w+')\s*,\s*(null|'\w+')\s*,\s*(null|'\w+')\s*\)/g)]
  .map((match) => ({ current: value(match[1]), next: value(match[2]), expected: value(match[3]) }));

describe("company proposal transitions shared with SQL", () => {
  it("covers every stored current state and requested state exactly once", () => {
    expect(cases).toHaveLength(20);
    const currentStates = [null, "saved", "dismissed", "interested"] as const;
    const nextStates = [null, "unseen", "saved", "dismissed", "interested"] as const;
    expect(new Set(cases.map(({ current, next }) => `${current}:${next}`)))
      .toEqual(new Set(currentStates.flatMap((current) => nextStates.map((next) => `${current}:${next}`))));
  });

  it.each(cases)("maps $current + $next to $expected", ({ current, next, expected }) => {
    expect(transitionCompanyProposal(current ?? undefined, next) ?? "unseen")
      .toBe(expected ?? "unseen");
    if (current === null) {
      expect(transitionCompanyProposal("unseen", next) ?? "unseen").toBe(expected ?? "unseen");
    }
  });
});
