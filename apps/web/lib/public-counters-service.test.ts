import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SUPABASE_URL = "http://127.0.0.1:55421";
const counters = { open_problems: 5, companies_published: 2, freelancers_active: 4, proposals_submitted: 1 };
const fetchMock = vi.fn();
const response = (rows: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => rows });

describe("public counters service", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    storage = new Map();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
    vi.stubGlobal("window", { sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } });
    fetchMock.mockReset().mockResolvedValue(response([counters]));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("calls the public RPC with the public key only, without loading supabase-js", async () => {
    const service = await import("@/lib/public-counters-service");
    expect(await service.getPublicCounters()).toEqual(counters);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SUPABASE_URL}/rest/v1/rpc/get_public_counters`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ apikey: "public-key", authorization: "Bearer public-key" });
  });

  it("uses memory and session storage for 60 seconds, then fetches again", async () => {
    let service = await import("@/lib/public-counters-service");
    expect(await service.getPublicCounters()).toEqual(counters);
    expect(await service.getPublicCounters()).toEqual(counters);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.resetModules();
    service = await import("@/lib/public-counters-service");
    expect(await service.getPublicCounters()).toEqual(counters);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(await service.getPublicCounters()).toEqual(counters);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null without configuration, on request failure, or for invalid rows", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.resetModules();
    let service = await import("@/lib/public-counters-service");
    expect(await service.getPublicCounters()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    vi.resetModules();
    service = await import("@/lib/public-counters-service");
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await service.getPublicCounters()).toBeNull();
    fetchMock.mockResolvedValueOnce(response([], false));
    expect(await service.getPublicCounters()).toBeNull();
    fetchMock.mockResolvedValueOnce(response([{ ...counters, open_problems: -1 }]));
    expect(await service.getPublicCounters()).toBeNull();
    fetchMock.mockResolvedValueOnce(response([counters, counters]));
    expect(await service.getPublicCounters()).toBeNull();
  });

  it("survives unavailable storage and shares concurrent requests", async () => {
    vi.stubGlobal("window", { get sessionStorage(): never { throw new Error("storage blocked"); } });
    const service = await import("@/lib/public-counters-service");
    const [first, second] = await Promise.all([service.getPublicCounters(), service.getPublicCounters()]);
    expect(first).toEqual(counters);
    expect(second).toEqual(counters);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await service.getPublicCounters()).toEqual(counters);
  });

  it("ignores corrupt, expired, and future session cache entries", async () => {
    const key = `matchwork-public-counters:${SUPABASE_URL}`;
    storage.set(key, "invalid json");
    let service = await import("@/lib/public-counters-service");
    expect(await service.getPublicCounters()).toEqual(counters);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const savedAt of [Date.now() - 60_000, Date.now() + 1]) {
      storage.set(key, JSON.stringify({ savedAt, data: counters }));
      vi.resetModules();
      service = await import("@/lib/public-counters-service");
      expect(await service.getPublicCounters()).toEqual(counters);
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
