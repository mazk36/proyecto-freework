import { describe, expect, it } from "vitest";
import { toastQueueReducer, type ToastEntry } from "@/lib/toast-queue";

function toast(id: string): ToastEntry {
  return { id, title: id, tone: "neutral", durationMs: 6000, state: "visible" };
}

describe("toastQueueReducer", () => {
  it("keeps the three newest notices without mutating the previous queue", () => {
    const previous = [toast("1"), toast("2"), toast("3")];
    const next = toastQueueReducer(previous, { type: "add", toast: toast("4") });
    expect(next.map((item) => item.id)).toEqual(["2", "3", "4"]);
    expect(previous.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it.each(["dismiss", "expire"] as const)("marks %s notices for their exit animation", (type) => {
    const previous = [toast("1"), toast("2")];
    const next = toastQueueReducer(previous, { type, id: "1" });
    expect(next[0].state).toBe("closing");
    expect(next[1].state).toBe("visible");
    expect(previous[0].state).toBe("visible");
    expect(toastQueueReducer(next, { type: "remove", id: "1" }).map((item) => item.id)).toEqual(["2"]);
  });

  it("ignores removal and expiration of notices that no longer exist", () => {
    const queue = [toast("1")];
    expect(toastQueueReducer(queue, { type: "remove", id: "missing" })).toEqual(queue);
    expect(toastQueueReducer(queue, { type: "expire", id: "missing" })).toEqual(queue);
  });
});
