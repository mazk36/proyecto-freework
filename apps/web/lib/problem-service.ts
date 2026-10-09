import { getSupabaseClient } from "@/lib/supabase/client";
import {
  budgetOptions,
  deadlineOptions,
  impactOptions,
  objectiveOptions,
  type CompanyProblem,
  type CompanyProfile,
  type ProblemDraft,
  type ProblemStatus,
  type PublicProblem,
} from "@/lib/problem-domain";
import type { Json } from "@/types/database";

export class ProblemServiceError extends Error {}

export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  const data = await callRpc("get_company_profile", {});
  if (!isRecord(data)) return null;
  return {
    companyName: stringValue(data.company_name),
    industry: stringValue(data.industry),
    countryCode: stringValue(data.country_code) || "PE",
  };
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<CompanyProfile> {
  const data = await callRpc("save_company_profile", {
    p_profile: {
      company_name: profile.companyName.trim(),
      industry: profile.industry.trim(),
      country_code: profile.countryCode,
    },
  });
  if (!isRecord(data)) throw new ProblemServiceError("No pudimos guardar el perfil empresarial.");
  return {
    companyName: stringValue(data.company_name),
    industry: stringValue(data.industry),
    countryCode: stringValue(data.country_code) || "PE",
  };
}

export async function getMyCompanyProblems(): Promise<CompanyProblem[]> {
  const data = await callRpc("get_my_company_problems", {});
  return Array.isArray(data) ? data.flatMap((item) => {
    const problem = parseCompanyProblem(item);
    return problem ? [problem] : [];
  }) : [];
}

export async function getMyCompanyProblem(id: string): Promise<CompanyProblem | null> {
  const data = await callRpc("get_my_company_problem", { p_problem_id: id });
  return parseCompanyProblem(data);
}

export async function listOpenBusinessProblems(): Promise<PublicProblem[]> {
  const data = await callRpc("list_open_business_problems", {});
  return Array.isArray(data) ? data.flatMap((item) => {
    const problem = parsePublicProblem(item);
    return problem ? [problem] : [];
  }) : [];
}

export async function saveBusinessProblemDraft(draft: ProblemDraft, profile: CompanyProfile): Promise<string> {
  const data = await callRpc("save_business_problem_draft", {
    p_problem_id: draft.id,
    p_data: toProblemPayload(draft, profile) as Json,
  });
  if (typeof data !== "string") throw new ProblemServiceError("No pudimos confirmar el guardado del borrador.");
  return data;
}

export async function publishBusinessProblem(id: string): Promise<string> {
  const data = await callRpc("publish_business_problem", { p_problem_id: id });
  if (typeof data !== "string") throw new ProblemServiceError("No pudimos confirmar la publicación.");
  return data;
}

export async function beginBusinessProblemEdit(id: string): Promise<void> {
  await callRpc("begin_business_problem_edit", { p_problem_id: id });
}

export async function transitionBusinessProblem(id: string, action: "pause" | "resume" | "close"): Promise<void> {
  await callRpc("transition_business_problem", { p_problem_id: id, p_action: action });
}

export function currencyForCountry(countryCode: string): string {
  const byCountry: Record<string, string> = {
    AR: "ARS", BR: "BRL", CL: "CLP", CO: "COP", ES: "EUR", MX: "MXN", PE: "PEN", US: "USD",
  };
  return byCountry[countryCode.toUpperCase()] ?? "USD";
}

export function budgetLabel(choice: string, currency = "PEN"): string {
  if (choice === "unknown") return "Todavía no lo sé";
  const ranges: Record<string, [number, number | null]> = {
    under_1000: [0, 1000],
    "1000_3000": [1000, 3000],
    "3000_5000": [3000, 5000],
    "5000_10000": [5000, 10000],
    over_10000: [10000, null],
  };
  const range = ranges[choice];
  if (!range) return "Sin definir";
  const currencySymbols: Record<string, string> = {
    ARS: "AR$", BRL: "R$", CLP: "$", COP: "COL$", EUR: "€", MXN: "MX$", PEN: "S/", USD: "US$",
  };
  const unit = currencySymbols[currency] ?? currency;
  const amount = (value: number) => new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value);
  return range[1] === null
    ? `Más de ${unit} ${amount(range[0])}`
    : range[0] === 0
      ? `Menos de ${unit} ${amount(range[1])}`
      : `${unit} ${amount(range[0])} – ${unit} ${amount(range[1])}`;
}

export function deadlineLabel(value: string): string {
  return deadlineOptions.find((item) => item.value === value)?.label ?? "Sin definir";
}

export function objectiveLabels(values: string[]): string[] {
  return values.map((value) => objectiveOptions.find((item) => item.value === value)?.label ?? value);
}

export function impactLabels(values: string[]): string[] {
  return values.map((value) => impactOptions.find((item) => item.value === value)?.label ?? value);
}

async function callRpc<Name extends keyof import("@/types/database").Database["public"]["Functions"]>(
  name: Name,
  args: import("@/types/database").Database["public"]["Functions"][Name]["Args"],
): Promise<import("@/types/database").Database["public"]["Functions"][Name]["Returns"]> {
  const client = getSupabaseClient();
  if (!client) throw new ProblemServiceError("La conexión con Supabase no está configurada.");
  const { data, error } = await client.rpc(name, args);
  if (error) throw new ProblemServiceError(toFriendlyError(error.message));
  return data as import("@/types/database").Database["public"]["Functions"][Name]["Returns"];
}

function toProblemPayload(draft: ProblemDraft, profile: CompanyProfile) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    impacts: draft.impacts,
    industry_snapshot: profile.industry,
    locations_count: draft.locationsCount,
    people_affected: draft.peopleAffected,
    current_process: draft.currentProcess.trim(),
    current_tools: draft.currentTools.trim(),
    special_conditions: draft.specialConditions.trim(),
    objectives: draft.objectives,
    success_criteria: draft.successCriteria.trim(),
    budget_choice: draft.budgetChoice,
    currency: currencyForCountry(profile.countryCode),
    deadline_choice: draft.deadlineChoice,
    current_step: draft.currentStep,
    show_company_name: draft.showCompanyName,
    reviewed_and_consented: draft.reviewedAndConsented,
  };
}

function parseCompanyProblem(value: unknown): CompanyProblem | null {
  if (!isRecord(value) || typeof value.id !== "string" || !isProblemStatus(value.status)) return null;
  return {
    id: value.id,
    currentStep: typeof value.current_step === "number" && value.current_step >= 1 && value.current_step <= 5 ? value.current_step : 1,
    status: value.status,
    title: stringValue(value.title),
    description: stringValue(value.description),
    impacts: stringArray(value.impacts),
    locationsCount: nullableNumber(value.locations_count),
    peopleAffected: nullableNumber(value.people_affected),
    currentProcess: stringValue(value.current_process),
    currentTools: stringValue(value.current_tools),
    specialConditions: stringValue(value.special_conditions),
    objectives: stringArray(value.objectives),
    successCriteria: stringValue(value.success_criteria),
    budgetChoice: parseBudget(value.budget_choice),
    deadlineChoice: parseDeadline(value.deadline_choice),
    showCompanyName: value.show_company_name === true,
    reviewedAndConsented: value.reviewed_and_consented === true,
    industrySnapshot: stringValue(value.industry_snapshot),
    currency: stringValue(value.currency) || "PEN",
    createdAt: stringValue(value.created_at),
    updatedAt: stringValue(value.updated_at),
    publishedAt: typeof value.published_at === "string" ? value.published_at : null,
  };
}

function parsePublicProblem(value: unknown): PublicProblem | null {
  const problem = parseCompanyProblem({
    ...(isRecord(value) ? value : {}),
    id: isRecord(value) ? value.id : null,
    status: "open",
    created_at: isRecord(value) ? value.published_at : "",
    updated_at: isRecord(value) ? value.published_at : "",
  });
  if (!problem) return null;
  return {
    id: problem.id,
    title: problem.title,
    description: problem.description,
    impacts: problem.impacts,
    industrySnapshot: problem.industrySnapshot,
    objectives: problem.objectives,
    budgetChoice: problem.budgetChoice,
    currency: problem.currency,
    deadlineChoice: problem.deadlineChoice,
    publishedAt: problem.publishedAt,
    companyName: typeof value === "object" && value !== null && "company_name" in value && typeof value.company_name === "string"
      ? value.company_name : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isProblemStatus(value: unknown): value is ProblemStatus {
  return value === "draft" || value === "open" || value === "paused" || value === "closed";
}

function parseBudget(value: unknown): ProblemDraft["budgetChoice"] {
  return budgetOptions.some((item) => item.value === value) ? value as ProblemDraft["budgetChoice"] : "";
}

function parseDeadline(value: unknown): ProblemDraft["deadlineChoice"] {
  return deadlineOptions.some((item) => item.value === value) ? value as ProblemDraft["deadlineChoice"] : "";
}

function toFriendlyError(message: string): string {
  if (/not authenticated/i.test(message)) return "Inicia sesión para continuar.";
  if (/company account|required company/i.test(message)) return "Esta acción está disponible para cuentas de empresa.";
  if (/not found|does not exist/i.test(message)) return "No encontramos esta publicación o ya no tienes acceso.";
  if (/transition|cannot be edited|closed/i.test(message)) return "El estado actual no permite esa acción.";
  if (/title|description|objective|budget|deadline|consent|agreement/i.test(message)) return "Revisa los campos obligatorios antes de continuar.";
  return "No pudimos completar la acción. Inténtalo de nuevo en unos momentos.";
}
