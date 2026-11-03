export const CHAT_DATA_CHANGED = "matchwork:chat-data-changed";

export function notifyChatDataChanged(): void {
  window.dispatchEvent(new Event(CHAT_DATA_CHANGED));
}
