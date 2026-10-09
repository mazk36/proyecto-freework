import type { Metadata } from "next";
import { OpenProblemFeed } from "@/components/app/open-problem-feed";

export const metadata: Metadata = { title: "Explorar | MatchWork" };

export default function ExplorePage() {
  return <OpenProblemFeed />;
}
