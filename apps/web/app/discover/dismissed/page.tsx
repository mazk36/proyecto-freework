import type { Metadata } from "next";
import { DismissedItemsPage } from "@/components/discovery/state-pages";

export const metadata: Metadata = { title: "Descartados | Freework" };

export default function DismissedPage() {
  return <DismissedItemsPage />;
}
