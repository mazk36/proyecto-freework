import { describe, expect, it } from "vitest";
import {
  createMatchForInterestedProposal,
  getFreelancerProposalStatus,
  rankProblemsForFreelancer,
  selectCompanyProposals,
  selectFreelancerProposals,
  transitionCompanyProposal,
  transitionFreelancerProblem,
} from "@/lib/discovery";
import type { Match, Problem, SolutionProposal } from "@/types/domain";

const NOW = Date.parse("2026-10-06T12:00:00.000Z");

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "problem-a",
    title: "Reducir tareas repetidas",
    summary: "El equipo repite pasos manuales.",
    currentSituation: "Hay tareas repetidas.",
    desiredOutcome: "Reducir trabajo manual.",
    hashtags: ["operaciones"],
    budget: { type: "fixed", amount: 800, currency: "USD" },
    urgency: "this-month",
    company: { id: "company-a", name: "Empresa", industry: "Servicios" },
    proposalsCount: 1,
    publishedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
    status: "open",
    ...overrides,
  };
}

function makeProposal(overrides: Partial<SolutionProposal> = {}): SolutionProposal {
  return {
    id: "proposal-a",
    problemId: "problem-a",
    companyId: "company-a",
    title: "Ordenar el proceso",
    approach: "Observar y probar un flujo sencillo.",
    deliverables: "Un flujo y una guía.",
    estimatedTimeline: "2 semanas",
    price: 800,
    currency: "USD",
    conditions: "",
    freelancer: {
      id: "freelancer-a",
      name: "Ana",
      initials: "A",
      description: "Consultora independiente.",
    },
    ...overrides,
  };
}

describe("rankProblemsForFreelancer", () => {
  it("ranks preferred hashtags ahead of an equally recent opportunity", () => {
    const preferred = makeProblem({ id: "preferred", hashtags: ["#ventas"] });
    const general = makeProblem({ id: "general", hashtags: ["legal"] });

    expect(
      rankProblemsForFreelancer(
        [general, preferred],
        {},
        { preferredHashtags: ["ventas"], maxBudget: 5000 },
        NOW,
      ).map((problem) => problem.id),
    ).toEqual(["preferred", "general"]);
  });

  it("removes dismissed and proposal-submitted problems from Discovery", () => {
    const eligible = makeProblem({ id: "eligible" });
    const dismissed = makeProblem({ id: "dismissed" });
    const submitted = makeProblem({ id: "submitted" });
    const reviewing = makeProblem({ id: "reviewing", status: "reviewing" });

    expect(
      rankProblemsForFreelancer(
        [eligible, dismissed, submitted, reviewing],
        { dismissed: "dismissed", submitted: "proposal_submitted" },
        { preferredHashtags: [], maxBudget: null },
        NOW,
      ).map((problem) => problem.id),
    ).toEqual(["eligible"]);
  });

  it("uses budget preference as a simple score and leaves ties deterministic", () => {
    const withinBudget = makeProblem({ id: "within", budget: { type: "fixed", amount: 700, currency: "USD" } });
    const aboveBudget = makeProblem({ id: "above", budget: { type: "fixed", amount: 6000, currency: "USD" } });

    expect(
      rankProblemsForFreelancer(
        [aboveBudget, withinBudget],
        {},
        { preferredHashtags: [], maxBudget: 1000 },
        NOW,
      ).map((problem) => problem.id),
    ).toEqual(["within", "above"]);
  });

  it("uses recency as a ranking signal", () => {
    const recent = makeProblem({ id: "recent", publishedAt: new Date(NOW - 60 * 60 * 1000).toISOString() });
    const old = makeProblem({ id: "old", publishedAt: new Date(NOW - 40 * 86_400_000).toISOString() });

    expect(
      rankProblemsForFreelancer(
        [old, recent],
        {},
        { preferredHashtags: [], maxBudget: null },
        NOW,
      ).map((problem) => problem.id),
    ).toEqual(["recent", "old"]);
  });
});

describe("interaction transitions", () => {
  it("moves an unseen freelancer problem into one explicit state and restores saved or dismissed items", () => {
    expect(transitionFreelancerProblem("unseen", "saved")).toBe("saved");
    expect(transitionFreelancerProblem(undefined, "saved")).toBe("saved");
    expect(transitionFreelancerProblem(undefined, "dismissed")).toBe("dismissed");
    expect(transitionFreelancerProblem(undefined, "proposal_submitted")).toBe("proposal_submitted");
    expect(transitionFreelancerProblem("saved", null)).toBeUndefined();
    expect(transitionFreelancerProblem("saved", "proposal_submitted")).toBe("proposal_submitted");
    expect(transitionFreelancerProblem("dismissed", null)).toBeUndefined();
    expect(transitionFreelancerProblem("proposal_submitted", null)).toBe("proposal_submitted");
  });

  it("moves an unseen company proposal into saved, dismissed, or interested and restores reversible states", () => {
    expect(transitionCompanyProposal("unseen", "saved")).toBe("saved");
    expect(transitionCompanyProposal(undefined, "saved")).toBe("saved");
    expect(transitionCompanyProposal(undefined, "dismissed")).toBe("dismissed");
    expect(transitionCompanyProposal(undefined, "interested")).toBe("interested");
    expect(transitionCompanyProposal("saved", null)).toBeUndefined();
    expect(transitionCompanyProposal("dismissed", null)).toBeUndefined();
    expect(transitionCompanyProposal("interested", null)).toBe("interested");
  });
});

describe("proposal visibility and Match creation", () => {
  it("returns only a freelancer's own proposals", () => {
    const own = makeProposal({ id: "own", freelancer: { ...makeProposal().freelancer, id: "freelancer-a" } });
    const other = makeProposal({ id: "other", freelancer: { ...makeProposal().freelancer, id: "freelancer-b" } });

    expect(selectFreelancerProposals([own, other], "freelancer-a").map((proposal) => proposal.id)).toEqual(["own"]);
  });

  it("returns only proposals owned by the selected company and problem", () => {
    const owned = makeProposal({ id: "owned", companyId: "company-a", problemId: "problem-a" });
    const otherProblem = makeProposal({ id: "other-problem", companyId: "company-a", problemId: "problem-b" });
    const otherCompany = makeProposal({ id: "other-company", companyId: "company-b", problemId: "problem-a" });

    expect(selectCompanyProposals([owned, otherProblem, otherCompany], "company-a", "problem-a").map((proposal) => proposal.id)).toEqual(["owned"]);
  });

  it("creates a Match only for an existing proposal owned by the company, without duplicates", () => {
    const proposal = makeProposal();
    const problem = makeProblem({ id: proposal.problemId, company: { id: proposal.companyId, name: "Empresa", industry: "Servicios" } });
    const match: Match = {
      id: "match-proposal-a",
      problemId: proposal.problemId,
      proposalId: proposal.id,
      companyId: proposal.companyId,
      freelancerId: proposal.freelancer.id,
      createdAt: new Date(NOW).toISOString(),
      status: "matched",
    };

    expect(createMatchForInterestedProposal(undefined, problem, "company-a", [], new Date(NOW).toISOString())).toBeNull();
    expect(createMatchForInterestedProposal(proposal, undefined, "company-a", [], new Date(NOW).toISOString())).toBeNull();
    expect(createMatchForInterestedProposal(proposal, problem, "company-b", [], new Date(NOW).toISOString())).toBeNull();
    expect(createMatchForInterestedProposal(proposal, { ...problem, id: "other-problem" }, "company-a", [], new Date(NOW).toISOString())).toBeNull();
    expect(createMatchForInterestedProposal(proposal, problem, "company-a", [], new Date(NOW).toISOString())).toEqual(match);
    expect(createMatchForInterestedProposal(proposal, problem, "company-a", [match], new Date(NOW).toISOString())).toBeNull();
  });

  it("shows the company response status only on a freelancer's proposal view", () => {
    const proposal = makeProposal();
    expect(getFreelancerProposalStatus(proposal, [], { [proposal.id]: "saved" })).toBe("saved");
    expect(getFreelancerProposalStatus(proposal, [], { [proposal.id]: "dismissed" })).toBe("dismissed");
    expect(getFreelancerProposalStatus(proposal, [], {})).toBe("sent");
    expect(getFreelancerProposalStatus(proposal, [{
      id: "match-proposal-a",
      problemId: proposal.problemId,
      proposalId: proposal.id,
      companyId: proposal.companyId,
      freelancerId: proposal.freelancer.id,
      createdAt: new Date(NOW).toISOString(),
      status: "matched",
    }], {})).toBe("matched");
  });
});
