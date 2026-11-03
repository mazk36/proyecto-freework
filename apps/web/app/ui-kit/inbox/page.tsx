import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InboxPreview } from "./inbox-preview";

export const metadata: Metadata = { title: "Muestra de bandeja | MatchWork", robots: { index: false, follow: false } };

export default function InboxPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <InboxPreview />;
}
