"use client";

import { Clock3, FileText, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useCanWrite } from "@/components/app/account-status";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getMine, submit } from "@/lib/company-verification-service";
import { normalizeVerificationUrl, validateCompanyVerification, type CompanyVerification, type CompanyVerificationInput } from "@/lib/company-verification";
import { getCompanyProfile, ProblemServiceError } from "@/lib/problem-service";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; verification: CompanyVerification; countryCode: string | null };

export function CompanyVerificationCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const { toast } = useToast();
  const focusedAnchor = useRef(false);
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void Promise.all([getMine(), getCompanyProfile()]).then(([verification, profile]) => {
      if (active) setState({ status: "ready", verification, countryCode: profile?.countryCode ?? null });
    }).catch((error: unknown) => {
      if (active) setState({ status: "error", message: error instanceof ProblemServiceError ? error.message : "Revisa tu conexión e inténtalo de nuevo." });
    });
    return () => { active = false; };
  }, [attempt, refreshKey]);

  useEffect(() => {
    if (state.status === "loading" || focusedAnchor.current || window.location.hash !== "#verificacion") return;
    focusedAnchor.current = true;
    const frame = window.requestAnimationFrame(() => document.getElementById("verificacion")?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [state.status]);

  if (state.status === "loading") return <section aria-label="Cargando verificación de empresa" className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-7" id="verificacion" role="status"><span className="sr-only">Cargando verificación de empresa</span><Skeleton className="h-6 w-2/3" /><Skeleton className="mt-4 h-4 w-full" /><Skeleton className="mt-3 h-11 w-48" /></section>;
  if (state.status === "error") return <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-7" id="verificacion" tabIndex={-1}><h2 className="text-xl font-semibold">Verificación de empresa</h2><p className="mt-3 text-sm text-muted-foreground" role="alert">{state.message}</p><Button className="mt-4" onClick={() => setAttempt((value) => value + 1)} variant="outline">Reintentar</Button></section>;

  return <CompanyVerificationCardView anchorId="verificacion" countryCode={state.countryCode} onSubmit={async (input) => {
    const verification = await submit(input);
    setState((current) => current.status === "ready" ? { ...current, verification } : current);
    toast({ title: "Solicitud enviada", tone: "success" });
  }} verification={state.verification} />;
}

export function CompanyVerificationCardView({ verification, countryCode, onSubmit, anchorId }: {
  verification: CompanyVerification;
  anchorId?: string;
  countryCode: string | null;
  onSubmit: (input: CompanyVerificationInput) => Promise<void>;
}) {
  const canWrite = useCanWrite();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const status = verification.status;
  const titleId = useId();
  const date = verification.verifiedAt ? new Date(verification.verifiedAt) : null;
  const verifiedDate = date && !Number.isNaN(date.valueOf()) ? new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" }).formatToParts(date).map((part) => part.type === "month" ? part.value.replace(/\.$/, "") : part.value).join("") : null;
  const labels = { not_requested: "Sin solicitar", pending: "Pendiente", verified: "Verificada", rejected: "Rechazada" } as const;
  const action = status === "not_requested" ? "Verificar mi empresa" : status === "pending" ? "Editar solicitud" : "Corregir y reenviar";

  async function send(input: CompanyVerificationInput) {
    if (busyRef.current || !canWrite) return;
    busyRef.current = true;
    setBusy(true); setError("");
    try { await onSubmit(input); setOpen(false); }
    catch (sendError) { setError(sendError instanceof ProblemServiceError ? sendError.message : "No pudimos enviar la solicitud. Inténtalo de nuevo."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  return <section aria-labelledby={titleId} className="mt-8 scroll-mt-6 rounded-2xl border border-border bg-surface p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-7" id={anchorId} tabIndex={anchorId ? -1 : undefined}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-soft"><ShieldCheck aria-hidden="true" className="size-5" /></span><div><h2 className="text-xl font-semibold tracking-tight" id={titleId}>Verificación de empresa</h2><p className="mt-1 text-sm text-muted-foreground">El estado de tu solicitud y tus datos de verificación.</p></div></div><Badge icon={status === "verified" ? ShieldCheck : status === "pending" ? Clock3 : FileText} tone={status === "verified" ? "success" : "neutral"}>{status === "verified" && verifiedDate ? `Verificada el ${verifiedDate}` : labels[status]}</Badge></div>
    {status === "not_requested" ? <p className="mt-5 text-sm leading-6 text-muted-foreground">Tu empresa aún no está verificada. Verifícala para mostrar el escudo «Empresa verificada» y generar más confianza.</p> : null}
    {status === "pending" ? <p className="mt-5 text-sm leading-6 text-muted-foreground">En revisión. Aquí verás el resultado.</p> : null}
    {status === "rejected" ? <div className="mt-5"><p className="text-sm font-semibold">No pudimos verificar tu empresa</p><p className="mt-2 break-words text-sm leading-6 text-muted-foreground">Motivo: {verification.rejectionReason}</p></div> : null}
    {status === "verified" ? <><p className="mt-5 text-sm leading-6 text-muted-foreground">Datos de la solicitud en solo lectura.</p><dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">{([
      ["Razón social", verification.legalName], [verification.countryCode === "PE" ? "RUC" : "Identificación fiscal", verification.taxId], ["País", verification.countryCode], ["Sitio web", verification.websiteUrl], ["Correo corporativo", verification.corporateEmail], ["LinkedIn de empresa", verification.linkedinUrl],
    ] as const).filter(([, value]) => value).map(([label, value]) => <div className="min-w-0" key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words [overflow-wrap:anywhere]">{value}</dd></div>)}</dl></> : <>
      {!countryCode ? <p className="mt-4 text-sm leading-6 text-muted-foreground">Guarda primero el país en el perfil de tu empresa para enviar la solicitud.</p> : null}
      <Button className="verification-action mt-5" disabled={!countryCode || !canWrite} onClick={() => { setError(""); setOpen(true); }}>{action}</Button>
    </>}
    <BottomSheet centered description="Estos datos solo son visibles para tu empresa y el equipo de administración." onClose={() => { if (!busy) setOpen(false); }} open={open} title="Verificación de empresa">
      {countryCode ? <CompanyVerificationForm busy={busy} readOnly={!canWrite} countryCode={countryCode} error={error} initial={verification} onSubmit={send} /> : null}
    </BottomSheet>
  </section>;
}

type VerificationField = "legalName" | "taxId" | "websiteUrl" | "corporateEmail" | "linkedinUrl";
const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent aria-invalid:border-danger";

export function CompanyVerificationForm({ initial, countryCode, busy = false, readOnly = false, error = "", onSubmit, showInitialErrors = false }: {
  initial: CompanyVerification;
  countryCode: string;
  busy?: boolean;
  readOnly?: boolean;
  error?: string;
  onSubmit: (input: CompanyVerificationInput) => Promise<void>;
  showInitialErrors?: boolean;
}) {
  const id = useId();
  const [input, setInput] = useState<CompanyVerificationInput>({ legalName: initial.legalName ?? "", taxId: initial.taxId ?? "", websiteUrl: initial.websiteUrl ?? "", corporateEmail: initial.corporateEmail ?? "", linkedinUrl: initial.linkedinUrl ?? "" });
  const [touched, setTouched] = useState<Partial<Record<VerificationField, boolean>>>(showInitialErrors ? { legalName: true, taxId: true, websiteUrl: true, corporateEmail: true, linkedinUrl: true } : {});
  const errors = validateCompanyVerification(input, countryCode);
  const issues = [...new Set(Object.values(errors))];
  const isPeru = countryCode.toUpperCase() === "PE";
  const country = new Intl.DisplayNames(["es"], { type: "region" }).of(countryCode.toUpperCase()) ?? countryCode;
  const fields: { name: VerificationField; label: string; help: string; placeholder?: string; type?: string; autoComplete?: string }[] = [
    { name: "legalName", label: "Razón social", help: "Nombre legal de la empresa.", autoComplete: "organization" },
    { name: "taxId", label: isPeru ? "RUC" : "Identificación fiscal", help: isPeru ? "Ingresa los 11 dígitos del RUC." : "Entre 4 y 30 caracteres." },
    { name: "websiteUrl", label: "Sitio web", help: "Indica una dirección HTTPS o un correo corporativo.", placeholder: "https://empresa.com", type: "url", autoComplete: "url" },
    { name: "corporateEmail", label: "Correo corporativo", help: "Usa un correo de la empresa, no uno de proveedor gratuito.", placeholder: "contacto@empresa.com", type: "email", autoComplete: "email" },
    { name: "linkedinUrl", label: "LinkedIn de empresa (opcional)", help: "Enlace HTTPS de linkedin.com.", placeholder: "https://www.linkedin.com/company/…", type: "url" },
  ];
  function fieldError(name: VerificationField) {
    if (!touched[name]) return undefined;
    return errors[name] ?? ((name === "websiteUrl" || name === "corporateEmail") ? errors.contact : undefined);
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!issues.length && !busy && !readOnly) void onSubmit(input); }
  return <form className="space-y-5" noValidate onSubmit={handleSubmit}>
    <p className="rounded-xl bg-surface-raised p-3 text-sm text-muted-foreground">País del perfil: <span className="font-semibold text-foreground">{country}</span></p>
    {fields.map(({ name, label, help, placeholder, type, autoComplete }) => {
      const message = fieldError(name); const fieldId = `${id}-${name}`;
      return <div key={name}><label className="block text-sm font-semibold" htmlFor={fieldId}>{label}</label><p className="mt-1 text-sm leading-5 text-muted-foreground" id={`${fieldId}-help`}>{help}</p><input aria-describedby={`${fieldId}-help${message ? ` ${fieldId}-error` : ""}`} aria-invalid={Boolean(message)} autoComplete={autoComplete} className={inputClass} disabled={busy || readOnly} id={fieldId} inputMode={name === "taxId" && isPeru ? "numeric" : undefined} onBlur={() => { setTouched((current) => ({ ...current, [name]: true })); if (name === "websiteUrl" || name === "linkedinUrl") setInput((current) => ({ ...current, [name]: normalizeVerificationUrl(current[name] ?? "") })); }} onChange={(event) => setInput((current) => ({ ...current, [name]: event.target.value }))} placeholder={placeholder} type={type ?? "text"} value={input[name] ?? ""} />{message ? <p className="mt-2 text-sm leading-5 text-danger" id={`${fieldId}-error`}>{message}</p> : null}</div>;
    })}
    {readOnly ? <p className="text-sm leading-6 text-muted-foreground" role="status">Las acciones de escritura no están disponibles para tu cuenta.</p> : null}
    {error ? <p className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm leading-6 text-danger" role="alert">{error}</p> : null}
    {issues.length ? <div aria-live="polite" className="rounded-xl bg-surface-raised p-3 text-sm leading-6 text-muted-foreground"><p className="font-semibold text-foreground">Para enviar la solicitud:</p><ul className="list-inside list-disc">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : <p className="text-sm text-success" role="status">Los datos están listos para enviar.</p>}
    <Button className="verification-action w-full" disabled={busy || readOnly || issues.length > 0} type="submit">{busy ? "Enviando…" : "Enviar solicitud"}</Button>
  </form>;
}
