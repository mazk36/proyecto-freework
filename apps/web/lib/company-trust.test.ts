import { describe, expect, it } from "vitest";
import { companyTrustVariant } from "./company-trust";

describe("companyTrustVariant", () => {
  it("distingue empresas verificadas, no verificadas y datos ausentes", () => {
    expect(companyTrustVariant(true)).toBe("verified");
    expect(companyTrustVariant(false)).toBe("unverified");
    expect(companyTrustVariant(null)).toBeNull();
    expect(companyTrustVariant(undefined)).toBeNull();
  });
});
