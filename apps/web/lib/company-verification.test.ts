import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isFreeEmailDomain, isValidPeruvianRuc, isValidVerificationUrl, normalizeVerificationUrl, transitionCompanyVerification, validateCompanyVerification,
  type CompanyVerificationAction, type CompanyVerificationStatus } from "@/lib/company-verification";

const sql = readFileSync(new URL("../../../supabase/tests/database/company_verification.test.sql", import.meta.url), "utf8");
const section = (name: string) => {
  const value = sql.split(`-- BEGIN ${name}`)[1]?.split(`-- END ${name}`)[0];
  if (!value) throw new Error(`No se encontró la matriz ${name}.`);
  return value;
};
const transitions = [...section("VERIFICATION TRANSITION CASES").matchAll(/\(\s*\d+\s*,\s*'(\w+)'\s*,\s*'(\w+)'\s*,\s*(null|'\w+')\s*\)/g)]
  .map((m) => ({ status: m[1] as CompanyVerificationStatus, action: m[2] as CompanyVerificationAction, expected: m[3] === "null" ? null : m[3].slice(1, -1) }));
const validators = [...section("VERIFICATION VALIDATOR CASES").matchAll(/\(\s*\d+\s*,\s*'(ruc|email|url|linkedin)'\s*,\s*'([^']*)'\s*,\s*(true|false)\s*\)/g)]
  .map((m) => ({ kind: m[1], value: m[2], expected: m[3] === "true" }));

describe("verification rules shared with pgTAP", () => {
  it("covers every state and action", () => {
    expect(transitions).toHaveLength(16);
    expect(new Set(transitions.map((v) => `${v.status}:${v.action}`)).size).toBe(16);
  });
  it.each(transitions)("maps $status + $action", ({ status, action, expected }) => {
    expect(transitionCompanyVerification(status, action)).toBe(expected);
  });
  it.each(validators)("validates $kind: $value", ({ kind, value, expected }) => {
    expect(kind === "ruc" ? isValidPeruvianRuc(value) : kind === "email" ? isFreeEmailDomain(value) : isValidVerificationUrl(value, kind === "linkedin")).toBe(expected);
  });
});

describe("verification form validation", () => {
  it.each([
    ["https://example.com", false, true],
    [" HTTPS://example.com/contact ", false, true],
    ["http://example.com", false, false],
    ["https://user:pass@example.com", false, false],
    ["javascript:evil", false, false],
    ["https://www.linkedin.com/company/acme", true, true],
    ["https://linkedin.com.evil.test/company/acme", true, false],
    ["https://example.com/" + "x".repeat(2049), false, false],
  ])("validates URL %s", (url, linkedinOnly, expected) => {
    expect(isValidVerificationUrl(url, linkedinOnly)).toBe(expected);
  });
  it("normalizes URL scheme and host but preserves the case of the path", () => {
    expect(normalizeVerificationUrl(" HTTPS://LINKEDIN.COM/company/Empresa ")).toBe("https://linkedin.com/company/Empresa");
  });
  it("requires a legal name, a valid tax ID and a corporate contact", () => {
    expect(validateCompanyVerification({ legalName: "", taxId: "123", corporateEmail: "PERSON@GMAIL.COM" }, "PE"))
      .toMatchObject({ legalName: expect.any(String), taxId: expect.any(String), corporateEmail: expect.any(String) });
    expect(validateCompanyVerification({ legalName: "Acme SAC", taxId: "12345678901", corporateEmail: " contacto@acme.example " }, "PE")).toEqual({});
    expect(validateCompanyVerification({ legalName: "Acme SL", taxId: "ab-123", websiteUrl: "https://acme.example" }, "ES")).toEqual({});
    expect(validateCompanyVerification({ legalName: "Acme", taxId: "12345678901" }, "PE")).toHaveProperty("contact");
  });
});
