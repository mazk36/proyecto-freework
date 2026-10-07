import type {
  CompanyProposalInteraction,
  FreelancerPreferences,
  FreelancerProblemInteraction,
  FreelancerProposalStatus,
  Match,
  Problem,
  SolutionProposal,
} from "@/types/domain";

export function rankProblemsForFreelancer(
  problems: Problem[],
  interactions: Record<string, FreelancerProblemInteraction>,
  preferences: FreelancerPreferences,
  now = Date.now(),
): Problem[] {
  return problems
    .filter(
      (problem) =>
        problem.status === "open" &&
        (!interactions[problem.id] || interactions[problem.id] === "unseen"),
    )
    .map((problem) => ({
      problem,
      score: scoreProblem(problem, preferences, now),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.problem.publishedAt) - Date.parse(a.problem.publishedAt) ||
        a.problem.id.localeCompare(b.problem.id),
    )
    .map(({ problem }) => problem);
}

function scoreProblem(
  problem: Problem,
  preferences: FreelancerPreferences,
  now: number,
): number {
  const tags = new Set(preferences.preferredHashtags.map(normalizeTag));
  const hashtagScore = problem.hashtags.reduce(
    (score, hashtag) => score + (tags.has(normalizeTag(hashtag)) ? 10 : 0),
    0,
  );

  const budgetValue =
    problem.budget.type === "fixed"
      ? problem.budget.amount
      : problem.budget.type === "range"
        ? problem.budget.max
        : null;
  const budgetScore =
    preferences.maxBudget === null || budgetValue === null
      ? 0
      : budgetValue <= preferences.maxBudget
        ? 5
        : -4;

  const publishedAt = Date.parse(problem.publishedAt);
  const ageInDays = Number.isFinite(publishedAt)
    ? Math.max(0, (now - publishedAt) / 86_400_000)
    : 30;
  const recencyScore = Math.max(0, 3 - ageInDays * 0.35);

  return hashtagScore + budgetScore + recencyScore;
}

function normalizeTag(tag: string): string {
  return tag.replace(/^#/, "").trim().toLocaleLowerCase("es");
}

export function transitionFreelancerProblem(
  current: FreelancerProblemInteraction | undefined,
  next: FreelancerProblemInteraction | null,
): FreelancerProblemInteraction | undefined {
  if ((!current || current === "unseen") && next && next !== "unseen") return next;
  if (current === "saved" && next === "proposal_submitted") return next;
  if ((current === "saved" || current === "dismissed") && next === null) {
    return undefined;
  }
  return current;
}

export function transitionCompanyProposal(
  current: CompanyProposalInteraction | undefined,
  next: CompanyProposalInteraction | null,
): CompanyProposalInteraction | undefined {
  if ((!current || current === "unseen") && next && next !== "unseen") return next;
  if ((current === "saved" || current === "dismissed") && next === null) {
    return undefined;
  }
  return current;
}

export function selectFreelancerProposals(
  proposals: SolutionProposal[],
  freelancerId: string,
): SolutionProposal[] {
  return proposals.filter((proposal) => proposal.freelancer.id === freelancerId);
}

export function selectCompanyProposals(
  proposals: SolutionProposal[],
  companyId: string,
  problemId?: string,
): SolutionProposal[] {
  return proposals.filter(
    (proposal) =>
      proposal.companyId === companyId &&
      (!problemId || proposal.problemId === problemId),
  );
}

export function getFreelancerProposalStatus(
  proposal: SolutionProposal,
  matches: Match[],
  companyInteractions: Record<string, CompanyProposalInteraction>,
): FreelancerProposalStatus {
  if (matches.some((match) => match.proposalId === proposal.id)) return "matched";
  const interaction = companyInteractions[proposal.id];
  if (interaction === "saved") return "saved";
  if (interaction === "dismissed") return "dismissed";
  return "sent";
}

export function createMatchForInterestedProposal(
  proposal: SolutionProposal | undefined,
  problem: Problem | undefined,
  companyId: string,
  existingMatches: Match[],
  createdAt: string,
): Match | null {
  if (
    !proposal ||
    !problem ||
    proposal.companyId !== companyId ||
    proposal.problemId !== problem.id ||
    problem.company.id !== companyId
  ) return null;
  if (existingMatches.some((match) => match.proposalId === proposal.id)) return null;

  return {
    id: `match-${proposal.id}`,
    problemId: proposal.problemId,
    proposalId: proposal.id,
    companyId,
    freelancerId: proposal.freelancer.id,
    createdAt,
    status: "matched",
  };
}
