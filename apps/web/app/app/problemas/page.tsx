import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mis problemas | MatchWork" };

export default function CompanyProblemsPage() {
  return (
    <AppEmptyState
      action={<ButtonLink href="/app/problemas/nuevo">Publicar un problema</ButtonLink>}
      description="Los problemas que publiques aparecerán aquí."
      title="Aún no has publicado ningún problema."
    />
  );
}
