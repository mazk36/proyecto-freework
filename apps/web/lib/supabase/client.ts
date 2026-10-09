"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;

export const SUPABASE_CONFIGURATION_MESSAGE =
  "Falta conectar MatchWork con el proyecto Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para habilitar cuentas y publicaciones.";

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !key) return null;

  try {
    browserClient = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
    return browserClient;
  } catch {
    return null;
  }
}

export function getAbsoluteSiteUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  return new URL(`${basePath}${normalizedPath}`, origin).toString();
}
