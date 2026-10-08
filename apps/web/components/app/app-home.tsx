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
      description="Publica tu primer problema para recibir propuestas. Cuando una solución encaje y ambas partes quieran avanzar, harán Match."
      title={`Bienvenido a MatchWork, ${user.name}.`}
    />
  ) : (
    <AppEmptyState
      action={<ButtonLink href="/app/descubrir" variant="outline">Ir a Descubrir</ButtonLink>}
      description="Cuando una oportunidad encaje con tu experiencia y la empresa también quiera avanzar, harán Match para continuar la conversación."
      title={`Bienvenido a MatchWork, ${user.name}.`}
    />
  );
}
