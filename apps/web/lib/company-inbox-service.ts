import { callRpc, ProblemServiceError } from "@/lib/problem-service";
import type { Database } from "@/types/database";
import type { CompanyProposalInteraction } from "@/types/domain";

type ProposalRow = Database["public"]["Functions"]["list_problem_proposals"]["Returns"][number];
type MatchRow = Database["public"]["Functions"]["list_my_matches"]["Returns"][number];
type StoredState = Exclude<CompanyProposalInteraction, "unseen">;

export type InboxProposal = {
  id: string;
  problemId: string;
  freelancerId: string;
  freelancerName: string | null;
  freelancerSlug: string | null;
  headline: string | null;
  diagnosis: string;
  solution: string;
  deliverables: string;
  timeline: string;
  price: number | null;
  currency: "PEN" | "USD";
  recurringCosts: string;
  maintenanceWarranty: string;
  relatedExperience: string;
  submittedAt: string;
  myState: CompanyProposalInteraction;
  matchId: string | null;
};

export type MyMatch = {
  matchId: string;
  problemId: string;
  proposalId: string;
  counterpartName: string | null;
  problemTitle: string;
  createdAt: string;
};

export async function listProblemProposals(problemId: string): Promise<InboxProposal[]> {
  const data: unknown = await callRpc("list_problem_proposals", { p_problem_id: problemId });
  if (!Array.isArray(data) || !data.every(isProposalRow)) {
    throw new ProblemServiceError("No pudimos cargar las propuestas de este problema.");
  }
  return data.map((row) => ({
    id: row.id,
    problemId: row.problem_id,
    freelancerId: row.freelancer_id,
    freelancerName: row.freelancer_name,
    freelancerSlug: row.freelancer_slug,
    headline: row.headline,
    diagnosis: row.diagnosis,
    solution: row.solution,
    deliverables: row.deliverables,
    timeline: row.timeline,
    price: row.price,
    currency: row.currency,
    recurringCosts: row.recurring_costs,
    maintenanceWarranty: row.maintenance_warranty,
    relatedExperience: row.related_experience,
    submittedAt: row.submitted_at,
    myState: row.my_state ?? "unseen",
    matchId: row.match_id,
  }));
}

export async function setProposalInteraction(
  proposalId: string,
  next: CompanyProposalInteraction | null,
): Promise<CompanyProposalInteraction> {
  const data: unknown = await callRpc("set_proposal_interaction", {
    p_proposal_id: proposalId,
    p_next: next,
  });
  if (data === null) return "unseen";
  if (isStoredState(data)) return data;
  throw new ProblemServiceError("No pudimos confirmar la acción para esta propuesta.");
}

export async function listMyMatches(): Promise<MyMatch[]> {
  const data: unknown = await callRpc("list_my_matches", {});
  if (!Array.isArray(data) || !data.every(isMatchRow)) {
    throw new ProblemServiceError("No pudimos cargar tus Matches.");
  }
  return data.map((row) => ({
    matchId: row.match_id,
    problemId: row.problem_id,
    proposalId: row.proposal_id,
    counterpartName: row.counterpart_name,
    problemTitle: row.problem_title,
    createdAt: row.created_at,
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isStoredState(value: unknown): value is StoredState {
  return value === "saved" || value === "dismissed" || value === "interested";
}

function isProposalRow(value: unknown): value is ProposalRow {
  return isRecord(value) &&
    typeof value.id === "string" && typeof value.problem_id === "string" &&
    typeof value.freelancer_id === "string" && isNullableString(value.freelancer_name) &&
    isNullableString(value.freelancer_slug) && isNullableString(value.headline) &&
    typeof value.diagnosis === "string" && typeof value.solution === "string" &&
    typeof value.deliverables === "string" && typeof value.timeline === "string" &&
    (value.price === null || (typeof value.price === "number" && Number.isFinite(value.price))) &&
    (value.currency === "PEN" || value.currency === "USD") &&
    typeof value.recurring_costs === "string" && typeof value.maintenance_warranty === "string" &&
    typeof value.related_experience === "string" && typeof value.submitted_at === "string" &&
    (value.my_state === null || isStoredState(value.my_state)) && isNullableString(value.match_id);
}

function isMatchRow(value: unknown): value is MatchRow {
  return isRecord(value) && typeof value.match_id === "string" &&
    typeof value.problem_id === "string" && typeof value.proposal_id === "string" &&
    isNullableString(value.counterpart_name) && typeof value.problem_title === "string" &&
    typeof value.created_at === "string";
}
