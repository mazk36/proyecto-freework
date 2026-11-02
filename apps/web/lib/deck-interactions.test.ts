import { describe, expect, it, vi } from "vitest";
import { persistDeckInteraction } from "@/lib/deck-interactions";

describe("persistDeckInteraction", () => {
  it("confirms successful decisions and undo using the expected RPC arguments", async () => {
    const write = vi.fn().mockResolvedValueOnce("saved").mockResolvedValueOnce("unseen");
    await expect(persistDeckInteraction(write, "p", "saved", "unseen")).resolves.toEqual({ state: "saved", confirmed: true });
    await expect(persistDeckInteraction(write, "p", null, "saved")).resolves.toEqual({ state: "unseen", confirmed: true });
    expect(write).toHaveBeenNthCalledWith(1, "p", "saved");
    expect(write).toHaveBeenNthCalledWith(2, "p", null);
  });

  it("returns the original state when either the decision or undo fails", async () => {
    const write = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(persistDeckInteraction(write, "p", "dismissed", "unseen")).resolves.toEqual({ state: "unseen", confirmed: false });
    await expect(persistDeckInteraction(write, "p", null, "dismissed")).resolves.toEqual({ state: "dismissed", confirmed: false });
  });

  it("keeps the actual server state when a concurrent transition has already occurred", async () => {
    const write = vi.fn().mockResolvedValue("proposal_submitted");
    await expect(persistDeckInteraction(write, "p", null, "saved")).resolves.toEqual({ state: "proposal_submitted", confirmed: false });
  });
});
