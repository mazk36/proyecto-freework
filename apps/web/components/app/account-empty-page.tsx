"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { useAuth } from "@/components/auth/auth-provider";
import { CompanyInbox } from "@/components/inbox/company-inbox";

type AccountPageKind = "saved" | "proposals";

export function AccountEmptyPage({ kind }: { kind: AccountPageKind }) {
  const { user } = useAuth();
  const router = useRouter();
  const redirectToLikes = user?.role === "freelancer";
  // Para un freelancer «Guardados» y «Mis propuestas» son pestañas de Likes: se lleva ahí en vez de mostrar una pantalla vacía.
  useEffect(() => { if (redirectToLikes) router.replace("/app/likes/"); }, [redirectToLikes, router]);
  if (!user) return null;
  if (redirectToLikes) return <p className="px-5 py-10 text-center text-sm text-muted-foreground" role="status">Abriendo Likes…</p>;
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
