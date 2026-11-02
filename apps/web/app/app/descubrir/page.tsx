import type { Metadata } from "next";
import { SwipeDeck } from "@/components/swipe/swipe-deck";

export const metadata: Metadata = { title: "Descubrir | MatchWork" };

export default function DiscoverPage() {
  return <SwipeDeck />;
}
