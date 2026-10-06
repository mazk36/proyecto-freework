"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ALL_DEMO_PROPOSALS, PROBLEMS } from "@/data/problems";
import {
  createMatchForInterestedProposal,
  DEFAULT_FREELANCER_PREFERENCES,
  DEMO_COMPANY_ID,
  DEMO_FREELANCER,
  transitionCompanyProposal,
  transitionFreelancerProblem,
} from "@/lib/discovery";
import type {
  CompanyProposalInteraction,
  DemoRole,
  FreelancerPreferences,
  FreelancerProblemInteraction,
  Match,
  ProposalDraft,
  SolutionProposal,
} from "@/types/domain";

const STORAGE_KEY = "freework-demo-state-v1";

type DemoState = {
  role: DemoRole;
  problemInteractions: Record<string, FreelancerProblemInteraction>;
  proposalInteractions: Record<string, CompanyProposalInteraction>;
  proposals: SolutionProposal[];
  matches: Match[];
  preferences: FreelancerPreferences;
};

type DemoStore = DemoState & {
  hydrated: boolean;
  setRole: (role: DemoRole) => void;
  setProblemInteraction: (
    problemId: string,
    interaction: FreelancerProblemInteraction | null,
  ) => void;
  submitProposal: (problemId: string, draft: ProposalDraft) => string | null;
  setProposalInteraction: (
    proposalId: string,
    interaction: Exclude<CompanyProposalInteraction, "interested" | "unseen"> | null,
  ) => void;
  markProposalInterested: (proposalId: string) => Match | null;
  setPreferences: (preferences: FreelancerPreferences) => void;
  resetDemoState: () => void;
};

const DemoStoreContext = createContext<DemoStore | null>(null);

function createInitialState(): DemoState {
  const match: Match = {
    id: "match-visitas-propuesta-1",
    problemId: "registro-visitas-comerciales",
    proposalId: "visitas-propuesta-1",
    companyId: DEMO_COMPANY_ID,
    freelancerId: DEMO_FREELANCER.id,
    createdAt: "2026-10-05T22:30:00-05:00",
    status: "matched",
  };

  return {
    role: "freelancer",
    problemInteractions: {
      "registro-visitas-comerciales": "proposal_submitted",
      "errores-inventario-tienda": "dismissed",
      "visitas-sin-contactos": "saved",
    },
    proposalInteractions: {
      "visitas-propuesta-1": "interested",
      "devoluciones-propuesta-2": "saved",
      "devoluciones-propuesta-1": "dismissed",
    },
    proposals: ALL_DEMO_PROPOSALS,
    matches: [match],
    preferences: DEFAULT_FREELANCER_PREFERENCES,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFreelancerProblemInteraction(
  value: unknown,
): value is FreelancerProblemInteraction {
  return value === "unseen" || value === "saved" || value === "dismissed" || value === "proposal_submitted";
}

function isCompanyProposalInteraction(value: unknown): value is CompanyProposalInteraction {
  return value === "unseen" || value === "saved" || value === "dismissed" || value === "interested";
}

function readInteractionMap<T extends string>(
  value: unknown,
  isValue: (item: unknown) => item is T,
): Record<string, T> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => isValue(item))) as Record<string, T>;
}

function isProposal(value: unknown): value is SolutionProposal {
  if (!isRecord(value) || !isRecord(value.freelancer)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.problemId === "string" &&
    typeof value.companyId === "string" &&
    typeof value.title === "string" &&
    typeof value.approach === "string" &&
    typeof value.deliverables === "string" &&
    typeof value.estimatedTimeline === "string" &&
    typeof value.price === "number" &&
    value.currency === "USD" &&
    typeof value.conditions === "string" &&
    typeof value.freelancer.id === "string" &&
    typeof value.freelancer.name === "string" &&
    typeof value.freelancer.initials === "string" &&
    typeof value.freelancer.description === "string"
  );
}

function isMatch(value: unknown): value is Match {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.problemId === "string" &&
    typeof value.proposalId === "string" &&
    typeof value.companyId === "string" &&
    typeof value.freelancerId === "string" &&
    typeof value.createdAt === "string" &&
    value.status === "matched"
  );
}

function readStoredState(): DemoState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !isRecord(value.preferences)) return null;

    const role = value.role === "company" ? "company" : value.role === "freelancer" ? "freelancer" : null;
    const tags = value.preferences.preferredHashtags;
    const maxBudget = value.preferences.maxBudget;
    if (
      !role ||
      !Array.isArray(tags) ||
      !tags.every((tag) => typeof tag === "string") ||
      !(maxBudget === null || (typeof maxBudget === "number" && Number.isFinite(maxBudget) && maxBudget >= 0))
    ) {
      return null;
    }

    const defaults = createInitialState();
    const proposals = Array.isArray(value.proposals)
      ? value.proposals.filter(isProposal)
      : defaults.proposals;
    const ownedProposals = proposals.filter((proposal) =>
      PROBLEMS.some(
        (problem) => problem.id === proposal.problemId && problem.company.id === proposal.companyId,
      ),
    );
    const matches = (Array.isArray(value.matches) ? value.matches.filter(isMatch) : defaults.matches)
      .filter((match) =>
        ownedProposals.some(
          (proposal) =>
            proposal.id === match.proposalId &&
            proposal.problemId === match.problemId &&
            proposal.companyId === match.companyId &&
            proposal.freelancer.id === match.freelancerId,
        ),
      );

    return {
      role,
      problemInteractions: {
        ...defaults.problemInteractions,
        ...readInteractionMap(value.problemInteractions, isFreelancerProblemInteraction),
      },
      proposalInteractions: {
        ...defaults.proposalInteractions,
        ...readInteractionMap(value.proposalInteractions, isCompanyProposalInteraction),
      },
      proposals: ownedProposals,
      matches,
      preferences: { preferredHashtags: tags, maxBudget },
    };
  } catch {
    return null;
  }
}

function updateMap<T extends string>(
  current: Record<string, T>,
  key: string,
  value: T | undefined,
): Record<string, T> {
  const next = { ...current };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredState();
    if (stored) setState(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...state }));
    } catch {
      // Demo interactions remain usable for this tab when browser storage is unavailable.
    }
  }, [hydrated, state]);

  const setRole = useCallback((role: DemoRole) => {
    setState((current) => ({ ...current, role }));
  }, []);

  const setProblemInteraction = useCallback(
    (problemId: string, interaction: FreelancerProblemInteraction | null) => {
      setState((current) => {
        const next = transitionFreelancerProblem(
          current.problemInteractions[problemId],
          interaction,
        );
        if (next === current.problemInteractions[problemId]) return current;
        return {
          ...current,
          problemInteractions: updateMap(current.problemInteractions, problemId, next),
        };
      });
    },
    [],
  );

  const submitProposal = useCallback((problemId: string, draft: ProposalDraft) => {
    const problem = PROBLEMS.find((item) => item.id === problemId);
    const currentInteraction = state.problemInteractions[problemId];
    if (
      state.role !== "freelancer" ||
      !problem ||
      (currentInteraction !== undefined && currentInteraction !== "unseen" && currentInteraction !== "saved")
    ) {
      return null;
    }

    const proposalId = `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const proposal: SolutionProposal = {
      ...draft,
      id: proposalId,
      problemId,
      companyId: problem.company.id,
      freelancer: DEMO_FREELANCER,
    };

    setState((current) => {
      const nextInteraction = transitionFreelancerProblem(
        current.problemInteractions[problemId],
        "proposal_submitted",
      );
      if (nextInteraction !== "proposal_submitted") return current;
      return {
        ...current,
        proposals: [proposal, ...current.proposals],
        problemInteractions: updateMap(
          current.problemInteractions,
          problemId,
          nextInteraction,
        ),
      };
    });
    return proposalId;
  }, [state]);

  const setProposalInteraction = useCallback(
    (proposalId: string, interaction: Exclude<CompanyProposalInteraction, "interested" | "unseen"> | null) => {
      setState((current) => {
        if (
          current.role !== "company" ||
          !current.proposals.some(
            (proposal) => proposal.id === proposalId && proposal.companyId === DEMO_COMPANY_ID,
          )
        ) {
          return current;
        }
        const next = transitionCompanyProposal(
          current.proposalInteractions[proposalId],
          interaction,
        );
        if (next === current.proposalInteractions[proposalId]) return current;
        return {
          ...current,
          proposalInteractions: updateMap(current.proposalInteractions, proposalId, next),
        };
      });
    },
    [],
  );

  const markProposalInterested = useCallback((proposalId: string): Match | null => {
    const proposal = state.proposals.find(
      (item) => item.id === proposalId && item.companyId === DEMO_COMPANY_ID,
    );
    const problem = proposal
      ? PROBLEMS.find(
          (item) => item.id === proposal.problemId && item.company.id === DEMO_COMPANY_ID,
        )
      : undefined;
    const proposalInteraction = state.proposalInteractions[proposalId];
    if (
      state.role !== "company" ||
      !proposal ||
      (proposalInteraction !== undefined && proposalInteraction !== "unseen")
    ) return null;
    const createdMatch = createMatchForInterestedProposal(
      proposal,
      problem,
      DEMO_COMPANY_ID,
      state.matches,
      new Date().toISOString(),
    );
    if (!createdMatch) return null;

    setState((current) => {
      const currentInteraction = current.proposalInteractions[proposalId];
      if (
        current.role !== "company" ||
        (currentInteraction !== undefined && currentInteraction !== "unseen") ||
        current.matches.some((match) => match.proposalId === proposalId)
      ) return current;
      return {
        ...current,
        proposalInteractions: updateMap(
          current.proposalInteractions,
          proposalId,
          "interested",
        ),
        matches: [createdMatch, ...current.matches],
      };
    });
    return createdMatch;
  }, [state]);

  const setPreferences = useCallback((preferences: FreelancerPreferences) => {
    setState((current) => ({ ...current, preferences }));
  }, []);

  const resetDemoState = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Reset still applies to the current tab when browser storage is unavailable.
    }
    setState(createInitialState());
  }, []);

  const store = useMemo<DemoStore>(
    () => ({
      ...state,
      hydrated,
      setRole,
      setProblemInteraction,
      submitProposal,
      setProposalInteraction,
      markProposalInterested,
      setPreferences,
      resetDemoState,
    }),
    [
      state,
      hydrated,
      setRole,
      setProblemInteraction,
      submitProposal,
      setProposalInteraction,
      markProposalInterested,
      setPreferences,
      resetDemoState,
    ],
  );

  return <DemoStoreContext.Provider value={store}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore(): DemoStore {
  const value = useContext(DemoStoreContext);
  if (!value) throw new Error("useDemoStore must be used within DemoStoreProvider");
  return value;
}
