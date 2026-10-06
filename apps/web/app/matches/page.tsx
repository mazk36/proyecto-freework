import type { Metadata } from "next";
import { MatchesPage } from "@/components/discovery/state-pages";

export const metadata: Metadata = { title: "Matches | Freework" };

export default function MatchListPage() {
  return <MatchesPage />;
}
