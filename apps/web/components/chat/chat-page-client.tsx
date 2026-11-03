"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { chatServices } from "@/lib/chat-service";

export function ChatPageClient() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const selectedMatchId = searchParams.get("match");
  if (!user) return null;

  function selectMatch(matchId: string | null) {
    if (matchId === selectedMatchId) return;
    const url = new URL(window.location.href);
    if (matchId) {
      url.searchParams.set("match", matchId);
      window.history.pushState({ matchworkChatFromList: selectedMatchId === null }, "", `${url.pathname}${url.search}${url.hash}`);
      return;
    }
    if (window.history.state?.matchworkChatFromList === true) {
      window.history.back();
      return;
    }
    url.searchParams.delete("match");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return <ChatWorkspace onSelectMatch={selectMatch} selectedMatchId={selectedMatchId} services={chatServices} userId={user.id} />;
}
