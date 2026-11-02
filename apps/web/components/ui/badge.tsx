import { Archive, CheckCircle2, CirclePause, FilePenLine, Send, Undo2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";
export type BadgeStatus = "draft" | "open" | "paused" | "closed" | "submitted" | "withdrawn";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-raised text-foreground ring-border",
  accent: "bg-accent/15 text-foreground ring-accent/30",
  success: "bg-success-soft text-success ring-success/30",
  warning: "bg-warning-soft text-warning ring-warning/30",
  danger: "bg-danger-soft text-danger ring-danger/30",
};

const statuses: Record<BadgeStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  draft: { label: "Borrador", tone: "neutral", icon: FilePenLine },
  open: { label: "Abierto", tone: "success", icon: CheckCircle2 },
  paused: { label: "Pausado", tone: "warning", icon: CirclePause },
  closed: { label: "Cerrado", tone: "neutral", icon: Archive },
  submitted: { label: "Enviada", tone: "accent", icon: Send },
  withdrawn: { label: "Retirada", tone: "danger", icon: Undo2 },
};

export function Badge({
  tone = "neutral",
  icon: Icon,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-4 ring-1 ring-inset ${toneClasses[tone]} ${className}`}>
      {Icon ? <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const { label, tone, icon } = statuses[status];
  return <Badge icon={icon} tone={tone}>{label}</Badge>;
}
