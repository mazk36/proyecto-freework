import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountStatusContext, SuspensionNotice } from "@/components/app/account-status";
import { CompanyVerificationCardView, CompanyVerificationForm } from "@/components/app/company-verification-card";
import type { CompanyVerification } from "@/lib/company-verification";

const empty: CompanyVerification = {
  status: "not_requested", legalName: null, countryCode: null, taxId: null, websiteUrl: null,
  corporateEmail: null, linkedinUrl: null, rejectionReason: null, submittedAt: null, verifiedAt: null, updatedAt: null,
};
const submitted: CompanyVerification = { ...empty, status: "pending", legalName: "Empresa de prueba", countryCode: "PE", taxId: "20123456789", corporateEmail: "hola@empresa.example", submittedAt: "2026-11-04T12:00:00Z", updatedAt: "2026-11-04T12:00:00Z" };
const noSubmit = async () => {};

describe("tarjeta de verificación", () => {
  it("muestra el texto y la acción correspondientes a cada estado", () => {
    const initial = renderToStaticMarkup(<CompanyVerificationCardView countryCode="PE" onSubmit={noSubmit} verification={empty} />);
    const pending = renderToStaticMarkup(<CompanyVerificationCardView countryCode="PE" onSubmit={noSubmit} verification={submitted} />);
    const rejected = renderToStaticMarkup(<CompanyVerificationCardView countryCode="PE" onSubmit={noSubmit} verification={{ ...submitted, status: "rejected", rejectionReason: "Datos incompletos" }} />);
    const verified = renderToStaticMarkup(<CompanyVerificationCardView countryCode="PE" onSubmit={noSubmit} verification={{ ...submitted, status: "verified", verifiedAt: "2026-11-12T18:00:00Z" }} />);
    expect(initial).toContain("Verificar mi empresa");
    expect(pending).toContain("En revisión. Aquí verás el resultado.");
    expect(pending).toContain("Editar solicitud");
    expect(rejected).toContain("Datos incompletos");
    expect(rejected).toContain("Corregir y reenviar");
    expect(verified).toContain("Verificada el 12 nov 2026");
    expect(verified).toContain("20123456789");
    expect(verified).not.toContain("Enviar solicitud");
  });

  it("explica qué falta y adapta la identificación al país", () => {
    const peru = renderToStaticMarkup(<CompanyVerificationForm countryCode="PE" initial={empty} onSubmit={noSubmit} showInitialErrors />);
    const spain = renderToStaticMarkup(<CompanyVerificationForm countryCode="ES" initial={empty} onSubmit={noSubmit} />);
    expect(peru).toContain("Ingresa un RUC de 11 dígitos.");
    expect(peru).toContain("Ingresa un sitio web o correo corporativo.");
    expect(peru).toMatch(/disabled=""[^>]*>Enviar solicitud/);
    expect(spain).toContain("Identificación fiscal");
    expect(spain).toContain("4 a 30 caracteres");
  });

  it("conserva la lectura pero deshabilita la solicitud de una cuenta suspendida", () => {
    const html = renderToStaticMarkup(<AccountStatusContext.Provider value={{ state: "suspended", reason: "Motivo de prueba" }}><SuspensionNotice onLogout={() => {}} reason="Motivo de prueba" /><CompanyVerificationCardView countryCode="PE" onSubmit={noSubmit} verification={submitted} /></AccountStatusContext.Provider>);
    expect(html).toContain("Tu cuenta está suspendida");
    expect(html).toContain("Motivo de prueba");
    expect(html).toContain("En revisión. Aquí verás el resultado.");
    expect(html).toMatch(/disabled=""[^>]*>Editar solicitud/);
    expect(html).toContain("Cerrar sesión");
  });
});
