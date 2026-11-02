import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProblemInteractionState,
  listMyProblemInteractions,
  setProblemInteraction,
} from "@/lib/interaction-service";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({ rpc: mocks.rpc }),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("problem interaction service", () => {
  it("calls the transition RPC and maps a deleted row to unseen", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "saved", error: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(setProblemInteraction("problem-id", "saved")).resolves.toBe("saved");
    await expect(setProblemInteraction("problem-id", null)).resolves.toBe("unseen");
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "set_problem_interaction", {
      p_problem_id: "problem-id", p_next: "saved",
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "set_problem_interaction", {
      p_problem_id: "problem-id", p_next: null,
    });
  });

  it("maps the list and treats an absent problem as unseen", async () => {
    mocks.rpc.mockResolvedValue({ data: [
      { problem_id: "problem-id", state: "dismissed", updated_at: "2026-11-02T00:00:00Z" },
    ], error: null });
    const interactions = await listMyProblemInteractions();
    expect(mocks.rpc).toHaveBeenCalledWith("list_my_problem_interactions", {});
    expect(interactions).toEqual([{
      problemId: "problem-id", state: "dismissed", updatedAt: "2026-11-02T00:00:00Z",
    }]);
    expect(getProblemInteractionState(interactions, "problem-id")).toBe("dismissed");
    expect(getProblemInteractionState(interactions, "other-problem")).toBe("unseen");
  });

  it("rejects malformed RPC responses instead of treating them as unseen", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "unseen", error: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    mocks.rpc.mockResolvedValueOnce({ data: [{ problem_id: "p", state: "saved" }], error: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(setProblemInteraction("p", "saved")).rejects.toThrow("No pudimos confirmar");
    await expect(setProblemInteraction("p", "saved")).rejects.toThrow("No pudimos confirmar");
    await expect(listMyProblemInteractions()).rejects.toThrow("No pudimos cargar");
    await expect(listMyProblemInteractions()).rejects.toThrow("No pudimos cargar");
  });

  it("translates the new database errors", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "open problem required for interaction" } });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "invalid problem interaction state" } });
    await expect(setProblemInteraction("p", "saved")).rejects.toThrow("Este problema ya no está disponible para esta acción.");
    await expect(setProblemInteraction("p", "dismissed")).rejects.toThrow("La acción seleccionada para este problema no es válida.");
  });
});
