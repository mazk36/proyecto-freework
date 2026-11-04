import { describe, expect, it } from "vitest";
import { COUNTER_DURATION_MS, formatPublicCounter, interpolateCounter, parsePublicCounters } from "@/lib/public-counters";

describe("public counters", () => {
  it("formats Peruvian numbers and gives zero an honest empty state", () => {
    expect(formatPublicCounter(0)).toBe("Sé de los primeros");
    expect(formatPublicCounter(1)).toBe("1");
    expect(formatPublicCounter(1234567)).toBe("1,234,567");
  });

  it("interpolates once over 1.2 seconds with a bounded ease-out", () => {
    expect(COUNTER_DURATION_MS).toBe(1200);
    expect(interpolateCounter(100, -1)).toBe(0);
    expect(interpolateCounter(100, 0)).toBe(0);
    expect(interpolateCounter(100, 600)).toBeGreaterThan(50);
    expect(interpolateCounter(100, 600)).toBeLessThan(100);
    expect(interpolateCounter(100, 1200)).toBe(100);
    expect(interpolateCounter(100, 1500)).toBe(100);
    expect(interpolateCounter(0, 600)).toBe(0);
  });

  it("rejects incomplete, negative, fractional and unsafe API data", () => {
    const valid = { open_problems: 2, companies_published: 1, freelancers_active: 3, proposals_submitted: 0 };
    expect(parsePublicCounters(valid)).toEqual(valid);
    expect(parsePublicCounters({ ...valid, open_problems: -1 })).toBeNull();
    expect(parsePublicCounters({ ...valid, freelancers_active: 1.5 })).toBeNull();
    expect(parsePublicCounters({ ...valid, companies_published: Number.MAX_SAFE_INTEGER + 1 })).toBeNull();
    expect(parsePublicCounters({ ...valid, proposals_submitted: "0" })).toBeNull();
    expect(parsePublicCounters({ open_problems: 2 })).toBeNull();
  });
});
