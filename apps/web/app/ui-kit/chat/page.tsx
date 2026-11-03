import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatPreview } from "./chat-preview";

export const metadata: Metadata = { title: "Muestra de chat | MatchWork", robots: { index: false, follow: false } };

export default function ChatPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ChatPreview />;
}
