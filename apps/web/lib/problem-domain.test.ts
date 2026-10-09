import { describe, expect, it } from "vitest";
import {
  createEmptyProblemDraft,
  isCompanyProfileComplete,
  validateProblemForPublishing,
  validateProblemStep,
  type ProblemDraft,
} from "@/lib/problem-domain";

function completeDraft(overrides: Partial<ProblemDraft> = {}): ProblemDraft {
  return {
    ...createEmptyProblemDraft(),
    title: "Reducir las demoras de atención",
    description: "Actualmente registramos las solicitudes de los clientes en hojas distintas y se pierden varias horas cada semana.",
    objectives: ["save_time"],
    budgetChoice: "unknown",
    deadlineChoice: "flexible",
    reviewedAndConsented: true,
    ...overrides,
  };
}

describe("company problem publication rules", () => {
  it("accepts an unknown budget when the other required answers are present", () => {
    expect(validateProblemForPublishing(completeDraft())).toEqual([]);
  });

  it("requires a title and detailed description within their limits", () => {
    expect(validateProblemStep(1, completeDraft({ title: "corto", description: "poco" }))).toHaveLength(2);
    expect(validateProblemStep(1, completeDraft({ title: "x".repeat(121) }))).toContain(
      "Escribe un título de entre 12 y 120 caracteres.",
    );
  });

  it("requires at least one valid objective and consent before publishing", () => {
    expect(validateProblemStep(3, completeDraft({ objectives: [] }))).toHaveLength(1);
    expect(validateProblemForPublishing(completeDraft({ reviewedAndConsented: false }))).toContain(
      "Confirma que revisaste la información y puedes compartirla.",
    );
  });

  it("requires business profile fields before company publishing", () => {
    expect(isCompanyProfileComplete({ companyName: "Acme", industry: "Comercio", countryCode: "PE" })).toBe(true);
    expect(isCompanyProfileComplete({ companyName: "", industry: "Comercio", countryCode: "PE" })).toBe(false);
  });
});
