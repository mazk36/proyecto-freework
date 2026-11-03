import type { Metadata } from "next";
import { MatchesOverview } from "@/components/inbox/matches-overview";

export const metadata: Metadata = { title: "Matches | MatchWork" };

export default function MatchesPage() {
  return <MatchesOverview />;
}
