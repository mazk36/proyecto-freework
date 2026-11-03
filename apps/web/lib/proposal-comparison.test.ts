import { describe, expect, it } from "vitest";
import { toggleCompare } from "@/lib/proposal-comparison";

describe("proposal comparison selection", () => {
  it("adds up to three different proposals in selection order without mutating the input", () => {
    const selected = ["a", "b"];
    expect(toggleCompare(selected, "c")).toEqual(["a", "b", "c"]);
    expect(selected).toEqual(["a", "b"]);
    expect(toggleCompare(["a", "b", "c"], "d")).toEqual(["a", "b", "c"]);
  });

  it("removes an already selected proposal even when at the limit", () => {
    expect(toggleCompare(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("supports a smaller limit but never exceeds three", () => {
    expect(toggleCompare(["a"], "b", 1)).toEqual(["a"]);
    expect(toggleCompare([], "a", 0)).toEqual([]);
    expect(toggleCompare(["a", "b", "c"], "d", 10)).toEqual(["a", "b", "c"]);
  });
});
