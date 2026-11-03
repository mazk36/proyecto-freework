import { callRpc, ProblemServiceError, toFriendlyError } from "@/lib/problem-service";
import { toRpcPayload, type Proposal, type ProposalDraftInput } from "@/lib/proposal-domain";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export async function saveProposalDraft(problemId: string, input: ProposalDraftInput): Promise<string> {
  const data = await callRpc("save_proposal_draft", { p_problem_id: problemId, p_data: toRpcPayload(input) });
  if (typeof data !== "string") throw new ProblemServiceError("No pudimos confirmar el guardado de tu propuesta.");
  return data;
}

export async function submitProposal(id: string): Promise<string> {
  const data = await callRpc("submit_proposal", { p_proposal_id: id });
  if (typeof data !== "string") throw new ProblemServiceError("No pudimos confirmar el envío de tu propuesta.");
  return data;
}

export async function withdrawProposal(id: string): Promise<string> {
  const data = await callRpc("withdraw_proposal", { p_proposal_id: id });
  if (typeof data !== "string") throw new ProblemServiceError("No pudimos confirmar el retiro de tu propuesta.");
  return data;
}

export async function listMyProposals(): Promise<Proposal[]> {
  const client = getSupabaseClient();
  if (!client) throw new ProblemServiceError("La conexión con Supabase no está configurada.");
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw new ProblemServiceError(toFriendlyError(authError.message));
  if (!authData.user) throw new ProblemServiceError("Inicia sesión para continuar.");

  const { data, error } = await client.from("proposals").select("*")
    .eq("freelancer_id", authData.user.id).order("created_at", { ascending: false });
  if (error) throw new ProblemServiceError(toFriendlyError(error.message));
  return data.map(mapProposal);
}

function mapProposal(row: Database["public"]["Tables"]["proposals"]["Row"]): Proposal {
  return {
    id: row.id,
    problemId: row.problem_id,
    problemTitleSnapshot: row.problem_title_snapshot,
    freelancerId: row.freelancer_id,
    status: row.status,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ProposalServices = {
  list: typeof listMyProposals;
  save: typeof saveProposalDraft;
  submit: typeof submitProposal;
  withdraw: typeof withdrawProposal;
};

export const proposalServices: ProposalServices = {
  list: listMyProposals,
  save: saveProposalDraft,
  submit: submitProposal,
  withdraw: withdrawProposal,
};
