import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompanyTrustChip } from "./company-trust-chip";

describe("CompanyTrustChip", () => {
  it("no atribuye una verificación cuando el dato no existe", () => {
    expect(renderToStaticMarkup(<CompanyTrustChip verified={null} />)).toBe("");
    expect(renderToStaticMarkup(<CompanyTrustChip verified={undefined} />)).toBe("");
  });
  it("presenta la marca positiva o la explicación interactiva según el dato", () => {
    const verified = renderToStaticMarkup(<CompanyTrustChip verified />);
    const unverified = renderToStaticMarkup(<CompanyTrustChip verified={false} />);
    expect(verified).toContain("Empresa verificada");
    expect(verified).toContain("lucide-shield-check");
    expect(unverified).toContain("Empresa sin verificar");
    expect(unverified).toContain('aria-haspopup="dialog"');
    expect(unverified).toContain('role="dialog"');
    expect(unverified).toContain("MatchWork aún no ha revisado los datos de esta empresa.");
  });
});
