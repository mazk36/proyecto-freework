import { callRpc, ProblemServiceError } from "@/lib/problem-service";
import { isSupabaseConfigured, loadSupabaseClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/chat";
import type { ChatConversationRow, ChatMessageRow } from "@/types/database";

export type ChatConversation = {
  matchId: string;
  problemTitle: string;
  counterpartName: string | null;
  counterpartRole: "company" | "freelancer";
  counterpartCompanyVerified?: boolean | null;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastMessageSenderIsMe: boolean | null;
  unreadCount: number;
};

export type ChatServices = {
  listConversations: typeof listConversations;
  listMessages: typeof listMessages;
  sendMessage: typeof sendMessage;
  markConversationRead: typeof markConversationRead;
  subscribeToMessages: typeof subscribeToMessages;
};

export async function sendMessage(matchId: string, body: string, clientId: string | null = null): Promise<ChatMessage> {
  const data: unknown = await callRpc("send_message", { p_match_id: matchId, p_body: body, p_client_id: clientId });
  // PostgREST can serialize a composite result as a single-row array.
  const row: unknown = Array.isArray(data) && data.length === 1 ? data[0] : data;
  if (!isMessageRow(row) || row.match_id !== matchId) {
    throw new ProblemServiceError("No pudimos confirmar el envío del mensaje.");
  }
  return mapMessage(row);
}

export async function listConversations(): Promise<ChatConversation[]> {
  const data: unknown = await callRpc("list_conversations", {});
  if (!Array.isArray(data) || !data.every(isConversationRow)) {
    throw new ProblemServiceError("No pudimos cargar tus conversaciones.");
  }
  return data.map((row) => ({
    matchId: row.match_id,
    problemTitle: row.problem_title,
    counterpartName: row.counterpart_name,
    counterpartRole: row.counterpart_role,
    counterpartCompanyVerified: row.counterpart_company_verified,
    lastMessageBody: row.last_message_body,
    lastMessageAt: row.last_message_at,
    lastMessageSenderIsMe: row.last_message_sender_is_me,
    unreadCount: row.unread_count,
  }));
}

export async function listMessages(matchId: string, before: string | null = null, limit = 50): Promise<ChatMessage[]> {
  const data: unknown = await callRpc("list_messages", { p_match_id: matchId, p_before: before, p_limit: limit });
  if (!Array.isArray(data) || !data.every((row) => isMessageRow(row) && row.match_id === matchId)) {
    throw new ProblemServiceError("No pudimos cargar los mensajes de esta conversación.");
  }
  return data.map(mapMessage);
}

export async function markConversationRead(matchId: string): Promise<void> {
  await callRpc("mark_conversation_read", { p_match_id: matchId });
}

export async function unreadTotal(): Promise<number> {
  const data: unknown = await callRpc("unread_total", {});
  if (typeof data !== "number" || !Number.isSafeInteger(data) || data < 0) {
    throw new ProblemServiceError("No pudimos cargar la cantidad de mensajes no leídos.");
  }
  return data;
}

let subscriptionSequence = 0;

export type ChatRealtimeStatus = "connecting" | "connected" | "unavailable";

export function subscribeToMessages(
  matchId: string,
  onMessage: (message: ChatMessage) => void,
  onStatus?: (status: ChatRealtimeStatus) => void,
): () => void {
  return subscribeToMessageInserts(matchId, onMessage, onStatus);
}

/** Realtime applies the existing participant RLS policy to this unfiltered subscription. */
export function subscribeToAllMessages(onMessage: (message: ChatMessage) => void): () => void {
  return subscribeToMessageInserts(null, onMessage);
}

function subscribeToMessageInserts(
  matchId: string | null,
  onMessage: (message: ChatMessage) => void,
  onStatus?: (status: ChatRealtimeStatus) => void,
): () => void {
  if (!isSupabaseConfigured()) {
    onStatus?.("unavailable");
    return () => {};
  }
  onStatus?.("connecting");
  let cancelled = false;
  let cleanup: (() => void) | null = null;
  void loadSupabaseClient().then((client) => {
    if (cancelled) return;
    if (!client) {
      onStatus?.("unavailable");
      return;
    }
    const channel = client.channel(`match-messages:${matchId ?? "all"}:${++subscriptionSequence}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages", ...(matchId ? { filter: `match_id=eq.${matchId}` } : {}),
      }, (payload) => {
        if (!isMessageRow(payload.new) || (matchId !== null && payload.new.match_id !== matchId)) {
          console.error("Se recibió un mensaje de Realtime inválido.");
          return;
        }
        onMessage(mapMessage(payload.new));
      }).subscribe((status) => {
        if (status === "SUBSCRIBED") onStatus?.("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") onStatus?.("unavailable");
      });
    cleanup = () => {
      void client.removeChannel(channel).catch(() => console.error("No se pudo cerrar la suscripción de mensajes."));
    };
  });
  return () => {
    cancelled = true;
    cleanup?.();
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isMessageRow(value: unknown): value is ChatMessageRow {
  return isRecord(value) && typeof value.id === "string" && typeof value.match_id === "string" &&
    typeof value.sender_id === "string" && typeof value.body === "string" &&
    typeof value.created_at === "string" && Number.isFinite(Date.parse(value.created_at)) && isNullableString(value.client_id);
}

function isConversationRow(value: unknown): value is ChatConversationRow {
  return isRecord(value) && typeof value.match_id === "string" && typeof value.problem_title === "string" &&
    isNullableString(value.counterpart_name) && (value.counterpart_company_verified === null || typeof value.counterpart_company_verified === "boolean") && (value.counterpart_role === "company" || value.counterpart_role === "freelancer") &&
    isNullableString(value.last_message_body) && isNullableString(value.last_message_at) &&
    (value.last_message_sender_is_me === null || typeof value.last_message_sender_is_me === "boolean") &&
    typeof value.unread_count === "number" && Number.isSafeInteger(value.unread_count) && value.unread_count >= 0;
}

function mapMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id, matchId: row.match_id, senderId: row.sender_id, body: row.body,
    createdAt: row.created_at, clientId: row.client_id, status: "sent",
  };
}

export const chatServices: ChatServices = {
  listConversations, listMessages, sendMessage, markConversationRead, subscribeToMessages,
};
