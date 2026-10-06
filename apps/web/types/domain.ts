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
  name: string;
  initials: string;
  description: string;
};

export type SolutionProposal = {
  id: string;
  title: string;
  approach: string;
  deliverables: string;
  estimatedTimeline: string;
  price: number;
  currency: "USD";
  conditions: string;
  freelancer: Freelancer;
};
