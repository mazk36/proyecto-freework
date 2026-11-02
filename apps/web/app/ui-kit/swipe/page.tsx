import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SwipePreview } from "./swipe-preview";

export const metadata: Metadata = { title: "Muestra Swipe | MatchWork", robots: { index: false, follow: false } };

export default function SwipePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SwipePreview />;
}
