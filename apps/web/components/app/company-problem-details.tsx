"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import type { CompanyProblem } from "@/lib/problem-domain";
import {
  budgetLabel,
  beginBusinessProblemEdit,
  currencyForCountry,
  deadlineLabel,
  getCompanyProfile,
  getMyCompanyProblem,
  impactLabels,
  objectiveLabels,
  transitionBusinessProblem,
} from "@/lib/problem-service";

const statusLabel = { draft: "Borrador", open: "Publicado", paused: "En pausa", closed: "Cerrado" } as const;

export function CompanyProblemDetails() {
  const router = useRouter();
  const { user } = useAuth();
  const [problem, setProblem] = useState<CompanyProblem | null>(null);
  const [currency, setCurrency] = useState("PEN");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState("");
  const id = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("id") ?? "";

  useEffect(() => {
    if (!user || !id) {
      setIsLoading(false);
      if (user) setError("No se indicó una publicación.");
      return;
    }
    let active = true;
    if (user.role !== "company") {
      setError("Esta sección está disponible para cuentas de empresa.");
      setIsLoading(false);
      return;
    }
    void Promise.all([getMyCompanyProblem(id), getCompanyProfile()]).then(([savedProblem, profile]) => {
      if (!active) return;
      if (!savedProblem) setError("No encontramos esta publicación o no tienes acceso.");
      else setProblem(savedProblem);
      if (profile) setCurrency(currencyForCountry(profile.countryCode));
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "No pudimos cargar los detalles.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [id, user]);

  async function changeState(action: "pause" | "resume" | "close") {
    if (!problem) return;
    setIsWorking(true);
    setError("");
    try {
      await transitionBusinessProblem(problem.id, action);
      const updated = await getMyCompanyProblem(problem.id);
      if (!updated) throw new Error("No pudimos confirmar el nuevo estado.");
      setProblem(updated);
      setConfirmClose(false);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "No pudimos actualizar la publicación.");
    } finally {
      setIsWorking(false);
    }
  }

  async function editProblem() {
    if (!problem) return;
    setIsWorking(true);
    setError("");
    try {
      await beginBusinessProblemEdit(problem.id);
      router.push(`/app/problemas/nuevo/?id=${encodeURIComponent(problem.id)}`);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "No pudimos abrir la edición.");
      setIsWorking(false);
    }
  }

  if (isLoading) return <main className="mx-auto max-w-4xl px-5 py-16 text-center text-sm text-muted-foreground" role="status">Cargando la publicación…</main>;
  if (!problem) return <main className="mx-auto max-w-2xl px-5 py-16 text-center"><h1 className="text-2xl font-semibold">No se pudo abrir la publicación</h1><p className="mt-3 text-sm text-muted-foreground">{error}</p><ButtonLink className="mt-6" href="/app/problemas" variant="outline">Volver a mis problemas</ButtonLink></main>;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
      <Link className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground" href="/app/problemas">Volver a Mis problemas</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold">{statusLabel[problem.status]}</span>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{problem.title || "Borrador sin título"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Actualizado {formatDate(problem.updatedAt)}</p>
        </div>
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold">{budgetLabel(problem.budgetChoice, currency)}</p>
      </div>

      {error ? <p className="mt-6 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p> : null}

      <section className="mt-7 space-y-4">
        <DetailSection title="Problema"><p className="whitespace-pre-wrap text-sm leading-7">{problem.description || "Sin descripción"}</p>{problem.impacts.length ? <p className="mt-3 text-sm text-muted-foreground">Impacto: {impactLabels(problem.impacts).join(", ")}</p> : null}</DetailSection>
        <DetailSection title="Contexto empresarial">
          <p className="text-sm">Sector: {problem.industrySnapshot}</p>
          {problem.locationsCount !== null ? <p className="mt-2 text-sm">Sedes involucradas: {problem.locationsCount}</p> : null}
          {problem.peopleAffected !== null ? <p className="mt-2 text-sm">Personas afectadas: {problem.peopleAffected}</p> : null}
          {problem.currentProcess ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">Actividad actual: {problem.currentProcess}</p> : null}
          {problem.currentTools ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">Herramientas: {problem.currentTools}</p> : null}
          {problem.specialConditions ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">Condiciones: {problem.specialConditions}</p> : null}
        </DetailSection>
        <DetailSection title="Resultados esperados"><ul className="list-inside list-disc text-sm leading-7">{objectiveLabels(problem.objectives).map((objective) => <li key={objective}>{objective}</li>)}</ul>{problem.successCriteria ? <p className="mt-3 text-sm">Éxito: {problem.successCriteria}</p> : null}</DetailSection>
        <DetailSection title="Presupuesto y plazo"><p className="text-sm">{budgetLabel(problem.budgetChoice, currency)}</p><p className="mt-2 text-sm">{deadlineLabel(problem.deadlineChoice)}</p></DetailSection>
        <DetailSection title="Visibilidad"><p className="text-sm">{problem.showCompanyName ? "El nombre de la empresa se muestra en la publicación." : "El nombre de la empresa se oculta en la publicación pública."}</p></DetailSection>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-semibold">Propuestas</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">El módulo para recibir y comparar propuestas todavía no está conectado. Esta publicación no muestra propuestas ni estados de contratación ficticios.</p>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        {problem.status === "draft" ? <ButtonLink href={`/app/problemas/nuevo/?id=${encodeURIComponent(problem.id)}`}>Continuar borrador</ButtonLink> : null}
        {(problem.status === "open" || problem.status === "paused") ? <Button disabled={isWorking} onClick={() => void editProblem()} variant="outline">Editar publicación</Button> : null}
        {problem.status === "open" ? <Button disabled={isWorking} onClick={() => void changeState("pause")} variant="outline">Pausar publicación</Button> : null}
        {problem.status === "paused" ? <Button disabled={isWorking} onClick={() => void changeState("resume")} variant="outline">Reanudar publicación</Button> : null}
        {(problem.status === "open" || problem.status === "paused") && !confirmClose ? <Button disabled={isWorking} onClick={() => setConfirmClose(true)} variant="quiet">Cerrar sin adjudicar</Button> : null}
      </div>
      {confirmClose ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-950">Al cerrar, ya no se podrá reanudar esta publicación. ¿Quieres continuar?</p>
          <div className="flex gap-2"><Button disabled={isWorking} onClick={() => setConfirmClose(false)} variant="outline">Volver</Button><Button disabled={isWorking} onClick={() => void changeState("close")}>{isWorking ? "Cerrando…" : "Confirmar cierre"}</Button></div>
        </div>
      ) : null}
    </main>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6"><h2 className="mb-3 text-sm font-semibold text-muted-foreground">{title}</h2>{children}</section>;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "recientemente" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(date);
}
