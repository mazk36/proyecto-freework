import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatConversation } from "@/lib/chat-service";

export function counterpartName(conversation: ChatConversation): string {
  return conversation.counterpartName?.trim() || (conversation.counterpartRole === "company" ? "Empresa" : "Freelancer");
}

export function roleLabel(role: ChatConversation["counterpartRole"]): string {
  return role === "company" ? "Empresa" : "Freelancer";
}

export function ChatAvatar({ name, role }: { name: string | null; role: ChatConversation["counterpartRole"] }) {
  const initials = (name?.trim().split(/\s+/u).slice(0, 2).map((word) => Array.from(word)[0]).join("") || (role === "company" ? "E" : "F")).toLocaleUpperCase("es-PE");
  return <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-sm font-semibold text-accent-soft ring-1 ring-inset ring-accent/20">{initials}</span>;
}

export function UnreadBadge({ count }: { count: number }) {
  return <span aria-label={`${count} mensajes sin leer`} className="grid min-h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent-soft px-1.5 text-[0.625rem] font-bold text-brand-navy" role="img"><span aria-hidden="true">{count > 99 ? "99+" : count}</span></span>;
}

export function ConversationSkeleton() {
  return <div aria-label="Cargando conversaciones" className="grid gap-1 p-4" role="status">{[0, 1, 2, 3].map((item) => <div aria-hidden="true" className="flex gap-3 py-3" key={item}><Skeleton className="size-11 shrink-0 rounded-2xl" /><div className="grid flex-1 gap-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-4/5" /></div></div>)}</div>;
}

export function ThreadSkeleton() {
  return <div aria-label="Cargando mensajes" className="flex flex-1 flex-col gap-5 p-5" role="status"><Skeleton className="h-12 w-2/3" /><Skeleton className="mt-8 h-16 w-3/4 rounded-2xl" /><Skeleton className="h-20 w-2/3 self-end rounded-2xl" /><Skeleton className="h-14 w-1/2 rounded-2xl" /></div>;
}

export function ProblemChip({ title }: { title: string }) {
  return <Badge className="min-w-0 max-w-full" tone="accent"><span className="truncate">{title}</span></Badge>;
}

export function RefreshIcon() {
  return <RefreshCw aria-hidden="true" className="size-4" strokeWidth={1.8} />;
}
