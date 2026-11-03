export type MessageStatus = "sending" | "sent" | "error";

export type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
  clientId: string | null;
  status: MessageStatus;
};

export type MessageGroup = { senderId: string; messages: ChatMessage[] };
export type MessageDay = { date: string; label: string; groups: MessageGroup[] };

export const CHAT_PAGE_SIZE = 50;
export const CHAT_MESSAGE_LIMIT = 2000;

/** Collapse whitespace for the conversation list without splitting Unicode characters. */
export function summarizeLastMessage(body: string | null, limit = 76): string {
  if (!body?.trim()) return "Aún no hay mensajes";
  const characters = Array.from(body.trim().replace(/\s+/gu, " "));
  const safeLimit = Math.max(1, Math.floor(limit));
  return characters.length > safeLimit ? `${characters.slice(0, safeLimit - 1).join("")}…` : characters.join("");
}

export function formatChatRelativeTime(value: string | null, now: Date = new Date()): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  if (localDay(date) === localDay(now)) return `hace ${Math.floor(minutes / 60)} h`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (localDay(date) === localDay(yesterday)) return "Ayer";
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric", month: "short", ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
}

/** Browser dates discard sub-millisecond precision; preserve it when ordering server messages. */
function timestampParts(value: string): [number, string] {
  const milliseconds = Date.parse(value);
  const fraction = /\.(\d+)/u.exec(value)?.[1] ?? "";
  return [Number.isFinite(milliseconds) ? milliseconds : 0, fraction.slice(3).padEnd(6, "0")];
}

/** Reconcile messages from pagination, RPC and Realtime, then order chronologically. */
export function sortAndDedupeMessages(messages: ChatMessage[]): ChatMessage[] {
  const entries = new Map<number, ChatMessage>();
  const byId = new Map<string, number>();
  const byClient = new Map<string, number>();
  let sequence = 0;

  for (const message of messages) {
    const clientKey = message.clientId === null ? null : JSON.stringify([message.matchId, message.senderId, message.clientId]);
    const idIndex = byId.get(message.id);
    const clientIndex = clientKey === null ? undefined : byClient.get(clientKey);
    const index = idIndex ?? clientIndex ?? sequence++;
    const existing = entries.get(index);
    const duplicate = clientIndex !== undefined && clientIndex !== index ? entries.get(clientIndex) : undefined;
    let chosen = existing ?? duplicate ?? message;
    if (message.status === "sent" || chosen.status !== "sent") chosen = message;
    if (duplicate?.status === "sent" && message.status !== "sent") chosen = duplicate;
    entries.set(index, chosen);
    if (clientIndex !== undefined && clientIndex !== index) {
      entries.delete(clientIndex);
      for (const [key, value] of byId) if (value === clientIndex) byId.set(key, index);
      for (const [key, value] of byClient) if (value === clientIndex) byClient.set(key, index);
    }
    byId.set(message.id, index);
    if (clientKey !== null) byClient.set(clientKey, index);
  }

  return [...entries.values()].sort((left, right) => {
    const [leftMs, leftFraction] = timestampParts(left.createdAt);
    const [rightMs, rightFraction] = timestampParts(right.createdAt);
    return leftMs - rightMs || leftFraction.localeCompare(rightFraction) || left.id.localeCompare(right.id);
  });
}

export function isScrollNearBottom(scrollTop: number, clientHeight: number, scrollHeight: number, threshold = 80): boolean {
  return scrollHeight - clientHeight - scrollTop <= threshold;
}

/** Fetch backwards until a refreshed page meets the last message already seen. */
export function needsEarlierPageToBridge(page: ChatMessage[], lastKnown: ChatMessage | undefined, pageSize = CHAT_PAGE_SIZE): boolean {
  if (page.length < pageSize) return false;
  if (!lastKnown) return true;
  if (page.some((message) => message.id === lastKnown.id)) return false;
  return sortAndDedupeMessages([lastKnown, page[0]])[0].id === lastKnown.id;
}

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Input must be in chronological order; a day boundary always starts a new group. */
export function groupMessagesByDay(messages: ChatMessage[], now: Date = new Date()): MessageDay[] {
  const today = localDay(now);
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterday = localDay(yesterdayDate);
  const formatter = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric" });
  const days: MessageDay[] = [];

  for (const message of messages) {
    const date = new Date(message.createdAt);
    const key = localDay(date);
    let day = days.at(-1);
    if (!day || day.date !== key) {
      day = { date: key, label: key === today ? "Hoy" : key === yesterday ? "Ayer" : formatter.format(date), groups: [] };
      days.push(day);
    }
    let group = day.groups.at(-1);
    if (!group || group.senderId !== message.senderId) {
      group = { senderId: message.senderId, messages: [] };
      day.groups.push(group);
    }
    group.messages.push(message);
  }
  return days;
}

/** Reconcile both RPC and Realtime confirmations without conflating participants. */
export function mergeConfirmedMessage(messages: ChatMessage[], confirmed: ChatMessage): ChatMessage[] {
  const sent: ChatMessage = { ...confirmed, status: "sent" };
  let matched = false;
  const result: ChatMessage[] = [];
  for (const message of messages) {
    const sameId = message.id === sent.id;
    const sameClient = sent.clientId !== null && message.clientId === sent.clientId &&
      message.matchId === sent.matchId && message.senderId === sent.senderId;
    if (sameId || sameClient) {
      if (!matched) result.push(sent);
      matched = true;
    } else {
      result.push(message);
    }
  }
  if (!matched) result.push(sent);
  return result;
}

/** Late failures or retries must never downgrade an already confirmed message. */
export function setPendingMessageStatus(
  messages: ChatMessage[],
  matchId: string,
  senderId: string,
  clientId: string,
  status: "sending" | "error",
): ChatMessage[] {
  return messages.map((message) =>
    message.matchId === matchId && message.senderId === senderId && message.clientId === clientId && message.status !== "sent"
      ? { ...message, status }
      : message,
  );
}
