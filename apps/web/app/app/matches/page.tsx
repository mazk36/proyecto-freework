import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";

export const metadata: Metadata = { title: "Matches | MatchWork" };

export default function MatchesPage() {
  return <AppEmptyState description="Cuando una propuesta encaje con un problema y ambas partes quieran avanzar, harán Match para continuar la conversación. Aparecerá aquí." title="Aún no tienes Matches." />;
}
