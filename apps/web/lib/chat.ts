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
