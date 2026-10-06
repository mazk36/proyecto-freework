export type ProblemBudget =
  | { type: "fixed"; amount: number; currency: "USD" }
  | { type: "range"; min: number; max: number; currency: "USD" }
  | { type: "unknown" };

export type ProblemStatus = "open" | "reviewing";

export type ProblemUrgency =
  | "asap"
  | "this-month"
  | "next-months"
  | "no-rush";

export type Company = {
  id: string;
  name: string;
  industry: string;
};

export type Problem = {
  id: string;
  title: string;
  summary: string;
  currentSituation: string;
  desiredOutcome: string;
  impact?: string;
  constraints?: string;
  hashtags: string[];
  budget: ProblemBudget;
  urgency: ProblemUrgency;
  company: Company;
  proposalsCount: number;
  publishedAt: string;
  status: ProblemStatus;
};

export type Freelancer = {
  id: string;
  name: string;
  initials: string;
  description: string;
};

export type SolutionProposal = {
  id: string;
  problemId: string;
  companyId: string;
  title: string;
  approach: string;
  deliverables: string;
  estimatedTimeline: string;
  price: number;
  currency: "USD";
  conditions: string;
  freelancer: Freelancer;
};

export type DemoRole = "freelancer" | "company";

export type FreelancerProblemInteraction =
  | "unseen"
  | "saved"
  | "dismissed"
  | "proposal_submitted";

export type CompanyProposalInteraction = "unseen" | "saved" | "dismissed" | "interested";

export type FreelancerProposalStatus = "sent" | "saved" | "matched" | "dismissed";

export type Match = {
  id: string;
  problemId: string;
  proposalId: string;
  companyId: string;
  freelancerId: string;
  createdAt: string;
  status: "matched";
};

export type FreelancerPreferences = {
  preferredHashtags: string[];
  maxBudget: number | null;
};

export type ProposalDraft = Omit<
  SolutionProposal,
  "id" | "problemId" | "companyId" | "freelancer"
>;
