"use client";

import { ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { AppEmptyState } from "@/components/app/app-empty-state";

export function AppHome() {
  const { user } = useAuth();
  if (!user) return null;

  return user.role === "company" ? (
    <AppEmptyState
      action={<ButtonLink href="/app/problemas/nuevo">Publicar un problema</ButtonLink>}
      description="Publica tu primer problema para comenzar."
      title={`Bienvenido a Freework, ${user.name}.`}
    />
  ) : (
    <AppEmptyState
      action={<ButtonLink href="/app/descubrir" variant="outline">Ir a Descubrir</ButtonLink>}
      description="Cuando haya problemas disponibles podrás descubrir oportunidades aquí."
      title={`Bienvenido a Freework, ${user.name}.`}
    />
  );
}
