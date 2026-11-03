"use client";

import { Bookmark, Heart, X } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatInboxDate } from "@/lib/company-inbox";
import type { InboxProposal } from "@/lib/company-inbox-service";
import { formatProposalPrice } from "@/lib/proposal-domain";
import type { CompanyProposalInteraction } from "@/types/domain";

export function ProposalCard({ proposal, selected, comparisonFull, canInteract, busy, pending, onCompare, onDetail, onDecision }: {
  proposal: InboxProposal;
  selected: boolean;
  comparisonFull: boolean;
  canInteract: boolean;
  busy: boolean;
  pending: boolean;
  onCompare: () => void;
  onDetail: () => void;
  onDecision: (next: CompanyProposalInteraction) => void;
}) {
  const limitId = useId();
  const unavailable = comparisonFull && !selected;
  const matched = proposal.myState === "interested" || Boolean(proposal.matchId);
  const name = proposal.freelancerName || "Profesional de MatchWork";
  return <article className="min-w-0 rounded-2xl border border-border bg-surface p-5 ring-1 ring-inset ring-white/5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 basis-48">
        <div className="flex flex-wrap items-center gap-2">
          {proposal.freelancerSlug ? <Link className="min-h-11 inline-flex items-center break-words rounded-lg font-display font-semibold underline decoration-border underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href={`/profesionales/?slug=${encodeURIComponent(proposal.freelancerSlug)}`}>{name}</Link> : <h3 className="break-words font-display font-semibold">{name}</h3>}
          {proposal.matchId ? <Badge icon={Heart} tone="accent">Hicieron Match</Badge> : proposal.myState === "interested" ? <Badge tone="accent">Interés registrado</Badge> : proposal.myState === "saved" ? <Badge icon={Bookmark} tone="accent">Guardada</Badge> : proposal.myState === "dismissed" ? <Badge icon={X} tone="neutral">Descartada</Badge> : null}
        </div>
        <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{proposal.headline || "Profesional independiente"}</p>
      </div>
      <div className="min-w-0 text-left sm:text-right">
        <p className="font-mono text-base font-medium">{proposal.price === null ? "Precio no indicado" : formatProposalPrice(proposal.price, proposal.currency)}</p>
        <p className="mt-1 break-words text-sm text-muted-foreground">{proposal.timeline || "Plazo no indicado"}</p>
      </div>
    </div>
    <p className="mt-4 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">{proposal.diagnosis}</p>
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>Enviada el {formatInboxDate(proposal.submittedAt)}</span>
      <button className="min-h-11 rounded-lg font-semibold text-foreground underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={onDetail} type="button">Ver propuesta completa</button>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        {proposal.matchId ? <ButtonLink href={`/app/chats?match=${encodeURIComponent(proposal.matchId)}`}>Abrir chat</ButtonLink> : matched ? <p className="max-w-sm text-sm leading-6 text-muted-foreground">Actualiza la bandeja para consultar el Match.</p> : <>
          <Button disabled={busy || !canInteract} onClick={() => onDecision("interested")}>Me interesa</Button>
          <Button disabled={busy || !canInteract || proposal.myState === "saved"} onClick={() => onDecision("saved")} variant="outline">Guardar</Button>
          <Button disabled={busy || !canInteract || proposal.myState === "dismissed"} onClick={() => onDecision("dismissed")} variant="quiet">Descartar</Button>
        </>}
      </div>
      <div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1 text-sm font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
          <input aria-describedby={unavailable ? limitId : undefined} aria-disabled={unavailable || undefined} checked={selected} className="size-5 accent-accent" onChange={() => { if (!unavailable) onCompare(); }} type="checkbox" />
          Comparar<span className="sr-only"> propuesta de {name}</span>
        </label>
        {unavailable ? <p className="max-w-52 text-xs leading-5 text-muted-foreground" id={limitId}>Máximo 3 propuestas. Quita una para añadir otra.</p> : null}
      </div>
    </div>
    {pending ? <p aria-live="polite" className="mt-3 text-sm text-muted-foreground" role="status">Actualizando decisión…</p> : null}
  </article>;
}
