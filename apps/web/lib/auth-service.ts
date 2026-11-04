import type { User as SupabaseUser } from "@supabase/supabase-js";
import { loadSupabaseClient } from "@/lib/supabase/client";

export type RegisteredProfile = {
  id: string;
  fullName: string;
  role: "company" | "freelancer";
};

export async function getRegisteredProfile(user: SupabaseUser): Promise<RegisteredProfile> {
  const client = await loadSupabaseClient();
  if (!client) throw new Error("No pudimos conectar con MatchWork. Inténtalo de nuevo más tarde.");

  const { data, error } = await client
    .from("app_users")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    throw new Error("No pudimos cargar los permisos de tu cuenta. Inténtalo de nuevo más tarde.");
  }
  return { id: data.id, fullName: data.full_name, role: data.role };
}
