export type ProposalCurrency = "PEN" | "USD";
export type ProposalStatus = "draft" | "submitted" | "withdrawn";

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  draft: "Borrador",
  submitted: "Enviada",
  withdrawn: "Retirada",
};

export type ProposalDraftInput = {
  id: string | null;
  diagnosis: string;
  solution: string;
  deliverables: string;
  timeline: string;
  price: number | null;
  currency: ProposalCurrency;
  recurringCosts: string;
  maintenanceWarranty: string;
  relatedExperience: string;
};

export type Proposal = ProposalDraftInput & {
  id: string;
  problemId: string;
  freelancerId: string;
  status: ProposalStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createEmptyProposalDraft(): ProposalDraftInput {
  return {
    id: null,
    diagnosis: "",
    solution: "",
    deliverables: "",
    timeline: "",
    price: null,
    currency: "PEN",
    recurringCosts: "",
    maintenanceWarranty: "",
    relatedExperience: "",
  };
}

export function validateProposalForSubmit(input: ProposalDraftInput): string[] {
  const errors: string[] = [];
  if (!input.diagnosis.trim()) errors.push("Cuéntale a la empresa cómo entiendes el problema.");
  if (!input.solution.trim()) errors.push("Describe la solución que propones.");
  if (!input.deliverables.trim()) errors.push("Describe los entregables de tu propuesta.");
  if (!input.timeline.trim()) errors.push("Indica el plazo de tu propuesta.");
  if (input.price === null) errors.push("Indica el precio de tu propuesta.");
  else if (!Number.isFinite(input.price) || input.price < 0) errors.push("Ingresa un precio válido mayor o igual a cero.");
  if (input.currency !== "PEN" && input.currency !== "USD") errors.push("Selecciona una moneda válida: PEN o USD.");
  return errors;
}

export function formatProposalPrice(amount: number, currency: ProposalCurrency): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  const formatted = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount);
  return `${currency === "PEN" ? "S/" : "US$"} ${formatted}`;
}

export function toRpcPayload(input: ProposalDraftInput) {
  return {
    ...(input.id !== null ? { id: input.id } : {}),
    diagnosis: input.diagnosis.trim(),
    solution: input.solution.trim(),
    deliverables: input.deliverables.trim(),
    timeline: input.timeline.trim(),
    price: input.price,
    currency: input.currency,
    recurring_costs: input.recurringCosts.trim(),
    maintenance_warranty: input.maintenanceWarranty.trim(),
    related_experience: input.relatedExperience.trim(),
  };
}
