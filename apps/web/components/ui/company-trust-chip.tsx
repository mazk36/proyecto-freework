"use client";

import { Info, ShieldCheck, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { companyTrustVariant } from "@/lib/company-trust";

export function CompanyTrustChip({ verified }: { verified: boolean | null | undefined }) {
  const variant = companyTrustVariant(verified);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  if (variant === null) return null;
  if (variant === "verified") return <Badge icon={ShieldCheck} tone="success">Empresa verificada</Badge>;

  return <>
    <button
      aria-controls={id}
      aria-expanded={open}
      aria-haspopup="dialog"
      className="inline-flex min-h-11 max-w-full items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onClick={() => {
        if (popup.current?.matches(":popover-open")) popup.current.hidePopover();
        else { popup.current?.showPopover(); popup.current?.focus(); }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      ref={trigger}
      type="button"
    ><Badge className="text-muted-foreground" icon={Info}>Empresa sin verificar</Badge></button>
    <div
      aria-describedby={`${id}-description`}
      aria-label="Información sobre la verificación"
      className="ui-trust-popover rounded-2xl border border-border bg-surface-raised p-4 text-foreground shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      id={id}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); popup.current?.hidePopover(); trigger.current?.focus(); }
      }}
      onToggle={(event) => {
        const showing = event.currentTarget.matches(":popover-open");
        setOpen(showing);
        if (!showing && document.activeElement === document.body) trigger.current?.focus();
      }}
      popover="auto"
      ref={popup}
      role="dialog"
      tabIndex={-1}
    >
      <div className="flex items-start gap-3"><Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" /><p className="min-w-0 flex-1 text-sm leading-6" id={`${id}-description`}>MatchWork aún no ha revisado los datos de esta empresa. Usa tu criterio antes de compartir información.</p><button aria-label="Cerrar información" className="-m-2 grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => { popup.current?.hidePopover(); trigger.current?.focus(); }} type="button"><X aria-hidden="true" className="size-4" /></button></div>
    </div>
  </>;
}
