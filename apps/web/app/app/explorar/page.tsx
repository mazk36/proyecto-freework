import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";

export const metadata: Metadata = { title: "Explorar | Freework" };

export default function ExplorePage() {
  return <AppEmptyState description="Aquí aparecerán los problemas disponibles para explorar." title="Aún no hay problemas disponibles." />;
}
