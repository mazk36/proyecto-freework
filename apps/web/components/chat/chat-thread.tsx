"use client";

import { ArrowDown, ArrowLeft, Check, Clock3, MessageCircle, Send } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { useAccountStatus, useCanWrite, SuspensionNotice } from "@/components/app/account-status";
import { useAuth } from "@/components/auth/auth-provider";
import { CompanyTrustChip } from "@/components/ui/company-trust-chip";
import { ChatAvatar, ProblemChip, RefreshIcon, ThreadSkeleton, counterpartName, roleLabel } from "@/components/chat/chat-parts";
import { ConversationNotice } from "@/components/chat/conversation-notice";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CHAT_MESSAGE_LIMIT, CHAT_PAGE_SIZE, groupMessagesByDay, isScrollNearBottom, needsEarlierPageToBridge, sortAndDedupeMessages, type ChatMessage } from "@/lib/chat";
import { notifyChatDataChanged } from "@/lib/chat-events";
import type { ChatConversation, ChatRealtimeStatus, ChatServices } from "@/lib/chat-service";

export function ChatThread({ conversation, userId, services, outbox, sendErrors, onSend, onBack }: {
  conversation: ChatConversation;
  userId: string;
  services: ChatServices;
  outbox: ChatMessage[];
  sendErrors: Record<string, string>;
  onSend: (message: ChatMessage) => void;
  onBack: () => void;
}) {
  const canWrite = useCanWrite();
  const accountStatus = useAccountStatus();
  const { logout } = useAuth();
  const [serverMessages, setServerMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<{ message: string; target: "latest" | "older" } | null>(null);
  const [readError, setReadError] = useState("");
  const [realtime, setRealtime] = useState<ChatRealtimeStatus>("connecting");
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [composeError, setComposeError] = useState("");
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  const threadRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const active = useRef(false);
  const initialized = useRef(false);
  const latestRequest = useRef(0);
  const oldestCursor = useRef<string | null>(null);
  const scrollToEnd = useRef(true);
  const stickToBottom = useRef(true);
  const anchor = useRef<{ height: number; top: number } | null>(null);
  const currentMessages = useRef<ChatMessage[]>([]);
  const messages = useMemo(() => sortAndDedupeMessages([...serverMessages, ...outbox]), [serverMessages, outbox]);
  const days = useMemo(() => groupMessagesByDay(messages), [messages]);
  const draftLength = Array.from(draft).length;

  const markRead = useCallback(async () => {
    if (!canWrite || document.visibilityState !== "visible" || !document.hasFocus()) return;
    try {
      await services.markConversationRead(conversation.matchId);
      if (!active.current) return;
      setReadError("");
      notifyChatDataChanged();
    } catch {
      if (active.current) setReadError("No pudimos marcar esta conversación como leída. Actualiza para reintentar.");
    }
  }, [canWrite, conversation.matchId, services]);

  const prepareForIncoming = useCallback((incoming: ChatMessage[]) => {
    const unseen = incoming.some((message) => !currentMessages.current.some((current) => current.id === message.id || (
      message.clientId !== null && message.clientId === current.clientId && message.senderId === current.senderId && message.matchId === current.matchId
    )));
    if (!unseen) return;
    const element = scrollRef.current;
    if (!element || isScrollNearBottom(element.scrollTop, element.clientHeight, element.scrollHeight)) {
      scrollToEnd.current = true;
      stickToBottom.current = true;
    } else {
      stickToBottom.current = false;
      setShowNewMessages(true);
    }
  }, []);

  const loadLatest = useCallback(async () => {
    const request = ++latestRequest.current;
    setRefreshing(true);
    try {
      let page = await services.listMessages(conversation.matchId, null, CHAT_PAGE_SIZE);
      if (!active.current || request !== latestRequest.current) return;
      let rows = page;
      const lastKnown = currentMessages.current.filter((message) => message.status === "sent").at(-1);
      while (initialized.current && needsEarlierPageToBridge(page, lastKnown)) {
        page = await services.listMessages(conversation.matchId, page[0].createdAt, CHAT_PAGE_SIZE);
        if (!active.current || request !== latestRequest.current) return;
        rows = [...page, ...rows];
      }
      if (!initialized.current) {
        initialized.current = true;
        oldestCursor.current = rows[0]?.createdAt ?? null;
        setHasMore(rows.length === CHAT_PAGE_SIZE);
        scrollToEnd.current = true;
      } else {
        prepareForIncoming(rows);
      }
      setServerMessages((current) => sortAndDedupeMessages([...current, ...rows]));
      setLoading(false);
      setLoadError(null);
      void markRead();
    } catch {
      if (!active.current || request !== latestRequest.current) return;
      setLoading(false);
      setLoadError({ message: "No pudimos cargar los mensajes. Revisa tu conexión e inténtalo de nuevo.", target: "latest" });
    } finally {
      if (active.current && request === latestRequest.current) setRefreshing(false);
    }
  }, [conversation.matchId, markRead, prepareForIncoming, services]);

  useEffect(() => {
    active.current = true;
    let unsubscribe = () => {};
    try {
      unsubscribe = services.subscribeToMessages(conversation.matchId, (message) => {
        if (!active.current) return;
        prepareForIncoming([message]);
        setServerMessages((current) => sortAndDedupeMessages([...current, message]));
        if (message.senderId !== userId) void markRead();
        notifyChatDataChanged();
      }, (status) => { if (active.current) setRealtime(status); });
    } catch {
      setRealtime("unavailable");
    }
    void loadLatest();
    const onFocus = () => { if (document.visibilityState === "visible" && document.hasFocus()) void loadLatest(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active.current = false;
      latestRequest.current += 1;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      unsubscribe();
    };
  }, [conversation.matchId, loadLatest, markRead, prepareForIncoming, services, userId]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) backRef.current?.focus();
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;
    const update = () => setViewport({ height: visualViewport.height, top: visualViewport.offsetTop });
    update();
    visualViewport.addEventListener("resize", update);
    visualViewport.addEventListener("scroll", update);
    return () => {
      visualViewport.removeEventListener("resize", update);
      visualViewport.removeEventListener("scroll", update);
    };
  }, []);

  useLayoutEffect(() => {
    currentMessages.current = messages;
    const element = scrollRef.current;
    if (!element) return;
    if (anchor.current) {
      element.scrollTop = anchor.current.top + element.scrollHeight - anchor.current.height;
      anchor.current = null;
    } else if (scrollToEnd.current) {
      element.scrollTop = element.scrollHeight;
      scrollToEnd.current = false;
    }
  }, [messages, loading]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current && !anchor.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [loading]);

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 140)}px`;
  }, [draft]);

  async function loadOlder() {
    if (!oldestCursor.current || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const rows = await services.listMessages(conversation.matchId, oldestCursor.current, CHAT_PAGE_SIZE);
      if (!active.current) return;
      const element = scrollRef.current;
      if (element) anchor.current = { height: element.scrollHeight, top: element.scrollTop };
      if (rows.length) oldestCursor.current = rows[0].createdAt;
      setHasMore(rows.length === CHAT_PAGE_SIZE);
      setServerMessages((current) => sortAndDedupeMessages([...rows, ...current]));
      setLoadError(null);
    } catch {
      if (active.current) setLoadError({ message: "No pudimos cargar los mensajes anteriores. Inténtalo de nuevo.", target: "older" });
    } finally {
      if (active.current) setLoadingOlder(false);
    }
  }

  function sendDraft() {
    const body = draft.trim();
    if (!body || !canWrite) return;
    if (!globalThis.crypto?.randomUUID) {
      setComposeError("No pudimos preparar el envío en este navegador. Conservamos tu mensaje.");
      return;
    }
    const clientId = globalThis.crypto.randomUUID();
    scrollToEnd.current = true;
    stickToBottom.current = true;
    setShowNewMessages(false);
    onSend({ id: `pending:${clientId}`, clientId, matchId: conversation.matchId, senderId: userId, body, createdAt: new Date().toISOString(), status: "sending" });
    setDraft("");
    setComposeError("");
    textareaRef.current?.focus();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendDraft();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendDraft();
    }
  }

  const viewportStyle = viewport ? { "--chat-viewport-height": `${viewport.height}px`, "--chat-viewport-top": `${viewport.top}px` } as CSSProperties : undefined;

  return <section aria-label={`Conversación con ${counterpartName(conversation)}`} className="chat-thread-mobile flex h-full min-h-0 min-w-0 flex-col bg-background" ref={threadRef} style={viewportStyle} tabIndex={-1}>
    <header className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-3 py-3 sm:px-5">
      <button aria-label="Volver a conversaciones" className="grid size-11 shrink-0 place-items-center rounded-xl text-foreground hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden" onClick={onBack} ref={backRef} type="button"><ArrowLeft aria-hidden="true" className="size-5" /></button>
      <ChatAvatar name={conversation.counterpartName} role={conversation.counterpartRole} />
      <div className="min-w-0 flex-1"><h2 className="truncate font-display text-sm font-semibold sm:text-base">{counterpartName(conversation)}</h2><p className="mt-0.5 text-xs text-muted-foreground">{roleLabel(conversation.counterpartRole)}</p>{conversation.counterpartRole === "company" ? <CompanyTrustChip verified={conversation.counterpartCompanyVerified} /> : null}<div className="mt-1.5 min-w-0"><ProblemChip title={conversation.problemTitle} /></div></div>
      <button aria-label={refreshing ? "Actualizando conversación" : "Actualizar conversación"} className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50" disabled={refreshing} onClick={() => void loadLatest()} title="Actualizar conversación" type="button"><RefreshIcon /></button>
    </header>
    {accountStatus.state === "suspended" ? <div className="shrink-0 p-2 md:hidden"><SuspensionNotice onLogout={() => void logout()} reason={accountStatus.reason} /></div> : null}
    <ConversationNotice matchId={conversation.matchId} onDismiss={() => (scrollRef.current ?? threadRef.current)?.focus({ preventScroll: true })} />
    {realtime === "unavailable" ? <p className="shrink-0 border-b border-border px-4 py-2 text-xs leading-5 text-warning" role="status">La actualización en tiempo real no está disponible. Puedes actualizar la conversación.</p> : null}
    {readError ? <p className="shrink-0 border-b border-border px-4 py-2 text-xs leading-5 text-warning" role="status">{readError}</p> : null}
    <div className="relative flex min-h-0 flex-1 flex-col">
      {loading ? <ThreadSkeleton /> : <div aria-label="Mensajes de la conversación" className="ui-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6" onScroll={(event) => {
        const element = event.currentTarget;
        stickToBottom.current = isScrollNearBottom(element.scrollTop, element.clientHeight, element.scrollHeight);
        if (stickToBottom.current) setShowNewMessages(false);
      }} ref={scrollRef} tabIndex={0}>
        {hasMore ? <div className="mb-5 flex justify-center"><Button disabled={loadingOlder} onClick={() => void loadOlder()} variant="outline">{loadingOlder ? "Cargando mensajes anteriores…" : "Cargar mensajes anteriores"}</Button></div> : null}
        {loadError ? <div className="mb-4 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning" role="status">{loadError.message} <button className="min-h-11 font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => void (loadError.target === "older" ? loadOlder() : loadLatest())} type="button">Reintentar</button></div> : null}
        {!loadError && messages.length === 0 ? <div className="grid min-h-full place-items-center"><EmptyState compact description="Ya pueden conversar sobre el problema que los conectó." icon={MessageCircle} title="Empieza la conversación" tone="neutral" /></div> : null}
        <div className="mx-auto flex max-w-3xl flex-col gap-6">{days.map((day) => <section aria-label={day.label} key={day.date}>
          <div className="mb-5 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="text-xs font-medium text-muted-foreground">{day.label}</span><span className="h-px flex-1 bg-border" /></div>
          <div className="flex flex-col gap-4">{day.groups.map((group) => {
            const own = group.senderId === userId;
            return <div className={`flex flex-col gap-1.5 ${own ? "items-end" : "items-start"}`} key={`${group.senderId}:${group.messages[0].id}`}>
              {group.messages.map((message) => <motion.div animate={{ opacity: 1 }} className="max-w-[90%] sm:max-w-[80%]" initial={{ opacity: 0 }} key={message.id} transition={{ duration: 0.15 }}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${own ? "rounded-br-md bg-accent/20 text-foreground ring-1 ring-inset ring-accent/25" : "rounded-bl-md bg-surface-raised text-foreground ring-1 ring-inset ring-border"}`}><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p></div>
                <div className={`mt-1 flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] text-muted-foreground ${own ? "justify-end" : "justify-start"}`}><time dateTime={message.createdAt}>{new Intl.DateTimeFormat("es-PE", { hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt))}</time>{own ? <><span aria-hidden="true">·</span>{message.status === "sending" ? <><Clock3 aria-hidden="true" className="size-3" /> Enviando</> : message.status === "sent" ? <><Check aria-hidden="true" className="size-3" /> Enviado</> : <span className="text-danger">No enviado</span>}</> : null}</div>
                {own && message.status === "error" ? <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2 text-xs text-danger" role="status"><span>{message.clientId ? sendErrors[message.clientId] ?? "No pudimos enviar el mensaje." : "No pudimos enviar el mensaje."}</span><button className="min-h-11 rounded px-1 font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" disabled={!canWrite} onClick={() => onSend(message)} type="button">Reintentar</button></div> : null}
              </motion.div>)}
            </div>;
          })}</div>
        </section>)}</div>
      </div>}
      {showNewMessages ? <button className="absolute bottom-3 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => { stickToBottom.current = true; const element = scrollRef.current; if (element) element.scrollTop = element.scrollHeight; setShowNewMessages(false); }} type="button"><ArrowDown aria-hidden="true" className="size-4" /> Mensajes nuevos</button> : null}
    </div>
    <form className="chat-composer shrink-0 border-t border-border bg-surface px-3 pt-3 sm:px-5" onSubmit={onSubmit}>
      {!canWrite && accountStatus.state !== "suspended" ? <p className="pb-2 text-sm text-muted-foreground" role="status">{accountStatus.state === "loading" ? "Comprobando el estado de tu cuenta…" : "No pudimos comprobar tu cuenta. Vuelve a chats para reintentar."}</p> : null}
      <label className="sr-only" htmlFor="chat-message">Escribe un mensaje</label>
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-1.5 focus-within:ring-2 focus-within:ring-accent">
        <textarea disabled={!canWrite} className="ui-scrollbar max-h-[140px] min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground" id="chat-message" maxLength={CHAT_MESSAGE_LIMIT * 2} onChange={(event) => { setDraft(Array.from(event.target.value).slice(0, CHAT_MESSAGE_LIMIT).join("")); setComposeError(""); }} onKeyDown={onKeyDown} placeholder="Escribe un mensaje…" ref={textareaRef} rows={1} value={draft} />
        <button aria-label="Enviar mensaje" className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft disabled:opacity-40" disabled={!canWrite || !draft.trim()} type="submit"><Send aria-hidden="true" className="size-5" strokeWidth={1.8} /></button>
      </div>
      <div className="flex min-h-6 items-center justify-between gap-3 px-1 text-xs text-muted-foreground"><span className="hidden sm:inline">Enter para enviar · Shift + Enter para una nueva línea</span><span className="sm:hidden">Solo texto</span>{draftLength >= 1800 ? <span aria-live="polite">{draftLength} / {CHAT_MESSAGE_LIMIT}</span> : null}</div>
      {composeError ? <p className="pb-2 text-sm text-danger" role="status">{composeError}</p> : null}
    </form>
  </section>;
}
