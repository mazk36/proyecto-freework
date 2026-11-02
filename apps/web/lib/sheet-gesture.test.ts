import { describe, expect, it } from "vitest";
import { shouldCloseSheet } from "@/lib/sheet-gesture";

describe("shouldCloseSheet", () => {
  it("closes only after crossing the downward distance threshold", () => {
    expect(shouldCloseSheet(120, 0)).toBe(false);
    expect(shouldCloseSheet(121, 0)).toBe(true);
    expect(shouldCloseSheet(-150, 0)).toBe(false);
  });

  it("closes on a fast downward flick but not on an upward gesture", () => {
    expect(shouldCloseSheet(20, 500)).toBe(false);
    expect(shouldCloseSheet(20, 501)).toBe(true);
    expect(shouldCloseSheet(20, -800)).toBe(false);
    expect(shouldCloseSheet(0, 800)).toBe(true);
  });
});
