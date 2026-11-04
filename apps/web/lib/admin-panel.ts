export type AdminTab = "companies" | "users" | "problems" | "settings";

export const ADMIN_TABS: { id: AdminTab; label: string; param: string }[] = [
  { id: "companies", label: "Empresas", param: "empresas" },
  { id: "users", label: "Usuarios", param: "usuarios" },
  { id: "problems", label: "Problemas", param: "problemas" },
  { id: "settings", label: "Ajustes", param: "ajustes" },
];

/** Reads `?tab=` from a query string; unknown or missing values fall back to the companies tab. */
export function parseAdminTab(search: string): AdminTab {
  const param = new URLSearchParams(search).get("tab");
  return ADMIN_TABS.find((tab) => tab.param === param)?.id ?? "companies";
}

export function adminTabParam(tab: AdminTab): string {
  return ADMIN_TABS.find((item) => item.id === tab)?.param ?? "empresas";
}

export type CompanyFilter = "pending" | "verified" | "rejected" | "all";
export const COMPANY_FILTERS: { id: CompanyFilter; label: string }[] = [
  { id: "pending", label: "Pendientes" },
  { id: "verified", label: "Verificadas" },
  { id: "rejected", label: "Rechazadas" },
  { id: "all", label: "Todas" },
];

export const REJECTION_PRESETS = [
  "No pudimos validar la identificación fiscal.",
  "Datos incompletos.",
  "El sitio web no coincide.",
] as const;

export const REASON_MIN_LENGTH = 5;
export const REASON_MAX_LENGTH = 200;

/** The reason the company will read: 5 to 200 characters after trimming. */
export function validateReason(value: string): string | null {
  const length = Array.from(value.trim()).length;
  if (length < REASON_MIN_LENGTH) return `Escribe al menos ${REASON_MIN_LENGTH} caracteres.`;
  if (length > REASON_MAX_LENGTH) return `Usa como máximo ${REASON_MAX_LENGTH} caracteres.`;
  return null;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Short relative date in Spanish ("hace 3 h", "ayer", "hace 5 días"); falls back to the calendar date after 30 days. */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "—";
  const elapsed = now.getTime() - time;
  if (elapsed < 0) return "ahora";
  if (elapsed < MINUTE) return "ahora";
  if (elapsed < HOUR) return `hace ${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `hace ${Math.floor(elapsed / HOUR)} h`;
  const days = Math.floor(elapsed / DAY);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(time));
}

export function formatAdminDate(iso: string | null): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "—";
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

/** True when the error comes from a stale version (the company edited the request while the admin was reviewing it). */
export function isStaleVerificationError(error: unknown): boolean {
  return error instanceof Error && /verification request changed|La empresa modificó su solicitud/i.test(error.message);
}

export type ListState<T> = { items: T[]; nextCursor: { at: string; id: string } | null };

/** Appends a page without duplicating rows that appear in both pages (keyset pages can overlap after edits). */
export function appendPage<T>(current: T[], next: T[], key: (item: T) => string): T[] {
  const seen = new Set(current.map(key));
  return [...current, ...next.filter((item) => !seen.has(key(item)))];
}

/** Optimistic removal helper: returns the list without the item and the removed item with its index to restore on failure. */
export function removeWithRestore<T>(items: T[], key: (item: T) => string, id: string): { items: T[]; restore: (list: T[]) => T[] } {
  const index = items.findIndex((item) => key(item) === id);
  if (index < 0) return { items, restore: (list) => list };
  const removed = items[index];
  return {
    items: items.filter((_, position) => position !== index),
    restore: (list) => (list.some((item) => key(item) === id) ? list : [...list.slice(0, index), removed, ...list.slice(index)]),
  };
}
