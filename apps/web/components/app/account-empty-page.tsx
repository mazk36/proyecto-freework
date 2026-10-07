"use client";

import { AppEmptyState } from "@/components/app/app-empty-state";
import { useAuth } from "@/components/auth/auth-provider";

type AccountPageKind = "saved" | "proposals";

export function AccountEmptyPage({ kind }: { kind: AccountPageKind }) {
  const { user } = useAuth();
  if (!user) return null;

  if (kind === "saved") {
    return (
      <AppEmptyState
        description={user.role === "company" ? "Aún no has guardado ninguna propuesta." : "Aún no has guardado ningún problema."}
        title="Guardados"
      />
    );
  }

  return (
    <AppEmptyState
      description={user.role === "company" ? "Aún no has recibido propuestas." : "Aún no has enviado ninguna propuesta."}
      title={user.role === "company" ? "Propuestas recibidas" : "Mis propuestas"}
    />
  );
}
