import type { StoredProblemInteraction } from "@/lib/interaction-service";
import { ProblemServiceError } from "@/lib/problem-service";
import type { FreelancerProblemInteraction } from "@/types/domain";

export type DeckInteractionWriter = (id: string, state: StoredProblemInteraction | null) => Promise<FreelancerProblemInteraction>;

export async function persistDeckInteraction(
  write: DeckInteractionWriter,
  id: string,
  next: "saved" | "dismissed" | null,
  rollback: FreelancerProblemInteraction,
): Promise<{ state: FreelancerProblemInteraction; confirmed: boolean; error?: string }> {
  try {
    const state = await write(id, next);
    return { state, confirmed: state === (next ?? "unseen") };
  } catch (error) {
    return {
      state: rollback,
      confirmed: false,
      ...(error instanceof ProblemServiceError ? { error: error.message } : {}),
    };
  }
}
