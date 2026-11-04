export type PublicCounters = {
  open_problems: number;
  companies_published: number;
  freelancers_active: number;
  proposals_submitted: number;
};

export const COUNTER_DURATION_MS = 1_200;

const formatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

export function formatPublicCounter(value: number): string {
  return value === 0 ? "Sé de los primeros" : formatCounterNumber(value);
}

export function formatCounterNumber(value: number): string { return formatter.format(value); }

// Solve x for cubic-bezier(0.22, 1, 0.36, 1), then evaluate y.
export function interpolateCounter(target: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= COUNTER_DURATION_MS) return target;
  const progress = elapsedMs / COUNTER_DURATION_MS;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 20; i += 1) {
    const t = (low + high) / 2;
    const x = 3 * (1 - t) ** 2 * t * 0.22 + 3 * (1 - t) * t ** 2 * 0.36 + t ** 3;
    if (x < progress) low = t;
    else high = t;
  }
  const t = (low + high) / 2;
  const eased = 1 - (1 - t) ** 3;
  return Math.round(target * eased);
}

export function parsePublicCounters(value: unknown): PublicCounters | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = ["open_problems", "companies_published", "freelancers_active", "proposals_submitted"] as const;
  if (!keys.every((key) => typeof record[key] === "number" && Number.isSafeInteger(record[key]) && (record[key] as number) >= 0)) return null;
  return {
    open_problems: record.open_problems as number,
    companies_published: record.companies_published as number,
    freelancers_active: record.freelancers_active as number,
    proposals_submitted: record.proposals_submitted as number,
  };
}
