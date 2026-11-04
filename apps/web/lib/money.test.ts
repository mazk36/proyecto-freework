import { describe, expect, it } from "vitest";
import { budgetRangeLabel, formatAmount, formatMoney } from "@/lib/money";

describe("dinero es-PE", () => {
  it("da formato con coma de miles y céntimos solo si hay", () => {
    expect(formatMoney(1800, "PEN")).toBe("S/ 1,800");
    expect(formatMoney(3200, "USD")).toBe("US$ 3,200");
    expect(formatMoney(1250.5, "PEN")).toBe("S/ 1,250.50");
    expect(formatAmount(10000)).toBe("10,000");
  });
  it("usa el código si no conoce la moneda", () => {
    expect(formatMoney(5, "CHF")).toBe("CHF 5");
  });
  it("etiqueta los rangos de presupuesto", () => {
    expect(budgetRangeLabel("under_1000")).toBe("Menos de S/ 1,000");
    expect(budgetRangeLabel("1000_3000")).toBe("S/ 1,000 – S/ 3,000");
    expect(budgetRangeLabel("over_10000", "USD")).toBe("Más de US$ 10,000");
    expect(budgetRangeLabel("unknown")).toBe("Todavía no lo sé");
    expect(budgetRangeLabel("otro")).toBe("Sin definir");
  });
});
