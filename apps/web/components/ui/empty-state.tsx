import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { BadgeTone } from "./badge";

const iconClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-raised text-foreground ring-border",
  accent: "bg-accent-soft/15 text-foreground ring-accent-soft/30",
  success: "bg-success-soft text-success ring-success/30",
  warning: "bg-warning-soft text-warning ring-warning/30",
  danger: "bg-danger-soft text-danger ring-danger/30",
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "accent",
  compact = false,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: BadgeTone;
  compact?: boolean;
  className?: string;
}) {
  return (
    <section className={`flex flex-col items-center text-center ${compact ? "px-4 py-6" : "px-5 py-12 sm:px-8"} ${className}`}>
      <div className={`grid shrink-0 place-items-center rounded-full ring-1 ring-inset ${compact ? "size-12" : "size-16"} ${iconClasses[tone]}`}>
        <Icon aria-hidden="true" className={compact ? "size-5" : "size-7"} strokeWidth={1.8} />
      </div>
      <h2 className={`max-w-xl font-display font-semibold tracking-tight text-foreground ${compact ? "mt-4 text-base" : "mt-5 text-xl sm:text-2xl"}`}>
        {title}
      </h2>
      <p className={`max-w-lg text-sm leading-6 text-muted-foreground ${compact ? "mt-2" : "mt-3 sm:text-base"}`}>
        {description}
      </p>
      {action ? <div className={compact ? "mt-4" : "mt-6"}>{action}</div> : null}
    </section>
  );
}
