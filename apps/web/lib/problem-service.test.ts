import { describe, expect, it, vi } from "vitest";
import { sendMessage } from "@/lib/chat-service";
import { setProposalInteraction } from "@/lib/company-inbox-service";
import { setProblemInteraction } from "@/lib/interaction-service";
import { listOpenBusinessProblems, publishBusinessProblem, retryAfterSeconds, toFriendlyError } from "@/lib/problem-service";
import { createEmptyProposalDraft } from "@/lib/proposal-domain";
import { saveProposalDraft } from "@/lib/proposal-service";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseClient: () => ({ rpc: mocks.rpc }), loadSupabaseClient: async () => ({ rpc: mocks.rpc }) }));

describe("public problem listing", () => {
  it("preserves the success criteria exposed by the public RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: "p", company_verified: true, success_criteria: "Reducir el tiempo de atención" }], error: null });
    await expect(listOpenBusinessProblems()).resolves.toEqual([
      expect.objectContaining({ id: "p", companyVerified: true, successCriteria: "Reducir el tiempo de atención" }),
    ]);
  });
});

describe("service errors", () => {
  it.each(["rate limit exceeded", "message rate limit: maximum 30 messages per minute"])("explains %s without blaming the user", (message) => {
    expect(toFriendlyError(message)).toBe(
      "Hiciste muchas acciones seguidas. Espera un momento y vuelve a intentarlo.",
    );
  });

  it("tells the user how long to wait when the server sends the retry hint", () => {
    expect(toFriendlyError("rate limit exceeded", "Retry after 45 seconds.")).toBe("Hiciste muchas acciones seguidas. Espera 45 segundos y vuelve a intentarlo.");
    expect(toFriendlyError("rate limit exceeded", "Retry after 1 seconds.")).toBe("Hiciste muchas acciones seguidas. Espera 1 segundo y vuelve a intentarlo.");
    expect(toFriendlyError("rate limit exceeded", "Retry after 61 seconds.")).toBe("Hiciste muchas acciones seguidas. Espera 2 minutos y vuelve a intentarlo.");
    expect(toFriendlyError("rate limit exceeded", "Retry after 0 seconds.")).toBe("Hiciste muchas acciones seguidas. Espera 1 segundo y vuelve a intentarlo.");
    expect(toFriendlyError("rate limit exceeded", "something else")).toBe("Hiciste muchas acciones seguidas. Espera un momento y vuelve a intentarlo.");
    expect(retryAfterSeconds(null)).toBeNull();
  });

  it("forwards the retry hint from the RPC error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "rate limit exceeded", hint: "Retry after 30 seconds." } });
    await expect(sendMessage("match", "Hola")).rejects.toThrow("Espera 30 segundos");
  });

  it("propagates the same quota message through the proposal, deck, inbox, publishing and chat services", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "rate limit exceeded" } });
    const message = "Hiciste muchas acciones seguidas. Espera un momento y vuelve a intentarlo.";

    await expect(saveProposalDraft("problem", createEmptyProposalDraft())).rejects.toThrow(message);
    await expect(setProblemInteraction("problem", "saved")).rejects.toThrow(message);
    await expect(setProposalInteraction("proposal", "saved")).rejects.toThrow(message);
    await expect(publishBusinessProblem("problem")).rejects.toThrow(message);
    await expect(sendMessage("match", "Hola")).rejects.toThrow(message);
  });
});
