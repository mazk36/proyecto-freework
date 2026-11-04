import { describe, expect, it } from "vitest";
import {
  createEmptyProposalDraft,
  formatProposalPrice,
  toRpcPayload,
  validateProposalForSubmit,
  type ProposalDraftInput,
} from "@/lib/proposal-domain";

function completeDraft(overrides: Partial<ProposalDraftInput> = {}): ProposalDraftInput {
  return {
    ...createEmptyProposalDraft(),
    diagnosis: "Entiendo el problema",
    solution: "Una solución",
    deliverables: "Un informe",
    timeline: "Dos semanas",
    price: 0,
    ...overrides,
  };
}

describe("proposal domain", () => {
  it("accepts a complete proposal and zero price, with PEN by default", () => {
    expect(validateProposalForSubmit(completeDraft())).toEqual([]);
    expect(createEmptyProposalDraft().currency).toBe("PEN");
  });

  it.each([
    ["diagnosis", "Cuéntale a la empresa cómo entiendes el problema."],
    ["solution", "Describe la solución que propones."],
    ["deliverables", "Describe los entregables de tu propuesta."],
    ["timeline", "Indica el plazo de tu propuesta."],
  ] as const)("requires %s", (field, message) => {
    expect(validateProposalForSubmit(completeDraft({ [field]: "  " }))).toEqual([message]);
  });

  it.each([
    ["diagnosis", 5000, "El diagnóstico no puede superar los 5,000 caracteres."],
    ["solution", 5000, "La solución no puede superar los 5,000 caracteres."],
    ["deliverables", 5000, "Los entregables no pueden superar los 5,000 caracteres."],
    ["timeline", 300, "El plazo no puede superar los 300 caracteres."],
    ["recurringCosts", 2000, "Los costos recurrentes no pueden superar los 2,000 caracteres."],
    ["maintenanceWarranty", 2000, "El soporte posterior no puede superar los 2,000 caracteres."],
    ["relatedExperience", 2000, "La experiencia relacionada no puede superar los 2,000 caracteres."],
  ] as const)("accepts the character limit for %s and rejects one extra character", (field, limit, message) => {
    expect(validateProposalForSubmit(completeDraft({ [field]: "😀".repeat(limit) }))).toEqual([]);
    expect(validateProposalForSubmit(completeDraft({ [field]: "😀".repeat(limit) + "x" }))).toEqual([message]);
  });

  it("requires a finite price from zero to the maximum, with at most two decimals", () => {
    expect(validateProposalForSubmit(completeDraft({ price: null }))).toContain("Indica el precio de tu propuesta.");
    for (const price of [0, 0.29, 125.5, 9999999999.99]) {
      expect(validateProposalForSubmit(completeDraft({ price }))).toEqual([]);
    }
    for (const price of [-1, NaN, Infinity, -Infinity, 0.004, 1.001, 10000000000]) {
      expect(validateProposalForSubmit(completeDraft({ price })))
        .toContain("Ingresa un precio mayor o igual a cero, menor a 10,000 millones y con máximo dos decimales.");
    }
  });

  it("requires a supported currency", () => {
    expect(validateProposalForSubmit(completeDraft({ currency: "EUR" as ProposalDraftInput["currency"] })))
      .toContain("Selecciona una moneda válida: PEN o USD.");
  });

  it("formats PEN and USD without converting, showing cents only when present", () => {
    expect(formatProposalPrice(1234, "PEN")).toBe("S/ 1,234");
    expect(formatProposalPrice(1234.5, "PEN")).toBe("S/ 1,234.50");
    expect(formatProposalPrice(1234, "USD")).toBe("US$ 1,234");
    expect(formatProposalPrice(1234.05, "USD")).toBe("US$ 1,234.05");
  });

  it("builds only accepted RPC keys and omits a null id", () => {
    const input = { ...completeDraft({ diagnosis: "  Diagnóstico  ", price: null }), extra: "no enviar" };
    expect(toRpcPayload(input)).toEqual({
      diagnosis: "Diagnóstico", solution: "Una solución", deliverables: "Un informe", timeline: "Dos semanas",
      price: null, currency: "PEN", recurring_costs: "", maintenance_warranty: "", related_experience: "",
    });
    expect(toRpcPayload(completeDraft({ id: "proposal-id", price: 42.5, currency: "USD" })))
      .toMatchObject({ id: "proposal-id", price: 42.5, currency: "USD" });
  });
});
