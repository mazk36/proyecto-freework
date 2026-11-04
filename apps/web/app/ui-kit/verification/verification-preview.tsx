"use client";

import { useState } from "react";
import { SuspensionNotice } from "@/components/app/account-status";
import { CompanyVerificationCardView, CompanyVerificationForm } from "@/components/app/company-verification-card";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import { CompanyTrustChip } from "@/components/ui/company-trust-chip";
import { useToast } from "@/components/ui/toast";
import type { CompanyVerification, CompanyVerificationInput, CompanyVerificationStatus } from "@/lib/company-verification";

const sample: CompanyVerification = {
  status: "not_requested", legalName: null, countryCode: null, taxId: null, websiteUrl: null,
  corporateEmail: null, linkedinUrl: null, rejectionReason: null, submittedAt: null, verifiedAt: null, updatedAt: null,
};
const supplied: CompanyVerification = { ...sample, status: "pending", legalName: "Empresa de muestra S. A. C.", countryCode: "PE", taxId: "20123456789", websiteUrl: "https://empresa.example", corporateEmail: "equipo@empresa.example", submittedAt: "2026-11-02T12:00:00Z", updatedAt: "2026-11-02T12:00:00Z" };
const examples: { label: string; data: CompanyVerification }[] = [
  { label: "Sin solicitar", data: sample },
  { label: "Pendiente", data: supplied },
  { label: "Verificada", data: { ...supplied, status: "verified", verifiedAt: "2026-11-12T17:00:00Z" } },
  { label: "Rechazada", data: { ...supplied, status: "rejected", rejectionReason: "No pudimos validar la identificación fiscal." } },
];

function SampleCard({ data }: { data: CompanyVerification }) {
  const [verification, setVerification] = useState(data);
  const { toast } = useToast();
  async function submitSample(input: CompanyVerificationInput) {
    setVerification({ ...verification, ...input, status: "pending" as CompanyVerificationStatus, countryCode: "PE", websiteUrl: input.websiteUrl || null, corporateEmail: input.corporateEmail || null, linkedinUrl: input.linkedinUrl || null, rejectionReason: null });
    toast({ title: "Solicitud enviada", tone: "success" });
  }
  return <CompanyVerificationCardView countryCode="PE" onSubmit={submitSample} verification={verification} />;
}

export function VerificationPreview() {
  const { toast } = useToast();
  return <main className="private-app-shell ui-kit min-h-dvh bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8"><MatchWorkLogoLockup className="w-[6.5rem] sm:w-32" size="compact" variant="reversed" /><span className="rounded-full border border-warning/40 bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">Datos de muestra · sin Supabase</span></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12"><h1 className="font-display text-3xl font-semibold">Verificación y confianza</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Muestra para revisar estados, formulario, chips y suspensión. Los datos son ficticios.</p>
      <section aria-labelledby="cards-title" className="mt-10"><h2 className="font-display text-xl font-semibold" id="cards-title">Estados de la tarjeta</h2><div className="grid gap-6 lg:grid-cols-2">{examples.map(({ label, data }) => <div key={label}><p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Muestra · {label}</p><SampleCard data={data} /></div>)}</div></section>
      <section aria-labelledby="form-title" className="mt-12 rounded-2xl border border-border bg-surface p-5 sm:p-7"><h2 className="font-display text-xl font-semibold" id="form-title">Formulario con errores · muestra</h2><p className="mb-6 mt-2 text-sm text-muted-foreground">Los errores visibles representan campos que ya perdieron el foco.</p><CompanyVerificationForm countryCode="PE" initial={sample} onSubmit={async () => { toast({ title: "Solicitud enviada", tone: "success" }); }} showInitialErrors /></section>
      <section aria-labelledby="chips-title" className="mt-12 rounded-2xl border border-border bg-surface p-5 sm:p-7"><h2 className="font-display text-xl font-semibold" id="chips-title">Chips · muestra</h2><div className="mt-4 flex flex-wrap items-center gap-4"><CompanyTrustChip verified /><CompanyTrustChip verified={false} /></div></section>
      <section aria-labelledby="suspension-title" className="mt-12"><h2 className="mb-4 font-display text-xl font-semibold" id="suspension-title">Aviso de suspensión · muestra</h2><SuspensionNotice onLogout={() => toast({ title: "Acción de muestra", tone: "neutral" })} reason="Motivo de ejemplo para revisión visual." /></section>
    </div>
  </main>;
}
