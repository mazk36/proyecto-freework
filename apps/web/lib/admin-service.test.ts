import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminSummary, getSettings, isAdmin, listProblems, listUsers, listVerificationRequests, reject,
  setProblemSuspended, setSetting, setUserSuspended, undoVerification, verify } from "@/lib/admin-service";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseClient: () => ({ rpc: mocks.rpc }), loadSupabaseClient: async () => ({ rpc: mocks.rpc }) }));
const verification = { company_user_id: "company", company_name: "Empresa", legal_name: "Empresa SAC", country_code: "PE",
  tax_id: "12345678901", website_url: "https://example.com", corporate_email: null, linkedin_url: null, status: "pending",
  rejection_reason: null, submitted_at: "2026-11-04T00:00:00.000001Z", verified_at: null, updated_at: "2026-11-04T00:00:00Z" };
const user = { user_id: "user", full_name: "Nombre", role: "freelancer", email: "user@example.com", created_at: "2026-11-01T00:00:00Z", suspended_at: null, suspension_reason: null };
const problem = { problem_id: "problem", title: "Problema", company_user_id: "company", company_name: "Empresa", company_verified: true,
  budget_choice: "unknown", currency: "PEN", published_at: null, sort_at: "2026-11-01T00:00:00Z", proposal_count: 0,
  status: "draft", suspended_at: null, suspension_reason: null };
beforeEach(() => vi.resetAllMocks());

describe("admin service", () => {
  it("keeps keyset cursor precision and forwards filters as parameters", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [verification], error: null })
      .mockResolvedValueOnce({ data: [user], error: null }).mockResolvedValueOnce({ data: [problem], error: null });
    await expect(listVerificationRequests({ limit: 1 })).resolves.toEqual({ items: [verification], nextCursor: { at: verification.submitted_at, id: "company" } });
    await expect(listUsers({ search: " % ", role: "freelancer", cursor: { at: user.created_at, id: user.user_id }, limit: 1 }))
      .resolves.toEqual({ items: [user], nextCursor: { at: user.created_at, id: "user" } });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "admin_list_users", { p_search: "%", p_role: "freelancer", p_suspension: "all",
      p_before_created_at: user.created_at, p_before_id: user.user_id, p_limit: 1 });
    await expect(listProblems({ limit: 1 })).resolves.toEqual({ items: [problem], nextCursor: { at: problem.sort_at, id: "problem" } });
  });
  it("calls each authorized mutation with a trimmed reason", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await verify("company", "2026-11-04T10:00:00.000Z"); await reject("company", "2026-11-04T10:00:00.000Z", " Datos incompletos "); await undoVerification("company");
    await setUserSuspended("user", true, " Motivo "); await setProblemSuspended("problem", false, " Resuelto ");
    await setSetting("require_company_verification_to_publish", true);
    expect(mocks.rpc.mock.calls).toEqual([
      ["admin_verify_company", { p_company_user_id: "company", p_expected_updated_at: "2026-11-04T10:00:00.000Z" }],
      ["admin_reject_company", { p_company_user_id: "company", p_expected_updated_at: "2026-11-04T10:00:00.000Z", p_reason: "Datos incompletos" }],
      ["admin_undo_company_verification", { p_company_user_id: "company" }],
      ["admin_set_user_suspended", { p_user_id: "user", p_suspended: true, p_reason: "Motivo" }],
      ["admin_set_problem_suspended", { p_problem_id: "problem", p_suspended: false, p_reason: "Resuelto" }],
      ["admin_set_setting", { p_key: "require_company_verification_to_publish", p_value: true }],
    ]);
  });
  it("validates the summary and settings returned by the server", async () => {
    const summary = { pending_verifications: 1, verified_companies: 2, open_problems: 3, active_freelancers: 4 };
    const setting = { key: "require_company_verification_to_publish", value: false, updated_at: "2026-11-04", updated_by: null };
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [summary], error: null })
      .mockResolvedValueOnce({ data: [setting], error: null }).mockResolvedValueOnce({ data: [{ ...user, role: "admin" }], error: null });
    await expect(isAdmin()).resolves.toBe(true); await expect(getAdminSummary()).resolves.toEqual(summary);
    await expect(getSettings()).resolves.toEqual([setting]); await expect(listUsers()).rejects.toThrow("No pudimos cargar");
  });
  it("propagates an understandable access error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "not an admin" } });
    await expect(listUsers()).rejects.toThrow("No tienes acceso");
  });
});
