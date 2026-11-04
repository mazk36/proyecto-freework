"use client";

import { Check, FilePenLine, RotateCcw, Send } from "lucide-react";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useCanWrite } from "@/components/app/account-status";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import type { PublicProblem } from "@/lib/problem-domain";
import { proposalTextLimits, type ProposalCurrency } from "@/lib/proposal-domain";
import { type ProposalTextField } from "@/lib/proposal-form";
import { proposalServices, type ProposalServices } from "@/lib/proposal-service";
import { useProposalForm } from "./use-proposal-form";

const textFields: { field: ProposalTextField; label: string; hint: string; required?: boolean; rows: number }[] = [
  { field: "diagnosis", label: "Diagnóstico", hint: "¿Cómo entiendes el problema?", required: true, rows: 4 },
  { field: "solution", label: "Solución propuesta", hint: "Explica cómo abordarías el problema.", required: true, rows: 4 },
  { field: "deliverables", label: "Entregables", hint: "Describe qué recibirá la empresa.", required: true, rows: 3 },
  { field: "timeline", label: "Plazo", hint: "Indica el tiempo estimado y, si lo deseas, las etapas.", required: true, rows: 2 },
  { field: "recurringCosts", label: "Costos recurrentes", hint: "Por ejemplo, servicios que se paguen periódicamente.", rows: 2 },
  { field: "maintenanceWarranty", label: "Mantenimiento y garantía", hint: "Cuenta qué soporte o garantía incluyes, si corresponde.", rows: 2 },
  { field: "relatedExperience", label: "Experiencia relacionada", hint: "Comparte experiencia útil para este problema.", rows: 3 },
];

const inputClass = "ui-scrollbar mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-3 text-base leading-6 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-invalid:border-danger";

export function ProposalSheet({
  problem, onClose, onSubmitted, services = proposalServices, problemUnavailable = false,
}: {
  problem: PublicProblem;
  onClose: () => void;
  onSubmitted: () => void;
  services?: ProposalServices;
  problemUnavailable?: boolean;
}) {
  const id = useId();
  const canWrite = useCanWrite();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const reducedMotion = useReducedMotion();
  const { state, busy, dispatch, retry, close, saveAndClose, submit } = useProposalForm(problem.id, services, onClose, onSubmitted);
  useEffect(() => { if (confirmDiscard) document.getElementById(`${id}-cancel-discard`)?.focus(); }, [confirmDiscard, id]);
  useEffect(() => { if (state.saveStatus !== "error") setConfirmDiscard(false); }, [state.saveStatus]);
  const statusText = !canWrite ? "Puedes consultar el borrador; las acciones de escritura no están disponibles." : busy === "submitting" ? "Enviando propuesta…" : busy === "saving" ? "Guardando borrador…" : {
    idle: "Tu borrador se guardará automáticamente.",
    dirty: "Cambios pendientes de guardar.",
    saving: "Guardando…",
    saved: "Guardado hace un momento",
    error: "Hay cambios que aún no se han guardado.",
  }[state.saveStatus];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await submit() === "invalid") {
      window.requestAnimationFrame(() => document.getElementById(`${id}-form`)?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    }
  }

  function textField(field: (typeof textFields)[number]) {
    const controlId = `${id}-${field.field}`;
    const value = state.draft[field.field];
    const length = Array.from(value).length;
    const limit = proposalTextLimits.find(([name]) => name === field.field)?.[1] ?? 0;
    const showCounter = length >= limit * 0.9;
    const error = state.fieldErrors[field.field];
    const describedBy = [`${controlId}-hint`, showCounter ? `${controlId}-count` : "", error ? `${controlId}-error` : ""].filter(Boolean).join(" ");
    return <div key={field.field}>
      <label className="block text-sm font-semibold" htmlFor={controlId}>{field.label} <span className="font-normal text-muted-foreground">{field.required ? "· Obligatorio" : "· Opcional"}</span></label>
      <p className="mt-1 text-sm leading-5 text-muted-foreground" id={`${controlId}-hint`}>{field.hint}</p>
      <textarea aria-describedby={describedBy} aria-invalid={Boolean(error)} aria-required={field.required || undefined} className={inputClass} id={controlId} onChange={(event) => dispatch({ type: "edit-text", field: field.field, value: event.target.value })} rows={field.rows} value={value} />
      {showCounter ? <p className="mt-1 text-right text-xs text-muted-foreground" id={`${controlId}-count`}>{length} / {limit} caracteres</p> : null}
      {error ? <p className="mt-2 text-sm leading-5 text-danger" id={`${controlId}-error`}>{error}</p> : null}
    </div>;
  }

  return <MotionConfig reducedMotion="user"><BottomSheet description="Explica cómo resolverías este problema. Puedes volver a tu borrador más tarde." onClose={() => { void close(); }} open title="Tu propuesta">
    {state.phase === "loading" ? <div aria-label="Cargando borrador" className="space-y-5" role="status"><span className="sr-only">Cargando borrador</span><Skeleton className="h-6 w-3/4" /><SkeletonText /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div> : null}
    {state.phase === "load-error" ? <EmptyState action={<Button onClick={retry}>Reintentar</Button>} description={state.error ?? "Inténtalo de nuevo."} icon={RotateCcw} title="No pudimos abrir tu borrador" tone="warning" /> : null}
    {state.phase === "already-submitted" ? <EmptyState action={<ButtonLink href="/app/likes">Ver mis propuestas</ButtonLink>} description="Ya enviaste una propuesta para este problema." icon={Send} title="Tu propuesta ya está enviada" /> : null}
    {state.phase === "submitted" ? <div aria-live="polite" className="py-12 text-center" role="status">
      <motion.div animate={{ opacity: 1, scale: 1 }} className="mx-auto grid size-20 place-items-center rounded-full bg-success-soft text-success" initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.85 }} transition={{ duration: 0.2, ease: "easeOut" }}><Check aria-hidden="true" className="size-10" strokeWidth={2} /></motion.div>
      <h3 className="mt-6 font-display text-xl font-semibold">¡Propuesta enviada!</h3>
      <p className="mt-3 text-base leading-6 text-muted-foreground">Tu propuesta fue enviada a {problem.companyName || "Empresa reservada"}.</p>
      <Button className="mt-7" onClick={() => { void close(); }}>Listo</Button>
    </div> : null}
    {state.phase === "ready" ? <form className="space-y-6" id={`${id}-form`} noValidate onSubmit={(event) => { void handleSubmit(event); }}>
      <div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-lavender">Problema</p><p className="mt-2 break-words font-display text-base font-semibold">{problem.title}</p><p className="mt-1 text-sm text-muted-foreground">{problem.companyName || "Empresa reservada"}</p></div>
      {problemUnavailable ? <p className="rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm leading-6 text-warning">La información pública de este problema no está disponible. Solo podrás guardar o enviar el borrador si el problema está abierto.</p> : null}
      <fieldset className="space-y-6" disabled={!canWrite || Boolean(busy)}>
        {textFields.slice(0, 4).map(textField)}
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div><label className="block text-sm font-semibold" htmlFor={`${id}-price`}>Precio <span className="font-normal text-muted-foreground">· Obligatorio</span></label><p className="mt-1 text-sm leading-5 text-muted-foreground" id={`${id}-price-hint`}>Precio total de tu propuesta.</p><input aria-describedby={`${id}-price-hint${state.fieldErrors.price ? ` ${id}-price-error` : ""}`} aria-invalid={Boolean(state.fieldErrors.price)} aria-required="true" className={inputClass} id={`${id}-price`} inputMode="decimal" onChange={(event) => dispatch({ type: "edit-price", value: event.target.value })} placeholder="0.00" type="text" value={state.priceText} />{state.fieldErrors.price ? <p className="mt-2 text-sm leading-5 text-danger" id={`${id}-price-error`}>{state.fieldErrors.price}</p> : null}</div>
          <fieldset aria-describedby={state.fieldErrors.currency ? `${id}-currency-error` : undefined}><legend className="text-sm font-semibold">Moneda</legend><p className="mt-1 text-sm leading-5 text-muted-foreground">Sin conversión automática.</p><div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">{(["PEN", "USD"] as ProposalCurrency[]).map((currency) => <label className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${state.draft.currency === currency ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`} key={currency}><input checked={state.draft.currency === currency} className="sr-only" name={`${id}-currency`} onChange={() => dispatch({ type: "edit-currency", value: currency })} type="radio" value={currency} />{currency === "PEN" ? "S/ PEN" : "US$ USD"}</label>)}</div>{state.fieldErrors.currency ? <p className="mt-2 text-sm text-danger" id={`${id}-currency-error`}>{state.fieldErrors.currency}</p> : null}</fieldset>
        </div>
        {textFields.slice(4).map(textField)}
      </fieldset>
      <div className="border-t border-border pt-5">
        <p aria-atomic="true" aria-live="polite" className="min-h-6 text-sm text-muted-foreground">{statusText}</p>
        {state.error ? <p className="mt-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm leading-6 text-danger" role="alert">{state.error}</p> : null}
        {state.saveStatus === "error" && state.revision > state.savedRevision ? <div className="mt-3">
          {confirmDiscard ? <div aria-label="Confirmar cierre sin guardar" className="rounded-xl border border-warning/40 bg-warning-soft p-4" role="group"><p className="text-sm leading-6 text-warning">Si cierras ahora, perderás los cambios que aún no se guardaron.</p><div className="mt-3 flex flex-wrap gap-2"><Button disabled={Boolean(busy)} id={`${id}-cancel-discard`} onClick={() => setConfirmDiscard(false)} variant="outline">Seguir editando</Button><Button disabled={Boolean(busy)} onClick={onClose} variant="outline">Sí, cerrar sin guardar</Button></div></div> : <Button disabled={Boolean(busy)} onClick={() => setConfirmDiscard(true)} variant="quiet">Cerrar sin guardar cambios</Button>}
        </div> : null}
        <div className="mt-4 grid gap-3"><Button disabled={!canWrite || Boolean(busy)} type="submit">Enviar propuesta <Send aria-hidden="true" className="size-4" /></Button><Button disabled={!canWrite || Boolean(busy)} onClick={() => { void saveAndClose(); }} variant="outline"><FilePenLine aria-hidden="true" className="size-4" />Guardar borrador para después</Button></div>
      </div>
    </form> : null}
  </BottomSheet></MotionConfig>;
}
