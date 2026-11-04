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
  problemTitleSnapshot: string;
  freelancerId: string;
  status: ProposalStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const proposalTextLimits = [
  ["diagnosis", 5000, "El diagnóstico no puede superar los 5,000 caracteres."],
  ["solution", 5000, "La solución no puede superar los 5,000 caracteres."],
  ["deliverables", 5000, "Los entregables no pueden superar los 5,000 caracteres."],
  ["timeline", 300, "El plazo no puede superar los 300 caracteres."],
  ["recurringCosts", 2000, "Los costos recurrentes no pueden superar los 2,000 caracteres."],
  ["maintenanceWarranty", 2000, "El mantenimiento y la garantía no pueden superar los 2,000 caracteres."],
  ["relatedExperience", 2000, "La experiencia relacionada no puede superar los 2,000 caracteres."],
] as const;

const requiredMessages = {
  diagnosis: "Cuéntale a la empresa cómo entiendes el problema.",
  solution: "Describe la solución que propones.",
  deliverables: "Describe los entregables de tu propuesta.",
  timeline: "Indica el plazo de tu propuesta.",
  price: "Indica el precio de tu propuesta.",
} as const;

const priceMessage = "Ingresa un precio mayor o igual a cero, menor a 10,000 millones y con máximo dos decimales.";
const currencyMessage = "Selecciona una moneda válida: PEN o USD.";

export type ProposalField = Exclude<keyof ProposalDraftInput, "id">;
export type ProposalFieldErrors = Partial<Record<ProposalField, string>>;

/** Maps the domain validator's messages to controls without duplicating validation rules. */
export function mapProposalErrors(messages: readonly string[], allowIncomplete = false): ProposalFieldErrors {
  const fields: ProposalFieldErrors = {};
  for (const [field, message] of Object.entries(requiredMessages) as [keyof typeof requiredMessages, string][]) {
    if (!allowIncomplete && messages.includes(message)) fields[field] = message;
  }
  for (const [field, , message] of proposalTextLimits) {
    if (messages.includes(message)) fields[field] = message;
  }
  if (messages.includes(priceMessage)) fields.price = priceMessage;
  if (messages.includes(currencyMessage)) fields.currency = currencyMessage;
  return fields;
}

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
  if (!input.diagnosis.trim()) errors.push(requiredMessages.diagnosis);
  if (!input.solution.trim()) errors.push(requiredMessages.solution);
  if (!input.deliverables.trim()) errors.push(requiredMessages.deliverables);
  if (!input.timeline.trim()) errors.push(requiredMessages.timeline);
  for (const [field, limit, message] of proposalTextLimits) {
    // PostgreSQL char_length counts Unicode code points, not UTF-16 code units.
    if (Array.from(input[field]).length > limit) errors.push(message);
  }
  if (input.price === null) errors.push(requiredMessages.price);
  else if (
    !Number.isFinite(input.price)
    || input.price < 0
    || input.price > 9999999999.99
    || Math.round(input.price * 100) / 100 !== input.price
  ) errors.push(priceMessage);
  if (input.currency !== "PEN" && input.currency !== "USD") errors.push(currencyMessage);
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
