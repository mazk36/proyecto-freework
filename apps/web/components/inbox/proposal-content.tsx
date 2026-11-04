import type { InboxProposal } from "@/lib/company-inbox-service";
import { formatProposalPrice } from "@/lib/proposal-domain";

export const comparisonFields = [
  ["price", "Precio"],
  ["timeline", "Plazo"],
  ["deliverables", "Entregables"],
  ["diagnosis", "Diagnóstico"],
  ["solution", "Solución"],
  ["recurringCosts", "Costos recurrentes"],
  ["maintenanceWarranty", "Soporte posterior (opcional)"],
  ["relatedExperience", "Experiencia relacionada"],
] as const;

export function proposalFieldValue(proposal: InboxProposal, field: typeof comparisonFields[number][0]): string {
  if (field === "price") return proposal.price === null ? "No indicado" : formatProposalPrice(proposal.price, proposal.currency);
  return proposal[field].trim() || "No indicado";
}

export function ProposalFullContent({ proposal }: { proposal: InboxProposal }) {
  return <div className="space-y-5 pb-2">
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="font-display font-semibold">{proposal.freelancerName || "Freelancer de MatchWork"}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{proposal.headline || "Freelancer independiente"}</p>
    </div>
    {comparisonFields.map(([field, label]) => <section className="min-w-0" key={field}>
      <h3 className="text-sm font-semibold text-muted-foreground">{label}</h3>
      <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 ${field === "price" ? "font-mono text-foreground" : "text-foreground"}`}>{proposalFieldValue(proposal, field)}</p>
    </section>)}
  </div>;
}
