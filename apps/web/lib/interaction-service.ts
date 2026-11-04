import { callRpc, ProblemServiceError } from "@/lib/problem-service";
import type { FreelancerProblemInteraction } from "@/types/domain";

export type StoredProblemInteraction = Exclude<FreelancerProblemInteraction, "unseen">;

export type ProblemInteraction = {
  problemId: string;
  state: StoredProblemInteraction;
  updatedAt: string;
};

export async function setProblemInteraction(
  problemId: string,
  next: StoredProblemInteraction | null,
): Promise<FreelancerProblemInteraction> {
  const data: unknown = await callRpc("set_problem_interaction", {
    p_problem_id: problemId,
    p_next: next,
  });
  if (data === null && next === null) return "unseen";
  if (isStoredState(data)) return data;
  throw new ProblemServiceError("No pudimos confirmar la acción para este problema. Inténtalo de nuevo.");
}

export async function listMyProblemInteractions(): Promise<ProblemInteraction[]> {
  const data: unknown = await callRpc("list_my_problem_interactions", {});
  if (!Array.isArray(data)) {
    throw new ProblemServiceError("No pudimos cargar tus interacciones con problemas.");
  }
  return data.map((row: unknown) => {
    if (
      typeof row !== "object" || row === null || Array.isArray(row) ||
      !("problem_id" in row) || typeof row.problem_id !== "string" ||
      !("state" in row) || !isStoredState(row.state) ||
      !("updated_at" in row) || typeof row.updated_at !== "string"
    ) {
      throw new ProblemServiceError("No pudimos cargar tus interacciones con problemas.");
    }
    return { problemId: row.problem_id, state: row.state, updatedAt: row.updated_at };
  });
}

export function getProblemInteractionState(
  interactions: readonly ProblemInteraction[],
  problemId: string,
): FreelancerProblemInteraction {
  return interactions.find((interaction) => interaction.problemId === problemId)?.state ?? "unseen";
}

function isStoredState(value: unknown): value is StoredProblemInteraction {
  return value === "saved" || value === "dismissed" || value === "proposal_submitted";
}
