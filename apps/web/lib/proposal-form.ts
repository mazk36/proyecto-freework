import {
  createEmptyProposalDraft,
  mapProposalErrors,
  proposalTextLimits,
  validateProposalForSubmit,
  type Proposal,
  type ProposalCurrency,
  type ProposalDraftInput,
  type ProposalFieldErrors,
} from "@/lib/proposal-domain";
import type { PublicProblem } from "@/lib/problem-domain";

export const PROPOSAL_AUTOSAVE_DELAY_MS = 1500;
export type ProposalTextField = (typeof proposalTextLimits)[number][0];
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
export type ProposalFormState = {
  phase: "loading" | "load-error" | "ready" | "already-submitted" | "submitted";
  draft: ProposalDraftInput;
  priceText: string;
  revision: number;
  savedRevision: number;
  saveStatus: SaveStatus;
  error: string | null;
  fieldErrors: ProposalFieldErrors;
};

export type ProposalFormAction =
  | { type: "load-start" }
  | { type: "load"; proposal?: Proposal }
  | { type: "load-error"; message: string }
  | { type: "edit-text"; field: ProposalTextField; value: string }
  | { type: "edit-price"; value: string }
  | { type: "edit-currency"; value: ProposalCurrency }
  | { type: "validation-error"; errors: ProposalFieldErrors; message?: string }
  | { type: "save-start" }
  | { type: "save-success"; id: string; revision: number }
  | { type: "save-error"; message: string }
  | { type: "submit-error"; message: string }
  | { type: "submitted" };

export function initialProposalFormState(): ProposalFormState {
  return {
    phase: "loading", draft: createEmptyProposalDraft(), priceText: "", revision: 0,
    savedRevision: 0, saveStatus: "idle", error: null, fieldErrors: {},
  };
}

export function parseProposalPrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(?:[.,]\d{0,2})?$/.test(trimmed)) return NaN;
  return Number(trimmed.replace(",", "."));
}

export function proposalErrors(draft: ProposalDraftInput, allowIncomplete = false): ProposalFieldErrors {
  return mapProposalErrors(validateProposalForSubmit(draft), allowIncomplete);
}

export function shouldScheduleProposalSave(state: ProposalFormState): boolean {
  return state.phase === "ready" && state.revision > state.savedRevision && state.saveStatus === "dirty";
}

export function proposalSaveDelay(state: ProposalFormState): number | null {
  return shouldScheduleProposalSave(state) ? PROPOSAL_AUTOSAVE_DELAY_MS : null;
}

/** One request at a time; a failure must not prevent a later retry. */
export function createProposalSaveQueue() {
  let tail: Promise<void> = Promise.resolve();
  let pending = 0;
  return {
    get pending() { return pending > 0; },
    run<T>(task: () => Promise<T>): Promise<T> {
      pending += 1;
      const result = tail.then(task);
      tail = result.then(() => undefined, () => undefined);
      return result.finally(() => { pending -= 1; });
    },
  };
}

export function proposalFormReducer(state: ProposalFormState, action: ProposalFormAction): ProposalFormState {
  switch (action.type) {
    case "load-start": return { ...state, phase: "loading", error: null };
    case "load": {
      if (action.proposal?.status === "submitted") return { ...state, phase: "already-submitted" };
      const draft = action.proposal?.status === "draft" ? action.proposal : createEmptyProposalDraft();
      return {
        ...initialProposalFormState(), phase: "ready", draft,
        priceText: draft.price === null ? "" : String(draft.price),
        saveStatus: draft.id ? "saved" : "idle",
      };
    }
    case "load-error": return { ...state, phase: "load-error", error: action.message };
    case "edit-text": {
      const { [action.field]: _previous, ...fieldErrors } = state.fieldErrors;
      void _previous;
      return { ...state, draft: { ...state.draft, [action.field]: action.value }, revision: state.revision + 1, saveStatus: "dirty", error: null, fieldErrors };
    }
    case "edit-price": {
      const { price: _previous, ...fieldErrors } = state.fieldErrors;
      void _previous;
      return { ...state, draft: { ...state.draft, price: parseProposalPrice(action.value) }, priceText: action.value, revision: state.revision + 1, saveStatus: "dirty", error: null, fieldErrors };
    }
    case "edit-currency": {
      const { currency: _previous, ...fieldErrors } = state.fieldErrors;
      void _previous;
      return { ...state, draft: { ...state.draft, currency: action.value }, revision: state.revision + 1, saveStatus: "dirty", error: null, fieldErrors };
    }
    case "validation-error": return { ...state, fieldErrors: action.errors, error: action.message ?? null, saveStatus: action.message ? "error" : state.saveStatus };
    case "save-start": return { ...state, saveStatus: "saving", error: null };
    case "save-success": return {
      ...state, draft: { ...state.draft, id: action.id }, savedRevision: Math.max(state.savedRevision, action.revision),
      saveStatus: state.revision > action.revision ? "dirty" : "saved", error: null,
    };
    case "save-error": return { ...state, saveStatus: "error", error: action.message };
    case "submit-error": return { ...state, saveStatus: state.revision > state.savedRevision ? "dirty" : "saved", error: action.message };
    case "submitted": return { ...state, phase: "submitted", error: null };
  }
}

export function groupProposalsByStatus(proposals: readonly Proposal[]): Record<Proposal["status"], Proposal[]> {
  const groups: Record<Proposal["status"], Proposal[]> = { submitted: [], draft: [], withdrawn: [] };
  for (const proposal of proposals) groups[proposal.status].push(proposal);
  return groups;
}

export function resolveProposalProblem(proposal: Proposal, problems: readonly PublicProblem[]): { problem: PublicProblem; unavailable: boolean } {
  const available = problems.find((problem) => problem.id === proposal.problemId);
  if (available) return { problem: available, unavailable: false };
  return { unavailable: true, problem: {
    id: proposal.problemId, title: proposal.problemTitleSnapshot, companyName: null,
    description: "", industrySnapshot: "", impacts: [], objectives: [], successCriteria: "",
    budgetChoice: "", currency: proposal.currency, deadlineChoice: "", publishedAt: null,
  } };
}
