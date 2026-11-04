export type CompanyVerificationStatus = "not_requested" | "pending" | "verified" | "rejected";
export type CompanyVerificationAction = "submit" | "verify" | "reject" | "undo";

// Keep in sync with public.is_free_email_domain in the migration.
export const FREE_EMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.es", "outlook.com", "outlook.es",
  "live.com", "live.es", "msn.com", "yahoo.com", "yahoo.es", "yahoo.com.pe",
  "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "gmx.com", "gmx.net", "aol.com",
] as const;

export type CompanyVerificationInput = {
  legalName: string;
  taxId: string;
  websiteUrl?: string | null;
  corporateEmail?: string | null;
  linkedinUrl?: string | null;
};

export type CompanyVerification = {
  status: CompanyVerificationStatus;
  legalName: string | null;
  countryCode: string | null;
  taxId: string | null;
  websiteUrl: string | null;
  corporateEmail: string | null;
  linkedinUrl: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
};

export function isValidPeruvianRuc(value: string): boolean {
  return /^[0-9]{11}$/.test(value.trim());
}

export function isFreeEmailDomain(value: string): boolean {
  const domain = value.trim().toLowerCase().split("@")[1] ?? "";
  return (FREE_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

export function isValidVerificationUrl(value: string, linkedinOnly = false): boolean {
  const url = value.trim();
  if (Array.from(url).length > 2048 || !/^https:\/\/[^/?#\s\\]+([/?#][^\s\\]*)?$/i.test(url)) return false;
  const authority = url.slice(8).split(/[/?#]/, 1)[0].toLowerCase();
  if (authority.includes("@") || authority.includes("%")) return false;
  const port = authority.match(/:([0-9]{1,5})$/)?.[1];
  if (port !== undefined && Number(port) > 65535) return false;
  let host: string;
  if (authority.startsWith("[")) {
    if (!/^\[[0-9a-f:.]+\](:[0-9]{1,5})?$/.test(authority)) return false;
    try { new URL(`https://${authority}/`); } catch { return false; }
    host = authority;
  } else {
    if (!/^[^:]+(:[0-9]{1,5})?$/.test(authority)) return false;
    host = authority.split(":", 1)[0];
    if (!/^([\p{L}\p{N}]([\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)*[\p{L}\p{N}]([\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u.test(host)) return false;
  }
  return !linkedinOnly || /(^|\.)linkedin\.com$/.test(host);
}

export function normalizeVerificationUrl(value: string): string {
  const url = value.trim();
  if (!/^https:\/\//i.test(url)) return url;
  const rest = url.slice(8);
  const authority = rest.split(/[/?#]/, 1)[0];
  return `https://${authority.toLowerCase()}${rest.slice(authority.length)}`;
}

export function validateCompanyVerification(input: CompanyVerificationInput, countryCode: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const legalName = input.legalName.trim();
  const taxId = input.taxId.trim().toUpperCase();
  const website = input.websiteUrl?.trim() ?? "";
  const email = input.corporateEmail?.trim().toLowerCase() ?? "";
  const linkedin = input.linkedinUrl?.trim() ?? "";
  if (!legalName) errors.legalName = "Ingresa la razón social.";
  if (countryCode.toUpperCase() === "PE" ? !isValidPeruvianRuc(taxId) : Array.from(taxId).length < 4 || Array.from(taxId).length > 30) {
    errors.taxId = countryCode.toUpperCase() === "PE" ? "Ingresa un RUC de 11 dígitos." : "Ingresa una identificación fiscal de 4 a 30 caracteres.";
  }
  if (!website && !email) errors.contact = "Ingresa un sitio web o correo corporativo.";
  if (website && !isValidVerificationUrl(website)) errors.websiteUrl = "Ingresa un enlace https válido.";
  if (email && (Array.from(email).length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(email) || isFreeEmailDomain(email))) {
    errors.corporateEmail = "Ingresa un correo corporativo válido.";
  }
  if (linkedin && !isValidVerificationUrl(linkedin, true)) errors.linkedinUrl = "Ingresa un enlace https de LinkedIn.";
  return errors;
}

// An invalid transition returns null. Undo is an admin operation subject to its server-side time window.
export function transitionCompanyVerification(
  status: CompanyVerificationStatus, action: CompanyVerificationAction,
): CompanyVerificationStatus | null {
  if (action === "submit") return status === "verified" ? null : "pending";
  if (action === "verify") return status === "pending" || status === "verified" ? "verified" : null;
  if (action === "reject") return status === "pending" || status === "rejected" ? "rejected" : null;
  if (action === "undo") return status === "verified" ? "pending" : null;
  return null;
}
