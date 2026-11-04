import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMine, getMyAccountStatus, submit } from "@/lib/company-verification-service";
import { publishBusinessProblem, toFriendlyError } from "@/lib/problem-service";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseClient: () => ({ rpc: mocks.rpc }), loadSupabaseClient: async () => ({ rpc: mocks.rpc }) }));

const row = { status: "pending", legal_name: "Acme", country_code: "PE", tax_id: "12345678901", website_url: null,
  corporate_email: "info@acme.example", linkedin_url: null, rejection_reason: null, submitted_at: "2026-11-04T00:00:00Z", verified_at: null, updated_at: "2026-11-04T00:00:00Z" };
beforeEach(() => vi.resetAllMocks());

describe("company verification service", () => {
  it("maps the private request and submits normalized fields", async () => {
    mocks.rpc.mockResolvedValue({ data: row, error: null });
    await expect(getMine()).resolves.toMatchObject({ status: "pending", legalName: "Acme", taxId: "12345678901" });
    await submit({ legalName: " Acme ", taxId: " 12345678901 ", corporateEmail: " INFO@ACME.EXAMPLE " });
    expect(mocks.rpc).toHaveBeenLastCalledWith("submit_company_verification", { p_data: {
      legal_name: "Acme", tax_id: "12345678901", website_url: null, corporate_email: "info@acme.example", linkedin_url: null,
    } });
  });
  it("reads suspension and rejects malformed server responses", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ suspended: true, reason: "En revisión" }], error: null })
      .mockResolvedValueOnce({ data: { ...row, status: "unknown" }, error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: { ...row, legal_name: null }, error: null });
    await expect(getMyAccountStatus()).resolves.toEqual({ suspended: true, reason: "En revisión" });
    await expect(getMine()).rejects.toThrow("No pudimos cargar");
    await expect(getMyAccountStatus()).rejects.toThrow("No pudimos consultar");
    await expect(getMine()).rejects.toThrow("No pudimos cargar");
  });
  it("retains a stable error code so the publishing UI can open verification", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "company verification required to publish" } });
    await expect(publishBusinessProblem("problem")).rejects.toMatchObject({
      code: "company_verification_required", message: "Para publicar necesitas verificar tu empresa",
    });
  });
  it.each([
    ["company verification required to publish", "Para publicar necesitas verificar tu empresa"],
    ["account suspended", "Tu cuenta está suspendida"],
    ["problem suspended", "Este problema está suspendido"],
    ["not an admin", "No tienes acceso"],
    ["rate limit exceeded", "Hiciste muchas acciones seguidas"],
  ])("translates %s", (message, expected) => expect(toFriendlyError(message)).toContain(expected));
});
