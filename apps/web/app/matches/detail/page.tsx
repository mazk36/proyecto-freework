import type { Metadata } from "next";
import { MatchDetailRoute } from "@/components/discovery/match-detail-route";

export const metadata: Metadata = { title: "Continuar después del Match | Freework" };

export default function MatchDetailPage() {
  return <MatchDetailRoute />;
}
