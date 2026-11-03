import { beforeEach, describe, expect, it, vi } from "vitest";
import { listMyMatches, listProblemProposals, setProposalInteraction } from "@/lib/company-inbox-service";
import { withdrawProposal } from "@/lib/proposal-service";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({ rpc: mocks.rpc }),
}));

const proposal = {
  id: "proposal-a",
  problem_id: "problem-id",
  freelancer_id: "freelancer-id",
  freelancer_name: "Profesional",
  freelancer_slug: null,
  headline: null,
  diagnosis: "Diagnóstico",
  solution: "Solución",
  deliverables: "Entregables",
  timeline: "Un mes",
  price: 999.99,
  currency: "USD",
  recurring_costs: "Costos",
  maintenance_warranty: "Garantía",
  related_experience: "Experiencia",
  submitted_at: "2026-11-02T00:00:00Z",
  my_state: null,
  match_id: null,
};

beforeEach(() => vi.resetAllMocks());

describe("company inbox service", () => {
  it("maps every comparison field, preserves order and maps no row to unseen", async () => {
    mocks.rpc.mockResolvedValue({ data: [proposal, {
      ...proposal, id: "proposal-b", price: 5.25, currency: "PEN", my_state: "interested", match_id: "match-id",
    }], error: null });
    const items = await listProblemProposals("problem-id");
    expect(mocks.rpc).toHaveBeenCalledWith("list_problem_proposals", { p_problem_id: "problem-id" });
    expect(items).toEqual([{
      id: "proposal-a", problemId: "problem-id", freelancerId: "freelancer-id",
      freelancerName: "Profesional", freelancerSlug: null, headline: null,
      diagnosis: "Diagnóstico", solution: "Solución", deliverables: "Entregables", timeline: "Un mes",
      price: 999.99, currency: "USD", recurringCosts: "Costos", maintenanceWarranty: "Garantía",
      relatedExperience: "Experiencia", submittedAt: "2026-11-02T00:00:00Z", myState: "unseen", matchId: null,
    }, {
      id: "proposal-b", problemId: "problem-id", freelancerId: "freelancer-id",
      freelancerName: "Profesional", freelancerSlug: null, headline: null,
      diagnosis: "Diagnóstico", solution: "Solución", deliverables: "Entregables", timeline: "Un mes",
      price: 5.25, currency: "PEN", recurringCosts: "Costos", maintenanceWarranty: "Garantía",
      relatedExperience: "Experiencia", submittedAt: "2026-11-02T00:00:00Z", myState: "interested", matchId: "match-id",
    }]);
  });

  it("returns the actual server state, including unseen for a no-op or undo", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "saved", error: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(setProposalInteraction("p", "interested")).resolves.toBe("saved");
    await expect(setProposalInteraction("p", null)).resolves.toBe("unseen");
    await expect(setProposalInteraction("p", "unseen")).resolves.toBe("unseen");
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "set_proposal_interaction", { p_proposal_id: "p", p_next: "interested" });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "set_proposal_interaction", { p_proposal_id: "p", p_next: null });
  });

  it("maps matches and allows a hidden counterpart name", async () => {
    mocks.rpc.mockResolvedValue({ data: [{
      match_id: "m", problem_id: "p", proposal_id: "s", counterpart_name: null,
      problem_title: "Problema", created_at: "2026-11-02T00:00:00Z",
    }], error: null });
    await expect(listMyMatches()).resolves.toEqual([{
      matchId: "m", problemId: "p", proposalId: "s", counterpartName: null,
      problemTitle: "Problema", createdAt: "2026-11-02T00:00:00Z",
    }]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_my_matches", {});
  });

  it("rejects malformed responses without silently dropping rows", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ ...proposal, currency: "EUR" }], error: null });
    mocks.rpc.mockResolvedValueOnce({ data: [{ ...proposal, price: "999.99" }], error: null });
    mocks.rpc.mockResolvedValueOnce({ data: [{ ...proposal, my_state: "unseen" }], error: null });
    mocks.rpc.mockResolvedValueOnce({ data: [{ match_id: "m" }], error: null });
    mocks.rpc.mockResolvedValueOnce({ data: "unseen", error: null });
    await expect(listProblemProposals("p")).rejects.toThrow("No pudimos cargar");
    await expect(listProblemProposals("p")).rejects.toThrow("No pudimos cargar");
    await expect(listProblemProposals("p")).rejects.toThrow("No pudimos cargar");
    await expect(listMyMatches()).rejects.toThrow("No pudimos cargar");
    await expect(setProposalInteraction("p", "saved")).rejects.toThrow("No pudimos confirmar");
  });

  it("translates new database errors, including withdrawal after a match", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "proposal withdrawn" } });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "open or paused problem required for interaction" } });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "submitted proposal required" } });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "invalid proposal interaction state" } });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "proposal already matched" } });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "account required" } });
    await expect(setProposalInteraction("p", "interested")).rejects.toThrow("retiró esta propuesta");
    await expect(setProposalInteraction("p", "saved")).rejects.toThrow("abierto o pausado");
    await expect(setProposalInteraction("p", "saved")).rejects.toThrow("propuesta enviada");
    await expect(setProposalInteraction("p", "saved")).rejects.toThrow("acción seleccionada");
    await expect(withdrawProposal("p")).rejects.toThrow("ya tiene un Match y no puede retirarse");
    await expect(listMyMatches()).rejects.toThrow("No encontramos una cuenta de MatchWork");
  });
});
