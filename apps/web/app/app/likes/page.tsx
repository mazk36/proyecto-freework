import type { Metadata } from "next";
import { LikesOverview } from "@/components/app/likes-overview";

export const metadata: Metadata = { title: "Likes | MatchWork" };

export default function LikesPage() {
  return <LikesOverview />;
}
