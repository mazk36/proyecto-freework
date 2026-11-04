"use client";

import { Check, Clock3 } from "lucide-react";
import { memo } from "react";
import type { ChatMessage, groupMessagesByDay } from "@/lib/chat";

type Days = ReturnType<typeof groupMessagesByDay>;

/**
 * Lista de mensajes memoizada: escribir en el cuadro de texto no vuelve a pintar cientos de burbujas
 * (con CPU x4 y 300 mensajes, cada pulsación tardaba más de un segundo).
 */
export const MessageDays = memo(function MessageDays({ days, userId, sendErrors, canWrite, onSend }: {
  days: Days;
  userId: string;
  sendErrors: Record<string, string>;
  canWrite: boolean;
  onSend: (message: ChatMessage) => void;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">{days.map((day) => <section aria-label={day.label} key={day.date}>
          <div className="mb-5 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="text-xs font-medium text-muted-foreground">{day.label}</span><span className="h-px flex-1 bg-border" /></div>
          <div className="flex flex-col gap-4">{day.groups.map((group) => {
            const own = group.senderId === userId;
            return <div className={`flex flex-col gap-1.5 ${own ? "items-end" : "items-start"}`} key={`${group.senderId}:${group.messages[0].id}`}>
              {group.messages.map((message) => <div className="chat-message-in max-w-[90%] sm:max-w-[80%]" key={message.id}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${own ? "rounded-br-md bg-accent/20 text-foreground ring-1 ring-inset ring-accent/25" : "rounded-bl-md bg-surface-raised text-foreground ring-1 ring-inset ring-border"}`}><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p></div>
                <div className={`mt-1 flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] text-muted-foreground ${own ? "justify-end" : "justify-start"}`}><time dateTime={message.createdAt}>{new Intl.DateTimeFormat("es-PE", { hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt))}</time>{own ? <><span aria-hidden="true">·</span>{message.status === "sending" ? <><Clock3 aria-hidden="true" className="size-3" /> Enviando</> : message.status === "sent" ? <><Check aria-hidden="true" className="size-3" /> Enviado</> : <span className="text-danger">No enviado</span>}</> : null}</div>
                {own && message.status === "error" ? <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2 text-xs text-danger" role="status"><span>{message.clientId ? sendErrors[message.clientId] ?? "No pudimos enviar el mensaje." : "No pudimos enviar el mensaje."}</span><button className="min-h-11 rounded px-1 font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" disabled={!canWrite} onClick={() => onSend(message)} type="button">Reintentar</button></div> : null}
              </div>)}
            </div>;
          })}</div>
        </section>)}</div>
  );
});
