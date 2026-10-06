import type { Metadata } from "next";
import { PreferencesPage } from "@/components/discovery/state-pages";

export const metadata: Metadata = { title: "Preferencias de Discovery | Freework" };

export default function DiscoveryPreferencesPage() {
  return <PreferencesPage />;
}
