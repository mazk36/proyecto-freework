import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPreview } from "./admin-preview";

export const metadata: Metadata = { title: "Muestra del panel admin | MatchWork", robots: { index: false, follow: false } };

export default function AdminPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AdminPreview />;
}
