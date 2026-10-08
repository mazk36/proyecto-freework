import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";

export const metadata: Metadata = { title: "Descubrir | MatchWork" };

export default function DiscoverPage() {
  return <AppEmptyState description="Cuando se publiquen problemas podrás revisarlos aquí." title="Aún no hay problemas disponibles." />;
}
