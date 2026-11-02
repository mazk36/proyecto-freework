import type { StoredProblemInteraction } from "@/lib/interaction-service";
import type { FreelancerProblemInteraction } from "@/types/domain";

export type DeckInteractionWriter = (id: string, state: StoredProblemInteraction | null) => Promise<FreelancerProblemInteraction>;

export async function persistDeckInteraction(
  write: DeckInteractionWriter,
  id: string,
  next: "saved" | "dismissed" | null,
  rollback: FreelancerProblemInteraction,
): Promise<{ state: FreelancerProblemInteraction; confirmed: boolean }> {
  try {
    const state = await write(id, next);
    return { state, confirmed: state === (next ?? "unseen") };
  } catch {
    return { state: rollback, confirmed: false };
  }
}
