"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import {
  budgetOptions,
  createEmptyProblemDraft,
  deadlineOptions,
  impactOptions,
  isCompanyProfileComplete,
  objectiveOptions,
  validateProblemForPublishing,
  validateProblemStep,
  type CompanyProfile,
  type ProblemDraft,
} from "@/lib/problem-domain";
import {
  budgetLabel,
  getCompanyProfile,
  getMyCompanyProblem,
  ProblemServiceError,
  publishBusinessProblem,
  saveBusinessProblemDraft,
} from "@/lib/problem-service";

const stepTitles = ["Describe el problema", "Tu negocio", "Qué quieres mejorar", "Presupuesto y plazo", "Revisar y publicar"];
const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30";
const textAreaClass = `${inputClass} min-h-32 resize-y leading-6`;

export function ProblemPublishingWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [draft, setDraft] = useState<ProblemDraft>(createEmptyProblemDraft);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const idRef = useRef<string | null>(null);
  const lastSavedSignature = useRef("");
  const saveTimer = useRef<number | null>(null);
  const savePromise = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "company") {
      router.replace("/app");
      return;
    }
    let active = true;
    const requestedId = new URLSearchParams(window.location.search).get("id");

    void (async () => {
      try {
        const company = await getCompanyProfile();
        if (!active) return;
        if (!isCompanyProfileComplete(company)) {
          router.replace(`/app/perfil?next=${encodeURIComponent(`/app/problemas/nuevo${requestedId ? `?id=${requestedId}` : ""}`)}`);
          return;
        }
        setProfile(company);

        if (requestedId) {
          const savedProblem = await getMyCompanyProblem(requestedId);
          if (!active) return;
          if (!savedProblem || savedProblem.status !== "draft") {
            setError("No encontramos un borrador que puedas editar.");
          } else {
            idRef.current = savedProblem.id;
            const loadedDraft: ProblemDraft = {
              id: savedProblem.id,
              currentStep: savedProblem.currentStep,
              title: savedProblem.title,
              description: savedProblem.description,
              impacts: savedProblem.impacts,
              locationsCount: savedProblem.locationsCount,
              peopleAffected: savedProblem.peopleAffected,
              currentProcess: savedProblem.currentProcess,
              currentTools: savedProblem.currentTools,
              specialConditions: savedProblem.specialConditions,
              objectives: savedProblem.objectives,
              successCriteria: savedProblem.successCriteria,
              budgetChoice: savedProblem.budgetChoice,
              deadlineChoice: savedProblem.deadlineChoice,
              showCompanyName: savedProblem.showCompanyName,
              reviewedAndConsented: savedProblem.reviewedAndConsented,
            };
            setDraft(loadedDraft);
            setStep(savedProblem.currentStep);
            lastSavedSignature.current = draftSignature(loadedDraft, company);
          }
        } else {
          idRef.current = window.crypto.randomUUID();
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "No pudimos cargar el formulario.");
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [router, user]);

  const saveSnapshot = useCallback(async (snapshot: ProblemDraft, company: CompanyProfile): Promise<string | null> => {
    const signature = draftSignature(snapshot, company);
    if (signature === lastSavedSignature.current) return idRef.current;
    if (!hasDraftContent(snapshot) && !idRef.current) return null;
    if (savePromise.current) {
      await savePromise.current;
      return saveSnapshot(snapshot, company);
    }

    setIsSaving(true);
    setSaveState("saving");
    setError("");
    const task = saveBusinessProblemDraft({ ...snapshot, id: idRef.current ?? snapshot.id }, company)
      .then((id) => {
        idRef.current = id;
        lastSavedSignature.current = signature;
        setDraft((current) => current.id === id ? current : { ...current, id });
        setSaveState("saved");
        return id;
      })
      .catch((saveError: unknown) => {
        setSaveState("error");
        throw saveError;
      })
      .finally(() => {
        if (savePromise.current === task) savePromise.current = null;
        setIsSaving(false);
      });
    savePromise.current = task;
    return task;
  }, []);

  useEffect(() => {
    if (!profile || isLoading || publishedId) return;
    const signature = draftSignature(draft, profile);
    if (signature === lastSavedSignature.current || !hasDraftContent(draft)) return;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveSnapshot(draft, profile).catch((saveError: unknown) => {
        setError(saveError instanceof Error ? saveError.message : "No pudimos guardar los cambios.");
      });
    }, 900);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [draft, isLoading, profile, publishedId, saveSnapshot]);

  function updateDraft(change: (current: ProblemDraft) => ProblemDraft, invalidateConsent = step < 5) {
    setDraft((current) => {
      const next = change(current);
      return invalidateConsent ? { ...next, reviewedAndConsented: false } : next;
    });
    setErrors([]);
    setError("");
  }

  function setText(field: "title" | "description" | "currentProcess" | "currentTools" | "specialConditions" | "successCriteria") {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      updateDraft((current) => ({ ...current, [field]: value }));
    };
  }

  async function moveToStep(nextStep: number) {
    const issues = validateProblemStep(step, draft);
    setErrors(issues);
    setError("");
    if (issues.length > 0) return;
    const nextDraft = { ...draft, currentStep: nextStep };
    setDraft(nextDraft);
    if (profile && hasDraftContent(nextDraft)) {
      try {
        if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
        await saveSnapshot(nextDraft, profile);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No pudimos guardar el avance.");
        return;
      }
    }
    setStep(nextStep);
  }

  async function saveAndExit() {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    if (profile && hasDraftContent(draft)) {
      try {
        await saveSnapshot(draft, profile);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No pudimos guardar el borrador.");
        return;
      }
    }
    router.push("/app/problemas");
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issues = validateProblemForPublishing(draft);
    setErrors(issues);
    if (issues.length || !profile) return;
    setIsPublishing(true);
    setError("");
    try {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      if (idRef.current) {
        const existing = await getMyCompanyProblem(idRef.current);
        if (existing?.status === "open") {
          setPublishedId(existing.id);
          return;
        }
      }
      const id = await saveSnapshot(draft, profile);
      if (!id) throw new ProblemServiceError("Guarda primero la información de tu problema.");
      const confirmedId = await publishBusinessProblem(id);
      setPublishedId(confirmedId);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "No se pudo confirmar la publicación.");
    } finally {
      setIsPublishing(false);
    }
  }

  if (publishedId) return <PublishSuccess problemId={publishedId} />;

  if (isLoading) {
    return <main className="mx-auto max-w-3xl px-5 py-16 text-center text-sm text-muted-foreground" role="status">Preparando tu publicación…</main>;
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-2xl font-semibold">No se pudo abrir la publicación</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{error || "Completa primero el perfil de tu empresa."}</p>
        <ButtonLink className="mt-6" href="/app/perfil">Ir al perfil</ButtonLink>
      </main>
    );
  }

  const progress = (step / stepTitles.length) * 100;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground" href="/app/problemas">Volver a Mis problemas</Link>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Publicar un problema</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Describe la necesidad de tu negocio. Los desarrolladores propondrán la tecnología.</p>
        </div>
        <Button disabled={isSaving || isPublishing} onClick={() => void saveAndExit()} type="button" variant="outline">Guardar y salir</Button>
      </header>

      <section aria-label={`Paso ${step} de 5`} className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">Paso {step} de 5 <span className="ml-2 font-normal text-muted-foreground">{stepTitles[step - 1]}</span></p>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <div aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="mt-3 h-2 overflow-hidden rounded-full bg-accent-soft" role="progressbar">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>

        <form className="mt-8" onSubmit={step === 5 ? publish : (event) => { event.preventDefault(); void moveToStep(step + 1); }}>
          {step === 1 ? <ProblemDescriptionStep draft={draft} setText={setText} toggleImpact={(value) => toggleValue("impacts", value)} /> : null}
          {step === 2 ? <BusinessContextStep draft={draft} profile={profile} setText={setText} updateDraft={updateDraft} /> : null}
          {step === 3 ? <ObjectivesStep draft={draft} setText={setText} toggleObjective={(value) => toggleValue("objectives", value)} /> : null}
          {step === 4 ? <BudgetStep draft={draft} profile={profile} updateDraft={updateDraft} /> : null}
          {step === 5 ? <ReviewStep draft={draft} profile={profile} onEdit={(nextStep) => { setStep(nextStep); setDraft((current) => ({ ...current, currentStep: nextStep })); setErrors([]); }} updateDraft={updateDraft} /> : null}

          {errors.length > 0 ? (
            <ul className="mt-6 space-y-1 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              {errors.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          ) : null}
          {error ? <p className="mt-5 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p> : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <div>
              {step > 1 ? <Button disabled={isSaving || isPublishing} onClick={() => { const previousStep = step - 1; setStep(previousStep); setDraft((current) => ({ ...current, currentStep: previousStep })); setErrors([]); }} type="button" variant="outline">Anterior</Button> : <span />}
              <p aria-live="polite" className="mt-2 min-h-5 text-xs text-muted-foreground">
                {saveState === "saving" ? "Guardando cambios…" : saveState === "saved" ? "Borrador guardado" : saveState === "error" ? "No se guardaron los últimos cambios" : ""}
              </p>
            </div>
            {step < 5 ? (
              <Button disabled={isSaving || isPublishing} onClick={() => void moveToStep(step + 1)} type="button">{isSaving ? "Guardando…" : "Continuar"}</Button>
            ) : (
              <Button disabled={isSaving || isPublishing} type="submit">{isPublishing ? "Publicando…" : "Publicar problema"}</Button>
            )}
          </div>
        </form>
      </section>
    </main>
  );

  function toggleValue(field: "impacts" | "objectives", value: string) {
    updateDraft((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  }
}

function ProblemDescriptionStep({
  draft,
  setText,
  toggleImpact,
}: {
  draft: ProblemDraft;
  setText: (field: "title" | "description") => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  toggleImpact: (value: string) => void;
}) {
  return (
    <div>
      <StepHeading title="Cuéntanos, ¿qué está pasando en tu negocio?" description="No necesitas saber programar. Explícanos la situación con tus propias palabras." />
      <div className="mt-7 space-y-6">
        <Field label="Título del problema" htmlFor="problem-title" hint="Entre 12 y 120 caracteres.">
          <input autoComplete="off" className={inputClass} id="problem-title" maxLength={120} minLength={12} onChange={setText("title")} required value={draft.title} />
        </Field>
        <Field label="Descripción detallada" htmlFor="problem-description" hint="Entre 40 y 3,000 caracteres.">
          <textarea className={textAreaClass} id="problem-description" maxLength={3000} minLength={40} onChange={setText("description")} required value={draft.description} />
          <p className="mt-1 text-right text-xs text-muted-foreground">{draft.description.length}/3,000</p>
        </Field>
        <fieldset>
          <legend className="text-sm font-semibold">¿Qué impacto tiene? <span className="font-normal text-muted-foreground">Opcional</span></legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {impactOptions.map((item) => <CheckboxCard checked={draft.impacts.includes(item.value)} key={item.value} label={item.label} onChange={() => toggleImpact(item.value)} />)}
          </div>
        </fieldset>
        <p className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm leading-6 text-foreground">Explica qué ocurre y cómo afecta a tu negocio. Los desarrolladores propondrán la tecnología.</p>
      </div>
    </div>
  );
}

function BusinessContextStep({
  draft,
  profile,
  setText,
  updateDraft,
}: {
  draft: ProblemDraft;
  profile: CompanyProfile;
  setText: (field: "currentProcess" | "currentTools" | "specialConditions") => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  updateDraft: (change: (current: ProblemDraft) => ProblemDraft) => void;
}) {
  return (
    <div>
      <StepHeading title="Cuéntanos un poco sobre tu negocio" description="Usamos la información de tu empresa y añadimos el contexto específico de este problema." />
      <div className="mt-7 rounded-xl bg-background p-4">
        <p className="text-sm font-semibold">{profile.companyName}</p>
        <p className="mt-1 text-sm text-muted-foreground">Sector: {profile.industry}</p>
        <Link className="mt-2 inline-block text-xs font-semibold text-accent underline underline-offset-4" href={`/app/perfil?next=${encodeURIComponent(`/app/problemas/nuevo${draft.id ? `?id=${draft.id}` : ""}`)}`}>Editar el perfil empresarial</Link>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Locales o sedes involucradas" htmlFor="locations-count" hint="Opcional; escribe un número aproximado.">
          <input className={inputClass} id="locations-count" inputMode="numeric" min="0" onChange={(event) => updateDraft((current) => ({ ...current, locationsCount: parseOptionalInteger(event.target.value) }))} type="number" value={draft.locationsCount ?? ""} />
        </Field>
        <Field label="Personas afectadas" htmlFor="people-count" hint="Opcional; escribe un número aproximado.">
          <input className={inputClass} id="people-count" inputMode="numeric" min="0" onChange={(event) => updateDraft((current) => ({ ...current, peopleAffected: parseOptionalInteger(event.target.value) }))} type="number" value={draft.peopleAffected ?? ""} />
        </Field>
      </div>
      <div className="mt-5 space-y-5">
        <Field label="¿Cómo realizan actualmente esta actividad?" htmlFor="current-process" hint="Opcional">
          <textarea className={textAreaClass} id="current-process" maxLength={2000} onChange={setText("currentProcess")} value={draft.currentProcess} />
        </Field>
        <Field label="¿Qué herramientas utilizan hoy?" htmlFor="current-tools" hint="Opcional">
          <textarea className={`${textAreaClass} min-h-24`} id="current-tools" maxLength={1000} onChange={setText("currentTools")} value={draft.currentTools} />
        </Field>
        <Field label="Condiciones especiales" htmlFor="special-conditions" hint="Por ejemplo: horarios, normas o limitaciones. Opcional">
          <textarea className={`${textAreaClass} min-h-24`} id="special-conditions" maxLength={2000} onChange={setText("specialConditions")} value={draft.specialConditions} />
        </Field>
      </div>
    </div>
  );
}

function ObjectivesStep({
  draft,
  setText,
  toggleObjective,
}: {
  draft: ProblemDraft;
  setText: (field: "successCriteria") => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  toggleObjective: (value: string) => void;
}) {
  return (
    <div>
      <StepHeading title="Si resolviéramos este problema, ¿qué te gustaría mejorar?" description="Selecciona los resultados que más te importan. No hace falta elegir herramientas o tecnologías." />
      <fieldset className="mt-7">
        <legend className="text-sm font-semibold">Objetivos <span className="font-normal text-muted-foreground">Elige al menos uno</span></legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {objectiveOptions.map((item) => <CheckboxCard checked={draft.objectives.includes(item.value)} key={item.value} label={item.label} onChange={() => toggleObjective(item.value)} />)}
        </div>
      </fieldset>
      <div className="mt-6">
        <Field label="¿Cómo sabrías que el problema quedó resuelto?" htmlFor="success-criteria" hint="Opcional">
          <textarea className={textAreaClass} id="success-criteria" maxLength={1500} onChange={setText("successCriteria")} value={draft.successCriteria} />
        </Field>
      </div>
    </div>
  );
}

function BudgetStep({
  draft,
  profile,
  updateDraft,
}: {
  draft: ProblemDraft;
  profile: CompanyProfile;
  updateDraft: (change: (current: ProblemDraft) => ProblemDraft) => void;
}) {
  const currency = currencyForProfile(profile.countryCode);
  return (
    <div>
      <StepHeading title="¿Cuánto podrías invertir aproximadamente?" description="Puedes elegir que todavía no lo sabes. El presupuesto es referencial." />
      <fieldset className="mt-7">
        <legend className="text-sm font-semibold">Presupuesto <span className="text-rose-700">*</span></legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {budgetOptions.map((item) => <RadioCard checked={draft.budgetChoice === item.value} key={item.value} label={budgetLabel(item.value, currency)} name="budget" onChange={() => updateDraft((current) => ({ ...current, budgetChoice: item.value }))} />)}
        </div>
      </fieldset>
      <fieldset className="mt-7">
        <legend className="text-sm font-semibold">¿Para cuándo te gustaría contar con una solución? <span className="text-rose-700">*</span></legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {deadlineOptions.map((item) => <RadioCard checked={draft.deadlineChoice === item.value} key={item.value} label={item.label} name="deadline" onChange={() => updateDraft((current) => ({ ...current, deadlineChoice: item.value }))} />)}
        </div>
      </fieldset>
      <p className="mt-6 rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">El presupuesto es referencial. Podrás comparar propuestas antes de elegir.</p>
    </div>
  );
}

function ReviewStep({
  draft,
  profile,
  onEdit,
  updateDraft,
}: {
  draft: ProblemDraft;
  profile: CompanyProfile;
  onEdit: (step: number) => void;
  updateDraft: (change: (current: ProblemDraft) => ProblemDraft, invalidateConsent?: boolean) => void;
}) {
  const currency = currencyForProfile(profile.countryCode);
  return (
    <div>
      <StepHeading title="Revisa tu problema antes de publicarlo" description="Asegúrate de que la información refleje lo que tu negocio necesita." />
      <div className="mt-7 divide-y divide-border rounded-xl border border-border px-4 sm:px-6">
        <ReviewSection label="Problema" onEdit={() => onEdit(1)}>
          <h3 className="font-semibold">{draft.title || "Sin título"}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{draft.description || "Sin descripción"}</p>
          {draft.impacts.length ? <p className="mt-3 text-xs text-muted-foreground">Impacto: {draft.impacts.map((value) => impactOptions.find((item) => item.value === value)?.label).filter(Boolean).join(", ")}</p> : null}
        </ReviewSection>
        <ReviewSection label="Contexto empresarial" onEdit={() => onEdit(2)}>
          <p className="text-sm font-medium">{profile.companyName} · {profile.industry}</p>
          {draft.locationsCount !== null ? <p className="mt-1 text-sm text-muted-foreground">Sedes involucradas: {draft.locationsCount}</p> : null}
          {draft.peopleAffected !== null ? <p className="mt-1 text-sm text-muted-foreground">Personas afectadas: {draft.peopleAffected}</p> : null}
          {draft.currentProcess ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{draft.currentProcess}</p> : null}
          {draft.currentTools ? <p className="mt-2 text-sm text-muted-foreground">Herramientas: {draft.currentTools}</p> : null}
          {draft.specialConditions ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">Condiciones: {draft.specialConditions}</p> : null}
        </ReviewSection>
        <ReviewSection label="Objetivos" onEdit={() => onEdit(3)}>
          <ul className="list-inside list-disc text-sm leading-6">{draft.objectives.map((value) => <li key={value}>{objectiveOptions.find((item) => item.value === value)?.label ?? value}</li>)}</ul>
          {draft.successCriteria ? <p className="mt-2 text-sm text-muted-foreground">Éxito: {draft.successCriteria}</p> : null}
        </ReviewSection>
        <ReviewSection label="Presupuesto y plazo" onEdit={() => onEdit(4)}>
          <p className="text-sm">{budgetLabel(draft.budgetChoice, currency)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{deadlineOptions.find((item) => item.value === draft.deadlineChoice)?.label}</p>
        </ReviewSection>
        <ReviewSection label="Visibilidad" onEdit={() => onEdit(5)}>
          <fieldset>
            <legend className="text-sm font-medium">Nombre de empresa en la publicación para freelancers</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <RadioCard checked={draft.showCompanyName} label="Mostrar nombre de empresa" name="company-visibility" onChange={() => updateDraft((current) => ({ ...current, showCompanyName: true }), false)} />
              <RadioCard checked={!draft.showCompanyName} label="Ocultar inicialmente el nombre" name="company-visibility" onChange={() => updateDraft((current) => ({ ...current, showCompanyName: false }), false)} />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Si lo ocultas, el nombre no se incluirá en la información que reciben los freelancers.</p>
          </fieldset>
        </ReviewSection>
      </div>
      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm leading-6">
        <input checked={draft.reviewedAndConsented} className="mt-1 size-4 shrink-0 accent-accent" onChange={(event) => updateDraft((current) => ({ ...current, reviewedAndConsented: event.target.checked }), false)} required type="checkbox" />
        <span>Confirmo que revisé la información y que mi empresa puede compartirla para recibir propuestas.</span>
      </label>
    </div>
  );
}

function PublishSuccess({ problemId }: { problemId: string }) {
  return (
    <main className="mx-auto grid min-h-[68vh] max-w-3xl place-items-center px-5 py-12 text-center">
      <section aria-labelledby="publish-success-title" className="w-full rounded-2xl border border-border bg-surface p-7 sm:p-10">
        <div aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-800">✓</div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight" id="publish-success-title">¡Tu problema ya está publicado!</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Los desarrolladores podrán revisar tu publicación y enviarte propuestas para solucionarlo.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href={`/app/problemas/detalle/?id=${encodeURIComponent(problemId)}`}>Ver mi publicación</ButtonLink>
          <ButtonLink href="/app/problemas" variant="outline">Ir a mis problemas</ButtonLink>
          <ButtonLink href="/app/problemas/nuevo" variant="quiet">Publicar otro problema</ButtonLink>
        </div>
      </section>
    </main>
  );
}

function StepHeading({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div>;
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return <div><label className="text-sm font-semibold" htmlFor={htmlFor}>{label}</label>{children}{hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}</div>;
}

function CheckboxCard({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-accent ${checked ? "border-accent bg-accent/5" : "border-border hover:bg-background"}`}>
      <input checked={checked} className="size-4 accent-accent" onChange={onChange} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function RadioCard({ checked, label, name, onChange }: { checked: boolean; label: string; name: string; onChange: () => void }) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-accent ${checked ? "border-accent bg-accent/5" : "border-border hover:bg-background"}`}>
      <input checked={checked} className="size-4 accent-accent" name={name} onChange={onChange} type="radio" />
      <span>{label}</span>
    </label>
  );
}

function ReviewSection({ label, onEdit, children }: { label: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{label}</h3>
        <button className="rounded text-xs font-semibold text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={onEdit} type="button">Editar</button>
      </div>
      {children}
    </section>
  );
}

function parseOptionalInteger(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function draftSignature(draft: ProblemDraft, profile?: CompanyProfile): string {
  return JSON.stringify({
    ...draft,
    id: null,
    companyName: profile?.companyName ?? "",
    industry: profile?.industry ?? "",
    countryCode: profile?.countryCode ?? "",
  });
}

function hasDraftContent(draft: ProblemDraft): boolean {
  return Boolean(
    draft.title.trim() || draft.description.trim() || draft.impacts.length ||
    draft.locationsCount !== null || draft.peopleAffected !== null || draft.currentProcess.trim() ||
    draft.currentTools.trim() || draft.specialConditions.trim() || draft.objectives.length ||
    draft.successCriteria.trim() || draft.budgetChoice || draft.deadlineChoice || draft.reviewedAndConsented,
  );
}

function currencyForProfile(countryCode: string): string {
  switch (countryCode) {
    case "PE": return "PEN";
    case "AR": return "ARS";
    case "BR": return "BRL";
    case "CL": return "CLP";
    case "CO": return "COP";
    case "ES": return "EUR";
    case "MX": return "MXN";
    case "BR": return "BRL";
    case "ES": return "EUR";
    default: return "USD";
  }
}
