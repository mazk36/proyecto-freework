import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";

export const metadata: Metadata = { title: "Matches | Freework" };

export default function MatchesPage() {
  return <AppEmptyState description="Cuando exista interés mutuo entre una empresa y un freelancer, aparecerá aquí." title="Aún no tienes Matches." />;
}
