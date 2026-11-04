import { describe, expect, it, vi } from "vitest";
import { sendMessage } from "@/lib/chat-service";
import { setProposalInteraction } from "@/lib/company-inbox-service";
import { setProblemInteraction } from "@/lib/interaction-service";
import { listOpenBusinessProblems, listOpenProblemsByIds, listOpenProblemsPage, publishBusinessProblem, retryAfterSeconds, toFriendlyError } from "@/lib/problem-service";
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

describe("paged public problem listing", () => {
  const row = (id: string) => ({ id, title: `Problema ${id}`, company_verified: false, published_at: "2026-11-01T10:00:00Z" });

  it("asks for a page with the cursor and excludes interacted problems by default", async () => {
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: [row("a")], error: null });
    const page = await listOpenProblemsPage({ before: { publishedAt: "2026-11-02T00:00:00Z", id: "z" } });
    expect(page).toEqual([expect.objectContaining({ id: "a" })]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_open_problems_page", {
      p_limit: 40, p_before_published_at: "2026-11-02T00:00:00Z", p_before_id: "z", p_exclude_interacted: true,
    });
  });

  it("can include interacted problems for the explore page", async () => {
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    await listOpenProblemsPage({ excludeInteracted: false, limit: 20 });
    expect(mocks.rpc).toHaveBeenCalledWith("list_open_problems_page", { p_limit: 20, p_before_published_at: null, p_before_id: null, p_exclude_interacted: false });
  });

  it("splits id lookups in batches of 100 and removes duplicates", async () => {
    mocks.rpc.mockReset();
    mocks.rpc.mockImplementation(async (_name: string, args: { p_ids: string[] }) => ({ data: args.p_ids.map(row), error: null }));
    const ids = Array.from({ length: 230 }, (_, index) => `id-${index}`);
    const result = await listOpenProblemsByIds([...ids, "id-1", "id-2"]);
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(230);
    expect(mocks.rpc.mock.calls.map((call) => call[1].p_ids.length)).toEqual([100, 100, 30]);
  });

  it("does not call the server when there are no ids", async () => {
    mocks.rpc.mockReset();
    await expect(listOpenProblemsByIds([])).resolves.toEqual([]);
    expect(mocks.rpc).not.toHaveBeenCalled();
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
