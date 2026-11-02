import { describe, expect, it, vi } from "vitest";
import { listOpenBusinessProblems } from "@/lib/problem-service";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseClient: () => ({ rpc: mocks.rpc }) }));

describe("public problem listing", () => {
  it("preserves the success criteria exposed by the public RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: "p", success_criteria: "Reducir el tiempo de atención" }], error: null });
    await expect(listOpenBusinessProblems()).resolves.toEqual([
      expect.objectContaining({ id: "p", successCriteria: "Reducir el tiempo de atención" }),
    ]);
  });
});
