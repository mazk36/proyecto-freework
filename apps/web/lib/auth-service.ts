import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export type RegisteredProfile = {
  id: string;
  fullName: string;
  role: "company" | "freelancer";
};

export async function getRegisteredProfile(user: SupabaseUser): Promise<RegisteredProfile> {
  const client = getSupabaseClient();
  if (!client) throw new Error("La conexión con Supabase no está configurada.");

  const { data, error } = await client
    .from("app_users")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    throw new Error("No pudimos cargar los permisos de tu cuenta. Revisa la configuración de Supabase.");
  }
  return { id: data.id, fullName: data.full_name, role: data.role };
}
