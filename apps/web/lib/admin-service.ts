import { callRpc, ProblemServiceError } from "@/lib/problem-service";
import type { AdminProblemRow, AdminSettingRow, AdminSummaryRow, AdminUserRow, VerificationRequestRow } from "@/types/database";

export type Cursor = { at: string; id: string };
export type Page<T> = { items: T[]; nextCursor: Cursor | null };
type VerificationFilter = "pending" | "verified" | "rejected" | "all";
type UserRoleFilter = "all" | "company" | "freelancer";
type UserSuspensionFilter = "all" | "active" | "suspended";
type ProblemFilter = "all" | "draft" | "open" | "paused" | "closed" | "suspended";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string";
const nullable = (v: unknown): v is string | null => v === null || str(v);
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const pageSize = (n: number | undefined): number => Number.isFinite(n) ? Math.min(100, Math.max(1, Math.trunc(n!))) : 25;

function isVerification(v: unknown): v is VerificationRequestRow {
  return isRecord(v) && str(v.company_user_id) && str(v.company_name) && str(v.legal_name) && str(v.country_code) && str(v.tax_id) &&
    nullable(v.website_url) && nullable(v.corporate_email) && nullable(v.linkedin_url) &&
    (v.status === "pending" || v.status === "verified" || v.status === "rejected") && nullable(v.rejection_reason) &&
    str(v.submitted_at) && nullable(v.verified_at) && str(v.updated_at);
}
function isUser(v: unknown): v is AdminUserRow {
  return isRecord(v) && str(v.user_id) && str(v.full_name) && (v.role === "company" || v.role === "freelancer") &&
    nullable(v.email) && str(v.created_at) && nullable(v.suspended_at) && nullable(v.suspension_reason);
}
function isProblem(v: unknown): v is AdminProblemRow {
  return isRecord(v) && str(v.problem_id) && str(v.title) && str(v.company_user_id) && nullable(v.company_name) &&
    typeof v.company_verified === "boolean" && str(v.budget_choice) && str(v.currency) && nullable(v.published_at) &&
    str(v.sort_at) && count(v.proposal_count) && (v.status === "draft" || v.status === "open" || v.status === "paused" || v.status === "closed") &&
    nullable(v.suspended_at) && nullable(v.suspension_reason);
}
function checkedRows<T>(value: unknown, guard: (row: unknown) => row is T): T[] {
  if (!Array.isArray(value) || !value.every(guard)) throw new ProblemServiceError("No pudimos cargar los datos de administración.");
  return value;
}
function page<T>(items: T[], limit: number, cursor: (row: T) => Cursor): Page<T> {
  return { items, nextCursor: items.length === limit ? cursor(items[items.length - 1]) : null };
}

export async function isAdmin(): Promise<boolean> {
  const data: unknown = await callRpc("is_admin", {});
  if (typeof data !== "boolean") throw new ProblemServiceError("No pudimos comprobar tu acceso de administración.");
  return data;
}
export async function listVerificationRequests(options: { status?: VerificationFilter; cursor?: Cursor | null; limit?: number } = {}): Promise<Page<VerificationRequestRow>> {
  const limit = pageSize(options.limit);
  const rows = checkedRows(await callRpc("admin_list_verification_requests", {
    p_status: options.status ?? "pending", p_after_submitted_at: options.cursor?.at ?? null,
    p_after_company_user_id: options.cursor?.id ?? null, p_limit: limit,
  }), isVerification);
  return page(rows, limit, (row) => ({ at: row.submitted_at, id: row.company_user_id }));
}
export async function verify(companyUserId: string): Promise<void> {
  await callRpc("admin_verify_company", { p_company_user_id: companyUserId });
}
export async function reject(companyUserId: string, reason: string): Promise<void> {
  await callRpc("admin_reject_company", { p_company_user_id: companyUserId, p_reason: reason.trim() });
}
export async function undoVerification(companyUserId: string): Promise<void> {
  await callRpc("admin_undo_company_verification", { p_company_user_id: companyUserId });
}
export async function listUsers(options: { search?: string; role?: UserRoleFilter; suspension?: UserSuspensionFilter; cursor?: Cursor | null; limit?: number } = {}): Promise<Page<AdminUserRow>> {
  const limit = pageSize(options.limit);
  const rows = checkedRows(await callRpc("admin_list_users", {
    p_search: options.search?.trim() ?? "", p_role: options.role ?? "all", p_suspension: options.suspension ?? "all",
    p_before_created_at: options.cursor?.at ?? null, p_before_id: options.cursor?.id ?? null, p_limit: limit,
  }), isUser);
  return page(rows, limit, (row) => ({ at: row.created_at, id: row.user_id }));
}
export async function setUserSuspended(userId: string, suspended: boolean, reason: string): Promise<void> {
  await callRpc("admin_set_user_suspended", { p_user_id: userId, p_suspended: suspended, p_reason: reason.trim() });
}
export async function listProblems(options: { search?: string; status?: ProblemFilter; cursor?: Cursor | null; limit?: number } = {}): Promise<Page<AdminProblemRow>> {
  const limit = pageSize(options.limit);
  const rows = checkedRows(await callRpc("admin_list_problems", {
    p_search: options.search?.trim() ?? "", p_status: options.status ?? "all",
    p_before_sort_at: options.cursor?.at ?? null, p_before_id: options.cursor?.id ?? null, p_limit: limit,
  }), isProblem);
  return page(rows, limit, (row) => ({ at: row.sort_at, id: row.problem_id }));
}
export async function setProblemSuspended(problemId: string, suspended: boolean, reason: string): Promise<void> {
  await callRpc("admin_set_problem_suspended", { p_problem_id: problemId, p_suspended: suspended, p_reason: reason.trim() });
}
export async function getAdminSummary(): Promise<AdminSummaryRow> {
  const data: unknown = await callRpc("admin_get_summary", {});
  if (!Array.isArray(data) || data.length !== 1 || !isRecord(data[0]) ||
    !count(data[0].pending_verifications) || !count(data[0].verified_companies) ||
    !count(data[0].open_problems) || !count(data[0].active_freelancers)) {
    throw new ProblemServiceError("No pudimos cargar el resumen de administración.");
  }
  return data[0] as AdminSummaryRow;
}
export async function getSettings(): Promise<AdminSettingRow[]> {
  return checkedRows(await callRpc("admin_get_settings", {}), (v): v is AdminSettingRow =>
    isRecord(v) && v.key === "require_company_verification_to_publish" && typeof v.value === "boolean" &&
    str(v.updated_at) && nullable(v.updated_by));
}
export async function setSetting(key: "require_company_verification_to_publish", value: boolean): Promise<void> {
  await callRpc("admin_set_setting", { p_key: key, p_value: value });
}
export const adminService = { isAdmin, listVerificationRequests, verify, reject, undoVerification, listUsers,
  setUserSuspended, listProblems, setProblemSuspended, getAdminSummary, getSettings, setSetting };
