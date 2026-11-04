import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ callRpc: vi.fn(), getClient: vi.fn() }));
vi.mock("@/lib/problem-service", () => ({ callRpc: mocks.callRpc }));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseClient: mocks.getClient }));

const counters = { open_problems: 5, companies_published: 2, freelancers_active: 4, proposals_submitted: 1 };

describe("public counters service", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    storage = new Map();
    vi.stubGlobal("window", { sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } });
    mocks.getClient.mockReturnValue({});
    mocks.callRpc.mockReset().mockResolvedValue([counters]);
  });

  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("uses memory and session storage for 60 seconds, then fetches again", async () => {
    let service = await import("@/lib/public-counters-service");
    expect(await service.getPublicCounters()).toEqual(counters);
    expect(await service.getPublicCounters()).toEqual(counters);
    expect(mocks.callRpc).toHaveBeenCalledTimes(1);
    vi.resetModules();
    service = await import("@/lib/public-counters-service");
    expect(await service.getPublicCounters()).toEqual(counters);
    expect(mocks.callRpc).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(await service.getPublicCounters()).toEqual(counters);
    expect(mocks.callRpc).toHaveBeenCalledTimes(2);
  });

  it("returns null without configuration, on RPC failure, or for invalid rows", async () => {
    const service = await import("@/lib/public-counters-service");
    mocks.getClient.mockReturnValueOnce(null);
    expect(await service.getPublicCounters()).toBeNull();
    expect(mocks.callRpc).not.toHaveBeenCalled();
    mocks.callRpc.mockRejectedValueOnce(new Error("offline"));
    expect(await service.getPublicCounters()).toBeNull();
    mocks.callRpc.mockResolvedValueOnce([{ ...counters, open_problems: -1 }]);
    expect(await service.getPublicCounters()).toBeNull();
    mocks.callRpc.mockResolvedValueOnce([counters, counters]);
    expect(await service.getPublicCounters()).toBeNull();
  });

  it("survives unavailable storage and shares concurrent requests", async () => {
    vi.stubGlobal("window", { get sessionStorage(): never { throw new Error("storage blocked"); } });
    const service = await import("@/lib/public-counters-service");
    const [first, second] = await Promise.all([service.getPublicCounters(), service.getPublicCounters()]);
    expect(first).toEqual(counters);
    expect(second).toEqual(counters);
    expect(mocks.callRpc).toHaveBeenCalledTimes(1);
    expect(await service.getPublicCounters()).toEqual(counters);
  });

  it("ignores corrupt, expired, and future session cache entries", async () => {
    const key = "matchwork-public-counters:";
    storage.set(key, "invalid json");
    let service = await import("@/lib/public-counters-service");
    expect(await service.getPublicCounters()).toEqual(counters);
    expect(mocks.callRpc).toHaveBeenCalledTimes(1);
    for (const savedAt of [Date.now() - 60_000, Date.now() + 1]) {
      storage.set(key, JSON.stringify({ savedAt, data: counters }));
      vi.resetModules();
      service = await import("@/lib/public-counters-service");
      expect(await service.getPublicCounters()).toEqual(counters);
    }
    expect(mocks.callRpc).toHaveBeenCalledTimes(3);
  });
});
