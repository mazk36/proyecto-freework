"use client";

import { AlertCircle, MessageCircle, MessagesSquare } from "lucide-react";
import { MotionConfig } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatThread } from "@/components/chat/chat-thread";
import { ChatAvatar, ConversationSkeleton, ProblemChip, ThreadSkeleton, UnreadBadge, counterpartName, roleLabel } from "@/components/chat/chat-parts";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CHAT_DATA_CHANGED, notifyChatDataChanged } from "@/lib/chat-events";
import { formatChatRelativeTime, mergeConfirmedMessage, setPendingMessageStatus, summarizeLastMessage, type ChatMessage } from "@/lib/chat";
import type { ChatConversation, ChatServices } from "@/lib/chat-service";

export function ChatWorkspace({
  userId, services, selectedMatchId, onSelectMatch,
}: {
  userId: string;
  services: ChatServices;
  selectedMatchId: string | null;
  onSelectMatch: (matchId: string | null) => void;
}) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [listState, setListState] = useState<"loading" | "ready" | "error">("loading");
  const [listError, setListError] = useState("");
  const [outbox, setOutbox] = useState<ChatMessage[]>([]);
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({});
  const requestSequence = useRef(0);
  const listButtons = useRef(new Map<string, HTMLButtonElement>());
  const previousSelection = useRef(selectedMatchId);

  const loadConversations = useCallback(async () => {
    const request = ++requestSequence.current;
    try {
      const rows = await services.listConversations();
      if (request !== requestSequence.current) return;
      setConversations(rows);
      setListState("ready");
      setListError("");
    } catch {
      if (request !== requestSequence.current) return;
      setListError("No pudimos actualizar tus conversaciones. Revisa tu conexión e inténtalo de nuevo.");
      setListState((state) => state === "loading" ? "error" : state);
    }
  }, [services]);

  useEffect(() => {
    void loadConversations();
    let debounce: number | undefined;
    const onChanged = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => void loadConversations(), 150);
    };
    const onFocus = () => { if (document.visibilityState === "visible") void loadConversations(); };
    window.addEventListener(CHAT_DATA_CHANGED, onChanged);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const timer = window.setInterval(onFocus, 30_000);
    return () => {
      requestSequence.current += 1;
      window.clearTimeout(debounce);
      window.clearInterval(timer);
      window.removeEventListener(CHAT_DATA_CHANGED, onChanged);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadConversations]);

  useEffect(() => {
    const previous = previousSelection.current;
    previousSelection.current = selectedMatchId;
    if (previous && !selectedMatchId && window.matchMedia("(max-width: 767px)").matches) {
      window.requestAnimationFrame(() => listButtons.current.get(previous)?.focus());
    }
  }, [selectedMatchId]);

  const send = useCallback((message: ChatMessage) => {
    if (!message.clientId) return;
    const clientId = message.clientId;
    setSendErrors((current) => { const next = { ...current }; delete next[clientId]; return next; });
    setOutbox((current) => {
      const exists = current.some((item) => item.matchId === message.matchId && item.senderId === userId && item.clientId === clientId);
      return exists
        ? setPendingMessageStatus(current, message.matchId, userId, clientId, "sending")
        : [...current, message];
    });
    void services.sendMessage(message.matchId, message.body, clientId).then((confirmed) => {
      setOutbox((current) => mergeConfirmedMessage(current, confirmed));
      notifyChatDataChanged();
    }).catch((error: unknown) => {
      setOutbox((current) => setPendingMessageStatus(current, message.matchId, userId, clientId, "error"));
      setSendErrors((current) => ({ ...current, [clientId]: error instanceof Error ? error.message : "No pudimos enviar el mensaje. Inténtalo de nuevo." }));
    });
  }, [services, userId]);

  const selectedConversation = conversations.find((conversation) => conversation.matchId === selectedMatchId);

  return <MotionConfig reducedMotion="user">
    <div className="grid h-full min-h-0 min-w-0 bg-background md:grid-cols-[20rem_minmax(0,1fr)]">
      <section aria-labelledby="chat-list-title" className={`${selectedMatchId ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col border-border md:border-r`}>
        <header className="shrink-0 border-b border-border px-5 pb-5 pt-6 sm:px-6">
          <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-accent-soft">Tus conexiones</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div><h1 className="font-display text-2xl font-semibold tracking-tight" id="chat-list-title">Chats</h1><p className="mt-1 text-sm text-muted-foreground">Conversaciones a partir de tus Matches.</p></div>
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent-soft"><MessagesSquare className="size-5" strokeWidth={1.8} /></span>
          </div>
        </header>
        {listError && listState === "ready" ? <div className="border-b border-border px-4 py-2 text-sm text-warning" role="status">{listError} <button className="min-h-11 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => void loadConversations()} type="button">Reintentar</button></div> : null}
        <div className="ui-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain" tabIndex={0} aria-label="Lista de conversaciones">
          {listState === "loading" ? <ConversationSkeleton /> : null}
          {listState === "error" ? <EmptyState action={<Button onClick={() => void loadConversations()} variant="outline">Reintentar</Button>} compact description={listError} icon={AlertCircle} title="No pudimos cargar tus chats" tone="warning" /> : null}
          {listState === "ready" && conversations.length === 0 ? <EmptyState compact description="Cuando una empresa y un freelancer hagan Match, podrán conversar aquí" icon={MessageCircle} title="Aún no tienes conversaciones" /> : null}
          {listState === "ready" && conversations.length > 0 ? <ul className="divide-y divide-border/60">
            {conversations.map((conversation) => <li key={conversation.matchId}>
              <button
                aria-current={selectedMatchId === conversation.matchId ? "true" : undefined}
                className={`flex min-h-28 w-full min-w-0 items-start gap-3 px-4 py-4 text-left focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:px-5 ${selectedMatchId === conversation.matchId ? "bg-accent/10" : "hover:bg-surface"}`}
                onClick={() => onSelectMatch(conversation.matchId)}
                ref={(element) => { if (element) listButtons.current.set(conversation.matchId, element); else listButtons.current.delete(conversation.matchId); }}
                type="button"
              >
                <ChatAvatar name={conversation.counterpartName} role={conversation.counterpartRole} />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-start justify-between gap-2"><span className="min-w-0 truncate text-sm font-semibold text-foreground">{counterpartName(conversation)}</span><span className="shrink-0 pt-0.5 text-[0.6875rem] text-muted-foreground">{formatChatRelativeTime(conversation.lastMessageAt)}</span></span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{roleLabel(conversation.counterpartRole)}</span>
                  <span className="mt-2 block min-w-0"><ProblemChip title={conversation.problemTitle} /></span>
                  <span className="mt-1.5 flex min-w-0 items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{conversation.lastMessageSenderIsMe ? "Tú: " : ""}{summarizeLastMessage(conversation.lastMessageBody)}</span>{conversation.unreadCount > 0 ? <UnreadBadge count={conversation.unreadCount} /> : null}</span>
                </span>
              </button>
            </li>)}
          </ul> : null}
        </div>
      </section>
      {selectedConversation ? <ChatThread conversation={selectedConversation} key={selectedConversation.matchId} onBack={() => onSelectMatch(null)} onSend={send} outbox={outbox.filter((message) => message.matchId === selectedConversation.matchId)} sendErrors={sendErrors} services={services} userId={userId} /> : selectedMatchId ? <section className="chat-thread-mobile flex h-full min-h-0 flex-col bg-background md:static" aria-label="Conversación">
        <div className="flex items-center border-b border-border p-3 md:hidden"><Button onClick={() => onSelectMatch(null)} variant="quiet">← Volver a chats</Button></div>
        {listState === "loading" ? <ThreadSkeleton /> : <div className="grid flex-1 place-items-center"><EmptyState action={<Button onClick={() => listState === "error" ? void loadConversations() : onSelectMatch(null)} variant="outline">{listState === "error" ? "Reintentar" : "Volver a chats"}</Button>} description={listState === "error" ? "No pudimos comprobar esta conversación. Revisa tu conexión e inténtalo de nuevo." : "Esta conversación no está disponible en tu lista de Matches."} icon={AlertCircle} title="No encontramos la conversación" tone="neutral" /></div>}
      </section> : <div className="hidden min-h-0 place-items-center md:grid"><EmptyState description="Selecciona una conversación para continuar hablando sobre el problema que los conectó." icon={MessagesSquare} title="Tu próximo paso empieza aquí" tone="neutral" /></div>}
    </div>
  </MotionConfig>;
}

