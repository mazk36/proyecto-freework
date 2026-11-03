"use client";

import { AppEmptyState } from "@/components/app/app-empty-state";
import { useAuth } from "@/components/auth/auth-provider";
import { CompanyInbox } from "@/components/inbox/company-inbox";

type AccountPageKind = "saved" | "proposals";

export function AccountEmptyPage({ kind }: { kind: AccountPageKind }) {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "company") return <CompanyInbox initialFilter={kind === "saved" ? "saved" : "all"} key={`${user.id}-${kind}`} />;

  if (kind === "saved") {
    return (
      <AppEmptyState
        description="Aún no has guardado ningún problema."
        title="Guardados"
      />
    );
  }

  return (
    <AppEmptyState
      description="El módulo de propuestas aún no está conectado. Esta sección se habilitará cuando exista una fuente segura para enviar, recibir y consultar propuestas reales."
      title="Mis propuestas"
    />
  );
}
