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
      description="Tus propuestas enviadas y tus borradores están en Likes, en la pestaña «Propuestas enviadas»."
      title="Mis propuestas"
    />
  );
}
