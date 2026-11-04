"use client";

import { parsePublicCounters, type PublicCounters } from "@/lib/public-counters";

const CACHE_DURATION_MS = 60_000;
const CACHE_KEY = `matchwork-public-counters:${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}`;
type CachedCounters = { savedAt: number; data: PublicCounters };
let memoryCache: CachedCounters | null = null;
let pendingRequest: Promise<PublicCounters | null> | null = null;

function validCache(value: unknown): CachedCounters | null {
  if (!value || typeof value !== "object") return null;
  const cache = value as { savedAt?: unknown; data?: unknown };
  const data = parsePublicCounters(cache.data);
  if (typeof cache.savedAt !== "number" || !Number.isFinite(cache.savedAt) || !data) return null;
  const age = Date.now() - cache.savedAt;
  return age >= 0 && age < CACHE_DURATION_MS ? { savedAt: cache.savedAt, data } : null;
}

function readSessionCache(): CachedCounters | null {
  try {
    const stored = window.sessionStorage.getItem(CACHE_KEY);
    return stored ? validCache(JSON.parse(stored) as unknown) : null;
  } catch {
    return null;
  }
}

function saveCache(data: PublicCounters): void {
  memoryCache = { savedAt: Date.now(), data };
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    // Storage can be disabled; the in-memory cache remains usable.
  }
}

/** Calls the public aggregates RPC directly so the landing does not have to load supabase-js. */
async function fetchPublicCounters(): Promise<unknown> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) throw new Error("not configured");
  const response = await fetch(`${url}/rest/v1/rpc/get_public_counters`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new Error(`counters request failed: ${response.status}`);
  return response.json() as Promise<unknown>;
}

export async function getPublicCounters(): Promise<PublicCounters | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) return null;
  const cached = validCache(memoryCache) ?? readSessionCache();
  if (cached) {
    memoryCache = cached;
    return cached.data;
  }
  if (pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    try {
      const rows = await fetchPublicCounters();
      const counters = Array.isArray(rows) && rows.length === 1 ? parsePublicCounters(rows[0]) : null;
      if (counters) saveCache(counters);
      return counters;
    } catch {
      return null;
    }
  })();
  try {
    return await pendingRequest;
  } finally {
    pendingRequest = null;
  }
}
