"use client";

import { DiscoveryFeed } from "@/components/discovery/discovery-feed";
import { ProblemSelector } from "@/components/discovery/problem-selector";
import { useDemoStore } from "@/components/discovery/demo-store";

export function DiscoveryHome() {
  const { role } = useDemoStore();
  return role === "company" ? <ProblemSelector /> : <DiscoveryFeed />;
}
