import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProposalDraft } from "@/lib/proposal-domain";
import { listMyProposals, saveProposalDraft, submitProposal, withdrawProposal } from "@/lib/proposal-service";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({ rpc: mocks.rpc, auth: { getUser: mocks.getUser }, from: mocks.from }), loadSupabaseClient: async () => ({ rpc: mocks.rpc, auth: { getUser: mocks.getUser }, from: mocks.from }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({ data: "proposal-id", error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "author-id" } }, error: null });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ order: mocks.order });
});

describe("proposal service", () => {
  it("calls each RPC with its expected arguments", async () => {
    await expect(saveProposalDraft("problem-id", createEmptyProposalDraft())).resolves.toBe("proposal-id");
    expect(mocks.rpc).toHaveBeenCalledWith("save_proposal_draft", expect.objectContaining({
      p_problem_id: "problem-id", p_data: expect.objectContaining({ price: null, currency: "PEN" }),
    }));
    await submitProposal("proposal-id");
    await withdrawProposal("proposal-id");
    expect(mocks.rpc).toHaveBeenCalledWith("submit_proposal", { p_proposal_id: "proposal-id" });
    expect(mocks.rpc).toHaveBeenCalledWith("withdraw_proposal", { p_proposal_id: "proposal-id" });
  });

  it("filters by author and maps every proposal field", async () => {
    mocks.order.mockResolvedValue({ data: [{
      id: "proposal-id", problem_id: "problem-id", problem_title_snapshot: "Título original", freelancer_id: "author-id", status: "submitted",
      diagnosis: "Diagnóstico", solution: "Solución", deliverables: "Informe", timeline: "Dos semanas",
      price: 30.5, currency: "USD", recurring_costs: "Costos", maintenance_warranty: "Garantía",
      related_experience: "Experiencia", submitted_at: "submitted", created_at: "created", updated_at: "updated",
    }], error: null });
    await expect(listMyProposals()).resolves.toEqual([{
      id: "proposal-id", problemId: "problem-id", problemTitleSnapshot: "Título original", freelancerId: "author-id", status: "submitted",
      diagnosis: "Diagnóstico", solution: "Solución", deliverables: "Informe", timeline: "Dos semanas",
      price: 30.5, currency: "USD", recurringCosts: "Costos", maintenanceWarranty: "Garantía",
      relatedExperience: "Experiencia", submittedAt: "submitted", createdAt: "created", updatedAt: "updated",
    }]);
    expect(mocks.eq).toHaveBeenCalledWith("freelancer_id", "author-id");
  });

  it("reports RPC and authentication failures in Spanish", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "open problem required" } });
    await expect(submitProposal("proposal-id")).rejects.toThrow("Este problema ya no está disponible para recibir propuestas.");
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(listMyProposals()).rejects.toThrow("Inicia sesión para continuar.");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each([
    ["proposal field too long", "Uno de los campos de tu propuesta supera el límite de caracteres permitido."],
    ["invalid proposal price", "Ingresa un precio mayor o igual a cero, menor a 10,000 millones y con máximo dos decimales."],
  ])("translates the %s RPC error", async (message, expected) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message } });
    await expect(saveProposalDraft("problem-id", createEmptyProposalDraft())).rejects.toThrow(expected);
  });
});
