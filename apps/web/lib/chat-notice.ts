export const CHAT_NOTICE = {
  enabled: true,
  storageKeyPrefix: "matchwork:chat-notice:dismissed:",
  title: "Mantén la conversación en MatchWork",
  body: "Conversar aquí te ayuda a tener todo el contexto de la propuesta en un solo lugar. Tú decides qué compartir.",
} as const;

type NoticeStorage = Pick<Storage, "getItem" | "setItem">;

export function isConversationNoticeDismissed(matchId: string, storage: Pick<NoticeStorage, "getItem"> | null | undefined, dismissedThisVisit?: ReadonlySet<string>): boolean {
  if (dismissedThisVisit?.has(matchId)) return true;
  try {
    return storage?.getItem(`${CHAT_NOTICE.storageKeyPrefix}${matchId}`) === "1";
  } catch {
    return false;
  }
}

export function dismissConversationNotice(matchId: string, storage: Pick<NoticeStorage, "setItem"> | null | undefined, dismissedThisVisit?: Set<string>): void {
  dismissedThisVisit?.add(matchId);
  try {
    storage?.setItem(`${CHAT_NOTICE.storageKeyPrefix}${matchId}`, "1");
  } catch {
    // The notice can still be dismissed for the current visit.
  }
}
