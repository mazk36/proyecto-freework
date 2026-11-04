/** Único punto de formato de dinero (es-PE): «S/ 1,800», «US$ 3,200», «S/ 1,250.50». */
const SYMBOLS: Record<string, string> = { ARS: "AR$", BRL: "R$", CLP: "$", COP: "COL$", EUR: "€", MXN: "MX$", PEN: "S/", USD: "US$" };

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? currency;
}

/** Número con separador de miles; los céntimos solo si los hay. */
export function formatAmount(amount: number): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat("es-PE", { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: hasCents ? 2 : 0 }).format(amount);
}

export function formatMoney(amount: number, currency: string): string {
  return `${currencySymbol(currency)} ${formatAmount(amount)}`;
}

const BUDGET_RANGES: Record<string, [number, number | null]> = {
  under_1000: [0, 1000], "1000_3000": [1000, 3000], "3000_5000": [3000, 5000], "5000_10000": [5000, 10000], over_10000: [10000, null],
};

/** Etiqueta del rango de presupuesto elegido al publicar un problema. */
export function budgetRangeLabel(choice: string, currency = "PEN"): string {
  if (choice === "unknown") return "Todavía no lo sé";
  const range = BUDGET_RANGES[choice];
  if (!range) return "Sin definir";
  const [from, to] = range;
  if (to === null) return `Más de ${formatMoney(from, currency)}`;
  if (from === 0) return `Menos de ${formatMoney(to, currency)}`;
  return `${formatMoney(from, currency)} – ${formatMoney(to, currency)}`;
}
