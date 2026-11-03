import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProposalsPreview } from "./proposals-preview";

export const metadata: Metadata = { title: "Muestra de propuestas | MatchWork", robots: { index: false, follow: false } };

export default function ProposalsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ProposalsPreview />;
}
