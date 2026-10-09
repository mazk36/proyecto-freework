export const impactOptions = [
  { value: "time", label: "Pérdida de tiempo" },
  { value: "errors", label: "Errores frecuentes" },
  { value: "financial", label: "Pérdidas económicas" },
  { value: "customers", label: "Clientes insatisfechos" },
  { value: "repetitive", label: "Trabajo repetitivo" },
  { value: "other", label: "Otro" },
] as const;

export const objectiveOptions = [
  { value: "save_time", label: "Ahorrar tiempo" },
  { value: "reduce_errors", label: "Reducir errores" },
  { value: "increase_sales", label: "Aumentar ventas" },
  { value: "automate", label: "Automatizar tareas" },
  { value: "organize", label: "Organizar información" },
  { value: "customer_service", label: "Mejorar atención al cliente" },
  { value: "other", label: "Otro" },
] as const;

export const budgetOptions = [
  { value: "under_1000", label: "Menos de S/ 1,000" },
  { value: "1000_3000", label: "S/ 1,000 – S/ 3,000" },
  { value: "3000_5000", label: "S/ 3,000 – S/ 5,000" },
  { value: "5000_10000", label: "S/ 5,000 – S/ 10,000" },
  { value: "over_10000", label: "Más de S/ 10,000" },
  { value: "unknown", label: "Todavía no lo sé" },
] as const;

export const deadlineOptions = [
  { value: "asap", label: "Lo antes posible" },
  { value: "under_two_weeks", label: "En menos de 2 semanas" },
  { value: "within_one_month", label: "Dentro de 1 mes" },
  { value: "one_to_three_months", label: "En 1 a 3 meses" },
  { value: "flexible", label: "Soy flexible con el tiempo" },
] as const;

export type BudgetChoice = (typeof budgetOptions)[number]["value"];
export type DeadlineChoice = (typeof deadlineOptions)[number]["value"];
export type ProblemStatus = "draft" | "open" | "paused" | "closed";

export type CompanyProfile = {
  companyName: string;
  industry: string;
  countryCode: string;
};

export type ProblemDraft = {
  id: string | null;
  currentStep: number;
  title: string;
  description: string;
  impacts: string[];
  locationsCount: number | null;
  peopleAffected: number | null;
  currentProcess: string;
  currentTools: string;
  specialConditions: string;
  objectives: string[];
  successCriteria: string;
  budgetChoice: BudgetChoice | "";
  deadlineChoice: DeadlineChoice | "";
  showCompanyName: boolean;
  reviewedAndConsented: boolean;
};

export type CompanyProblem = ProblemDraft & {
  id: string;
  status: ProblemStatus;
  industrySnapshot: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type PublicProblem = Pick<
  CompanyProblem,
  "id" | "title" | "description" | "impacts" | "industrySnapshot" | "objectives" | "budgetChoice" | "currency" | "deadlineChoice" | "publishedAt"
> & { companyName: string | null };

export function createEmptyProblemDraft(): ProblemDraft {
  return {
    id: null,
    currentStep: 1,
    title: "",
    description: "",
    impacts: [],
    locationsCount: null,
    peopleAffected: null,
    currentProcess: "",
    currentTools: "",
    specialConditions: "",
    objectives: [],
    successCriteria: "",
    budgetChoice: "",
    deadlineChoice: "",
    showCompanyName: false,
    reviewedAndConsented: false,
  };
}

export function isCompanyProfileComplete(
  profile: CompanyProfile | null,
): profile is CompanyProfile {
  return Boolean(profile?.companyName.trim() && profile.industry.trim() && /^[A-Z]{2}$/.test(profile.countryCode));
}

export function validateProblemStep(step: number, draft: ProblemDraft): string[] {
  if (step === 1) {
    const errors: string[] = [];
    if (draft.title.trim().length < 12 || draft.title.trim().length > 120) {
      errors.push("Escribe un título de entre 12 y 120 caracteres.");
    }
    if (draft.description.trim().length < 40 || draft.description.trim().length > 3000) {
      errors.push("Describe la situación con entre 40 y 3,000 caracteres.");
    }
    if (draft.impacts.some((impact) => !impactOptions.some((option) => option.value === impact))) {
      errors.push("Revisa las opciones de impacto seleccionadas.");
    }
    return errors;
  }
  if (step === 3) {
    const errors: string[] = [];
    if (draft.objectives.length === 0) errors.push("Selecciona al menos un objetivo.");
    if (draft.objectives.some((objective) => !objectiveOptions.some((option) => option.value === objective))) {
      errors.push("Revisa los objetivos seleccionados.");
    }
    return errors;
  }
  if (step === 4) {
    const errors: string[] = [];
    if (!budgetOptions.some((option) => option.value === draft.budgetChoice)) {
      errors.push("Elige un presupuesto o selecciona que todavía no lo sabes.");
    }
    if (!deadlineOptions.some((option) => option.value === draft.deadlineChoice)) {
      errors.push("Elige un plazo para la posible solución.");
    }
    return errors;
  }
  if (step === 5 && !draft.reviewedAndConsented) {
    return ["Confirma que revisaste la información y puedes compartirla."];
  }
  return [];
}

export function validateProblemForPublishing(draft: ProblemDraft): string[] {
  return [1, 3, 4, 5].flatMap((step) => validateProblemStep(step, draft));
}

export function getOptionLabel<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

export function formatProblemBudget(choice: string, currency = "PEN"): string {
  if (choice === "unknown") return "Todavía no lo sé";
  const ranges: Record<string, [number, number | null]> = {
    under_1000: [0, 1000], "1000_3000": [1000, 3000], "3000_5000": [3000, 5000],
    "5000_10000": [5000, 10000], over_10000: [10000, null],
  };
  const range = ranges[choice];
  if (!range) return "Sin definir";
  const symbols: Record<string, string> = { ARS: "AR$", BRL: "R$", CLP: "$", COP: "COL$", EUR: "€", MXN: "MX$", PEN: "S/", USD: "US$" };
  const unit = symbols[currency] ?? currency;
  const amount = (value: number) => new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value);
  if (range[1] === null) return `Más de ${unit} ${amount(range[0])}`;
  if (range[0] === 0) return `Menos de ${unit} ${amount(range[1])}`;
  return `${unit} ${amount(range[0])} – ${unit} ${amount(range[1])}`;
}

export function formatProblemDeadline(choice: string): string {
  return getOptionLabel(deadlineOptions, choice) || "Sin definir";
}
