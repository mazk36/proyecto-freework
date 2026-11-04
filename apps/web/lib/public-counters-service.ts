"use client";

import { callRpc } from "@/lib/problem-service";
import { parsePublicCounters, type PublicCounters } from "@/lib/public-counters";
import { getSupabaseClient } from "@/lib/supabase/client";

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

export async function getPublicCounters(): Promise<PublicCounters | null> {
  if (!getSupabaseClient()) return null;
  const cached = validCache(memoryCache) ?? readSessionCache();
  if (cached) {
    memoryCache = cached;
    return cached.data;
  }
  if (pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    try {
      const rows = await callRpc("get_public_counters", {});
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
