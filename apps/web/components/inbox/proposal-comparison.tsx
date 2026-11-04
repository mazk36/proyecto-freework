"use client";

import { Columns3 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { InboxProposal } from "@/lib/company-inbox-service";
import { comparisonFields, proposalFieldValue } from "./proposal-content";

export function ProposalComparison({ proposals, onBack }: { proposals: InboxProposal[]; onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return <section aria-labelledby="comparison-heading" className="min-w-0">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-lavender">Propuestas seleccionadas</p><h2 className="mt-2 font-display text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" id="comparison-heading" ref={headingRef} tabIndex={-1}>Comparar propuestas</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Revisa los detalles de cada propuesta lado a lado.</p></div>
      <Button onClick={onBack} variant="outline">Volver a la bandeja</Button>
    </div>
    {proposals.length < 2 ? <div className="mt-6 rounded-2xl border border-border bg-surface"><EmptyState action={<Button onClick={onBack}>Elegir propuestas</Button>} description="Selecciona al menos dos propuestas para compararlas." icon={Columns3} title="Elige propuestas para comparar" /></div> : <>
      <div className="mt-6 hidden min-w-0 overflow-hidden rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead><tr className="bg-surface-raised"><th className="w-36 p-4 align-top text-xs font-semibold text-muted-foreground" scope="col">Campo</th>{proposals.map((proposal) => <th className="break-words p-4 align-top font-display font-semibold" key={proposal.id} scope="col">{proposal.freelancerName || "Freelancer de MatchWork"}</th>)}</tr></thead>
          <tbody>{comparisonFields.map(([field, label]) => <tr className="border-t border-border" key={field}><th className="p-4 align-top font-medium text-muted-foreground" scope="row">{label}</th>{proposals.map((proposal) => <td className={`whitespace-pre-wrap break-words p-4 align-top leading-6 ${field === "price" ? "font-mono" : ""}`} key={proposal.id}>{proposalFieldValue(proposal, field)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="mt-5 text-sm text-muted-foreground lg:hidden">Desliza horizontalmente para ver las demás propuestas.</p>
      <div aria-label="Comparación de propuestas, desplázate horizontalmente" className="ui-scrollbar mt-3 flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden" role="region" tabIndex={0}>
        {proposals.map((proposal, index) => <article className="w-[min(85%,22rem)] min-w-0 shrink-0 snap-start rounded-2xl border border-border bg-surface p-5" key={proposal.id}>
          <p className="font-mono text-xs text-muted-foreground">{index + 1} / {proposals.length}</p><h3 className="mt-2 break-words font-display font-semibold">{proposal.freelancerName || "Freelancer de MatchWork"}</h3>
          <dl className="mt-4 divide-y divide-border">{comparisonFields.map(([field, label]) => <div className="py-4" key={field}><dt className="text-xs font-semibold text-muted-foreground">{label}</dt><dd className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 ${field === "price" ? "font-mono" : ""}`}>{proposalFieldValue(proposal, field)}</dd></div>)}</dl>
        </article>)}
      </div>
    </>}
  </section>;
}
