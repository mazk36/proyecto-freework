import { callRpc, ProblemServiceError } from "@/lib/problem-service";
import { normalizeVerificationUrl, type CompanyVerification, type CompanyVerificationInput, type CompanyVerificationStatus } from "@/lib/company-verification";

const nullableString = (value: unknown): value is string | null => value === null || typeof value === "string";

function parseVerification(value: unknown): CompanyVerification {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProblemServiceError("No pudimos cargar la verificación de tu empresa.");
  }
  const row = value as Record<string, unknown>;
  const status = row.status;
  const fields = ["legal_name", "country_code", "tax_id", "website_url", "corporate_email", "linkedin_url", "rejection_reason", "submitted_at", "verified_at", "updated_at"];
  if ((status !== "not_requested" && status !== "pending" && status !== "verified" && status !== "rejected") ||
    fields.some((key) => row[key] !== undefined && !nullableString(row[key]))) {
    throw new ProblemServiceError("No pudimos cargar la verificación de tu empresa.");
  }
  if (status !== "not_requested" && (
    typeof row.legal_name !== "string" || typeof row.country_code !== "string" || typeof row.tax_id !== "string" ||
    typeof row.submitted_at !== "string" || typeof row.updated_at !== "string" ||
    (typeof row.website_url !== "string" && typeof row.corporate_email !== "string") ||
    (status === "verified" && typeof row.verified_at !== "string") ||
    (status === "rejected" && typeof row.rejection_reason !== "string")
  )) {
    throw new ProblemServiceError("No pudimos cargar la verificación de tu empresa.");
  }
  const field = (key: string): string | null => typeof row[key] === "string" ? row[key] : null;
  return {
    status: status as CompanyVerificationStatus, legalName: field("legal_name"), countryCode: field("country_code"),
    taxId: field("tax_id"), websiteUrl: field("website_url"), corporateEmail: field("corporate_email"),
    linkedinUrl: field("linkedin_url"), rejectionReason: field("rejection_reason"),
    submittedAt: field("submitted_at"), verifiedAt: field("verified_at"), updatedAt: field("updated_at"),
  };
}

export async function getMine(): Promise<CompanyVerification> {
  return parseVerification(await callRpc("get_my_company_verification", {}));
}

export async function submit(input: CompanyVerificationInput): Promise<CompanyVerification> {
  const data = await callRpc("submit_company_verification", { p_data: {
    legal_name: input.legalName.trim(), tax_id: input.taxId.trim().toUpperCase(),
    website_url: input.websiteUrl ? normalizeVerificationUrl(input.websiteUrl) || null : null,
    corporate_email: input.corporateEmail?.trim().toLowerCase() || null,
    linkedin_url: input.linkedinUrl ? normalizeVerificationUrl(input.linkedinUrl) || null : null,
  } });
  return parseVerification(data);
}

export async function getMyAccountStatus(): Promise<{ suspended: boolean; reason: string | null }> {
  const data: unknown = await callRpc("get_my_account_status", {});
  if (!Array.isArray(data) || data.length !== 1 || typeof data[0] !== "object" || data[0] === null ||
    typeof data[0].suspended !== "boolean" || !nullableString(data[0].reason)) {
    throw new ProblemServiceError("No pudimos consultar el estado de tu cuenta.");
  }
  return { suspended: data[0].suspended, reason: data[0].reason };
}

export const companyVerificationService = { submit, getMine, getMyAccountStatus };
