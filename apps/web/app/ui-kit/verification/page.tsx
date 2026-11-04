import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VerificationPreview } from "./verification-preview";

export const metadata: Metadata = { title: "Muestra de verificación | MatchWork", robots: { index: false, follow: false } };

export default function VerificationPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <VerificationPreview />;
}
