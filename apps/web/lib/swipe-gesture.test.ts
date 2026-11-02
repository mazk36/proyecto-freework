import { describe, expect, it } from "vitest";
import { decideSwipe } from "@/lib/swipe-gesture";

describe("decideSwipe", () => {
  it("uses strict distance and velocity thresholds", () => {
    expect(decideSwipe(120, 500, 300).decision).toBeNull();
    expect(decideSwipe(-120, -500, 300).decision).toBeNull();
    expect(decideSwipe(120.01, 0, 300).decision).toBe("like");
    expect(decideSwipe(-120.01, 0, 300).decision).toBe("dismiss");
    expect(decideSwipe(0, 500.01, 300).decision).toBe("like");
    expect(decideSwipe(0, -500.01, 300).decision).toBe("dismiss");
  });

  it("uses distance direction when it crosses its threshold, otherwise the velocity direction", () => {
    expect(decideSwipe(121, -700, 300).decision).toBe("like");
    expect(decideSwipe(-30, 700, 300).decision).toBe("like");
  });

  it("clamps rotation and interpolates both labels from 40 to 120 pixels", () => {
    expect(decideSwipe(40, 0, 300).labelOpacity).toBe(0);
    expect(decideSwipe(-40, 0, 300).labelOpacity).toBe(0);
    expect(decideSwipe(80, 0, 300).labelOpacity).toBe(0.5);
    expect(decideSwipe(-120, 0, 300).labelOpacity).toBe(1);
    expect(decideSwipe(400, 0, 300).rotationDeg).toBe(12);
    expect(decideSwipe(-400, 0, 300).rotationDeg).toBe(-12);
    expect(decideSwipe(100, 0, 300).rotationDeg).toBe(5);
  });

  it("returns signed exit targets, including zero width, only for a decision", () => {
    expect(decideSwipe(121, 0, 300).exitTarget).toEqual({ x: 360, rotationDeg: 18 });
    expect(decideSwipe(-121, 0, 300).exitTarget).toEqual({ x: -360, rotationDeg: -18 });
    expect(decideSwipe(121, 0, 0).exitTarget).toEqual({ x: 0, rotationDeg: 18 });
    expect(decideSwipe(0, 0, 300).exitTarget).toBeNull();
  });
});
