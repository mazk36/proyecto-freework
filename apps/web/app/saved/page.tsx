import type { Metadata } from "next";
import { SavedItemsPage } from "@/components/discovery/state-pages";

export const metadata: Metadata = { title: "Guardados | Freework" };

export default function SavedPage() {
  return <SavedItemsPage />;
}
