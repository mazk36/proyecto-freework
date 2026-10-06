import type { Metadata } from "next";
import { DiscoveryHome } from "@/components/discovery/discovery-home";

export const metadata: Metadata = {
  title: "Discover | Freework",
  description: "Descubre problemas y soluciones de una oportunidad a la vez.",
};

export default function DiscoverPage() {
  return <DiscoveryHome />;
}
