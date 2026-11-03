import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatPageClient } from "@/components/chat/chat-page-client";
import { ConversationSkeleton, ThreadSkeleton } from "@/components/chat/chat-parts";

export const metadata: Metadata = { title: "Chats | MatchWork" };

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="grid h-full min-h-0 md:grid-cols-[20rem_minmax(0,1fr)]"><ConversationSkeleton /><div className="hidden border-l border-border md:flex"><ThreadSkeleton /></div></div>}>
      <ChatPageClient />
    </Suspense>
  );
}
