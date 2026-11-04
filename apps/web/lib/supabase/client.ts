"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;
let loading: Promise<SupabaseClient<Database> | null> | null = null;

// Mensaje para personas usuarias; la causa (faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) se explica en infra/vps/README.md.
export const SUPABASE_CONFIGURATION_MESSAGE =
  "No pudimos conectar con MatchWork. Inténtalo de nuevo más tarde.";

function readConfiguration(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  return url && key ? { url, key } : null;
}

export function isSupabaseConfigured(): boolean {
  return readConfiguration() !== null;
}

/**
 * supabase-js (~240 KB) is loaded on demand so public pages do not pay for it before first paint.
 * Resolves to null when Supabase is not configured or the library fails to load.
 */
export function loadSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  if (browserClient) return Promise.resolve(browserClient);
  const configuration = readConfiguration();
  if (!configuration) return Promise.resolve(null);
  loading ??= import("@supabase/supabase-js")
    .then(({ createClient }) => {
      browserClient = createClient<Database>(configuration.url, configuration.key, {
        auth: { autoRefreshToken: true, detectSessionInUrl: true, persistSession: true },
      });
      return browserClient;
    })
    .catch(() => {
      loading = null;
      return null;
    });
  return loading;
}

/** Synchronous access, only valid after `loadSupabaseClient()` has resolved. */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  return browserClient;
}

export function getAbsoluteSiteUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  return new URL(`${basePath}${normalizedPath}`, origin).toString();
}
