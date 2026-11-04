import { AlertCircle, Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const toneClasses = {
  accent: "bg-accent-soft/15 text-foreground ring-accent-soft/30",
  danger: "bg-danger-soft text-danger ring-danger/30",
} as const;

/** Pantalla completa de estado vacío o de error: ícono, título, una frase útil y, si hay, una acción. */
export function AppEmptyState({
  title,
  description,
  action,
  icon,
  tone = "accent",
  embedded = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof toneClasses;
  /** Dentro de una pantalla que ya tiene su propio h1: el título pasa a h2 y se reduce la altura. */
  embedded?: boolean;
}) {
  const Icon = icon ?? (tone === "danger" ? AlertCircle : Inbox);
  const Heading = embedded ? "h2" : "h1";
  return (
    <section className={`mx-auto grid w-full max-w-3xl place-items-center px-5 sm:px-8 ${embedded ? "py-10" : "min-h-[48vh] py-12"}`}>
      <div className="w-full max-w-xl text-center">
        <span aria-hidden="true" className={`mx-auto grid size-14 place-items-center rounded-2xl ring-1 ring-inset ${toneClasses[tone]}`}>
          <Icon className="size-6" strokeWidth={1.8} />
        </span>
        <Heading className="mt-5 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</Heading>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </section>
  );
}
