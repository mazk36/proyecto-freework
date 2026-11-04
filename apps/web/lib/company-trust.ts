export type CompanyTrustVariant = "verified" | "unverified" | null;

export function companyTrustVariant(value: boolean | null | undefined): CompanyTrustVariant {
  return value === true ? "verified" : value === false ? "unverified" : null;
}
