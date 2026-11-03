import type { InboxProposal } from "@/lib/company-inbox-service";
import type { CompanyProblem } from "@/lib/problem-domain";
import type { CompanyProposalInteraction } from "@/types/domain";

export type InboxFilter = "all" | "saved" | "unseen" | "dismissed";
export type InboxProblem = Pick<CompanyProblem, "id" | "title" | "status">;
export type InboxProblemGroup = { problem: InboxProblem; proposals: InboxProposal[] };

export type CompanyInboxServices = {
  listProblems: () => Promise<InboxProblem[]>;
  listProposals: (problemId: string) => Promise<InboxProposal[]>;
  setInteraction: (proposalId: string, next: CompanyProposalInteraction | null) => Promise<CompanyProposalInteraction>;
};

export function filterInboxProposals(proposals: readonly InboxProposal[], filter: InboxFilter): InboxProposal[] {
  return filter === "all" ? [...proposals] : proposals.filter((proposal) => proposal.myState === filter && !proposal.matchId);
}

export function comparisonAvailability(selectedCount: number): { canOpen: boolean; isFull: boolean } {
  return { canOpen: selectedCount >= 2, isFull: selectedCount >= 3 };
}

export function formatInboxDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" }).format(date);
}

/** The RPC permits a new decision only after a saved/dismissed decision is cleared. */
export async function changeInboxDecision(
  setInteraction: CompanyInboxServices["setInteraction"],
  proposalId: string,
  current: CompanyProposalInteraction,
  next: CompanyProposalInteraction,
): Promise<CompanyProposalInteraction> {
  if (current === next) return current;
  if (current === "interested") throw new Error("Este Match ya está registrado y no se puede deshacer desde la bandeja.");

  if (current === "saved" || current === "dismissed") {
    const cleared = await setInteraction(proposalId, null);
    if (cleared !== "unseen") throw new Error("La decisión cambió. Actualiza la bandeja para revisarla.");
  }
  if (next === "unseen") return "unseen";
  const confirmed = await setInteraction(proposalId, next);
  if (confirmed !== next) throw new Error("La decisión cambió. Actualiza la bandeja para revisarla.");
  return confirmed;
}
