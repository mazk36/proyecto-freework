"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FilePlus2,
  PencilLine,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PROBLEM_HASHTAGS } from "@/data/problem-tags";
import { Button, ButtonLink } from "@/components/ui/button";
import { Hashtag } from "@/components/ui/badges";
import { formatBudget, validateBudgetRange } from "@/lib/problem-utils";
import type { ProblemBudget, ProblemUrgency } from "@/types/domain";

const stepNames = [
  "El problema",
  "Situación actual",
  "Resultado esperado",
  "A quién afecta",
  "Restricciones",
  "Áreas relacionadas",
  "Presupuesto",
  "Cuándo comenzar",
  "Archivos",
  "Revisión",
];

const urgencyOptions: { value: ProblemUrgency; label: string; description: string }[] = [
  { value: "asap", label: "Lo antes posible", description: "Quieres empezar a buscar una solución pronto." },
  { value: "this-month", label: "Durante este mes", description: "Puedes coordinar el siguiente paso en las próximas semanas." },
  { value: "next-months", label: "En los próximos meses", description: "Estás explorando opciones sin una fecha cercana." },
  { value: "no-rush", label: "Sin urgencia", description: "Prefieres encontrar el enfoque adecuado con calma." },
];

type DraftBudgetType = "fixed" | "range" | "unknown" | "";

type ProblemDraft = {
  title: string;
  currentSituation: string;
  desiredOutcome: string;
  impact: string;
  constraints: string;
  hashtags: string[];
  budgetType: DraftBudgetType;
  fixedAmount: string;
  minimumBudget: string;
  maximumBudget: string;
  urgency: ProblemUrgency | "";
  attachments: string[];
};

function initialDraft(title: string): ProblemDraft {
  return {
    title,
    currentSituation: "",
    desiredOutcome: "",
    impact: "",
    constraints: "",
    hashtags: [],
    budgetType: "",
    fixedAmount: "",
    minimumBudget: "",
    maximumBudget: "",
    urgency: "",
    attachments: [],
  };
}

const fieldClass =
  "mt-2 min-h-12 w-full rounded-xl border border-border bg-white px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-accent/50 focus:ring-4 focus:ring-accent/10";
const textareaClass = `${fieldClass} min-h-36 resize-y py-3.5 leading-6`;
const fieldLabelClass = "block text-sm font-semibold text-foreground";

function budgetFromDraft(draft: ProblemDraft): ProblemBudget {
  if (draft.budgetType === "fixed") {
    return { type: "fixed", amount: Number(draft.fixedAmount), currency: "USD" };
  }
  if (draft.budgetType === "range") {
    return {
      type: "range",
      min: Number(draft.minimumBudget),
      max: Number(draft.maximumBudget),
      currency: "USD",
    };
  }
  return { type: "unknown" };
}

function urgencyLabel(value: ProblemUrgency | ""): string {
  return urgencyOptions.find((option) => option.value === value)?.label ?? "Sin urgencia";
}

function SummaryRow({
  label,
  value,
  step,
  onEdit,
}: {
  label: string;
  value: string;
  step: number;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-foreground">{value || "No especificado"}</p>
      </div>
      <button
        className="inline-flex min-h-9 w-fit shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-accent hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => onEdit(step)}
        type="button"
      >
        <PencilLine aria-hidden="true" className="size-3.5" />
        Editar
      </button>
    </div>
  );
}

export function ProblemWizard({ initialTitle = "" }: { initialTitle?: string }) {
  const [draft, setDraft] = useState<ProblemDraft>(() => initialDraft(initialTitle));
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);
  const stepTitleRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const progress = Math.round((step / stepNames.length) * 100);

  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      stepTitleRef.current?.focus();
    }
  }, [step]);

  const setField = <K extends keyof ProblemDraft>(key: K, value: ProblemDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  };

  function validateCurrentStep(): string {
    if (step === 1 && !draft.title.trim()) return "Escribe un título que describa el problema.";
    if (step === 2 && !draft.currentSituation.trim()) return "Cuéntanos qué sucede actualmente.";
    if (step === 3 && !draft.desiredOutcome.trim()) return "Describe qué resultado te gustaría conseguir.";
    if (step === 4 && !draft.impact.trim()) return "Indica a quién o qué afecta este problema.";
    if (step === 7) {
      if (!draft.budgetType) return "Elige una opción de presupuesto para continuar.";
      if (draft.budgetType === "fixed") {
        const amount = Number(draft.fixedAmount);
        if (!Number.isFinite(amount) || amount <= 0) return "Ingresa un presupuesto mayor que cero.";
      }
      if (draft.budgetType === "range") {
        const min = Number(draft.minimumBudget);
        const max = Number(draft.maximumBudget);
        if (!validateBudgetRange(min, max)) return "Revisa el rango: ambos montos deben ser válidos y el mínimo no puede superar el máximo.";
      }
    }
    if (step === 8 && !draft.urgency) return "Selecciona cuándo te gustaría comenzar.";
    return "";
  }

  function continueFlow() {
    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setError("");
    setStep((current) => Math.min(stepNames.length, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setError("");
    setStep((current) => Math.max(1, current - 1));
  }

  function selectStep(nextStep: number) {
    if (nextStep < step) {
      setError("");
      setStep(nextStep);
    }
  }

  function updateFiles(event: ChangeEvent<HTMLInputElement>) {
    const names = Array.from(event.target.files ?? []).map((file) => file.name);
    setField("attachments", names);
  }

  if (published) {
    return (
      <section className="mx-auto grid min-h-[60vh] w-full max-w-2xl place-items-center px-5 py-12 text-center">
        <div>
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent">
            <CheckCircle2 aria-hidden="true" className="size-8" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-accent">Borrador completado</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Tu problema está listo para compartir.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
            Esta demostración no publica ni guarda el contenido. Cuando exista un servicio de publicación, podrás enviarlo para recibir propuestas.
          </p>
          <div className="mt-7 rounded-card border border-border bg-white p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Tu problema</p>
            <p className="mt-2 text-base font-semibold text-foreground">{draft.title}</p>
          </div>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/problems" variant="outline">
              Explorar problemas
            </ButtonLink>
            <ButtonLink href="/">Volver al inicio</ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pb-16 pt-8 sm:px-7 sm:pb-20 sm:pt-10 lg:px-10">
      <div className="mb-8 max-w-2xl sm:mb-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-accent">Para empresas</p>
        <h1 className="text-balance text-3xl font-semibold leading-tight tracking-[-0.05em] text-foreground sm:text-4xl">
          Empecemos por entender el problema.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          Responde unas preguntas sencillas. No necesitas conocer la tecnología ni decidir de antemano cómo resolverlo.
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-28">
          <div className="rounded-card border border-border bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Tu publicación</p>
              <span className="text-xs font-semibold text-accent">{step} / 10</span>
            </div>
            <div
              aria-label={`Progreso: ${progress}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              className="h-1.5 overflow-hidden rounded-full bg-surface"
              role="progressbar"
            >
              <span className="block h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <ol aria-label="Pasos de publicación" className="mt-5 hidden space-y-1 lg:block">
              {stepNames.map((name, index) => {
                const itemStep = index + 1;
                const completed = itemStep < step;
                const current = itemStep === step;
                return (
                  <li key={name}>
                    <button
                      aria-current={current ? "step" : undefined}
                      className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 text-left text-xs transition-colors ${current ? "bg-accent-soft font-semibold text-accent" : completed ? "text-foreground hover:bg-surface" : "cursor-default text-muted-foreground/75"}`}
                      disabled={!completed && !current}
                      onClick={() => selectStep(itemStep)}
                      type="button"
                    >
                      <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${current ? "bg-accent text-white" : completed ? "bg-surface text-foreground" : "border border-border text-muted-foreground"}`}>
                        {completed ? <Check aria-hidden="true" className="size-3.5" /> : itemStep}
                      </span>
                      {name}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-xs leading-5 text-muted-foreground lg:hidden">
              Paso {step}: {stepNames[step - 1]}
            </p>
          </div>
          <p className="mt-3 px-1 text-xs leading-5 text-muted-foreground">
            Puedes volver a los pasos anteriores y cambiar tus respuestas.
          </p>
        </aside>

        <section aria-labelledby="wizard-step-title" className="min-w-0 rounded-card border border-border bg-white p-5 sm:p-8 lg:p-10">
          <div className="mb-7 border-b border-border pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Paso {step} de 10</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-3xl" id="wizard-step-title" ref={stepTitleRef} tabIndex={-1}>
              {step === 1 && "¿Qué problema quieres resolver?"}
              {step === 2 && "¿Qué está sucediendo actualmente?"}
              {step === 3 && "¿Qué te gustaría conseguir?"}
              {step === 4 && "¿A quién o qué afecta este problema?"}
              {step === 5 && "¿Hay alguna restricción o condición importante?"}
              {step === 6 && "¿Con qué áreas está relacionado el problema?"}
              {step === 7 && "¿Tienes un presupuesto aproximado?"}
              {step === 8 && "¿Cuándo necesitas comenzar a resolverlo?"}
              {step === 9 && "¿Hay algo que ayude a entender el contexto?"}
              {step === 10 && "Revisa tu publicación"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {step === 1 && "Descríbelo como lo explicarías a otra persona. No necesitas saber la solución."}
              {step === 2 && "Cuéntanos cómo se vive hoy esta situación. Los detalles del proceso nos ayudan a entender el contexto."}
              {step === 3 && "Piensa en el cambio que te gustaría notar, sin definir todavía cómo conseguirlo."}
              {step === 4 && "Puede ser un equipo, un proceso, tus clientes o cualquier parte de la organización."}
              {step === 5 && "Por ejemplo: plazos, herramientas que ya utilizan, regulaciones o procesos internos. Es opcional."}
              {step === 6 && "Elige las áreas que describen el contexto, no las tecnologías que podrían utilizarse."}
              {step === 7 && "Una referencia aproximada ayuda a entender el alcance. Si aún no lo sabes, puedes indicarlo."}
              {step === 8 && "No hace falta definir una fecha exacta; elige el ritmo que mejor describa tu situación."}
              {step === 9 && "Puedes seleccionar archivos para tenerlos a mano. En esta versión no se subirán ni guardarán."}
              {step === 10 && "Comprueba que el problema se entiende como una necesidad, sin imponer una solución técnica."}
            </p>
          </div>

          {step === 1 ? (
            <div>
              <label className={fieldLabelClass} htmlFor="problem-title">Título del problema <span className="font-normal text-muted-foreground">(obligatorio)</span></label>
              <input autoComplete="off" autoFocus className={fieldClass} id="problem-title" maxLength={110} onChange={(event) => setField("title", event.target.value)} placeholder="Ej.: Nos toma demasiado tiempo preparar los pedidos" value={draft.title} />
              <p className="mt-2 text-xs text-muted-foreground">Escribe qué está ocurriendo, no el nombre de una tecnología o un puesto.</p>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <label className={fieldLabelClass} htmlFor="current-situation">Situación actual <span className="font-normal text-muted-foreground">(obligatorio)</span></label>
              <textarea autoFocus className={textareaClass} id="current-situation" maxLength={1800} onChange={(event) => setField("currentSituation", event.target.value)} placeholder="¿Qué hacen hoy? ¿En qué momento aparece la dificultad?" value={draft.currentSituation} />
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <label className={fieldLabelClass} htmlFor="desired-outcome">Resultado que buscas <span className="font-normal text-muted-foreground">(obligatorio)</span></label>
              <textarea autoFocus className={textareaClass} id="desired-outcome" maxLength={1500} onChange={(event) => setField("desiredOutcome", event.target.value)} placeholder="Ej.: Reducir el tiempo que mi equipo dedica a esta tarea." value={draft.desiredOutcome} />
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <label className={fieldLabelClass} htmlFor="problem-impact">Personas, equipos o procesos afectados <span className="font-normal text-muted-foreground">(obligatorio)</span></label>
              <textarea autoFocus className={textareaClass} id="problem-impact" maxLength={1200} onChange={(event) => setField("impact", event.target.value)} placeholder="¿Quiénes viven este problema o dependen de este proceso?" value={draft.impact} />
            </div>
          ) : null}

          {step === 5 ? (
            <div>
              <label className={fieldLabelClass} htmlFor="problem-constraints">Restricciones o condiciones <span className="font-normal text-muted-foreground">(opcional)</span></label>
              <textarea autoFocus className={textareaClass} id="problem-constraints" maxLength={1200} onChange={(event) => setField("constraints", event.target.value)} placeholder="Un plazo, proceso existente o condición que sea importante respetar." value={draft.constraints} />
              <p className="mt-2 text-xs text-muted-foreground">No incluyas tecnologías como requisito si todavía no sabes si son necesarias.</p>
            </div>
          ) : null}

          {step === 6 ? (
            <fieldset>
              <legend className={fieldLabelClass}>Áreas relacionadas <span className="font-normal text-muted-foreground">(puedes elegir varias)</span></legend>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PROBLEM_HASHTAGS.map((tag) => {
                  const selected = draft.hashtags.includes(tag);
                  return (
                    <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm transition-colors ${selected ? "border-accent/35 bg-accent-soft/70 text-accent" : "border-border bg-white text-muted-foreground hover:bg-surface"}`} key={tag}>
                      <input checked={selected} className="size-4 accent-accent focus-visible:ring-2 focus-visible:ring-accent" onChange={() => setField("hashtags", selected ? draft.hashtags.filter((item) => item !== tag) : [...draft.hashtags, tag])} type="checkbox" />
                      <span className="text-accent">#</span>{tag}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {step === 7 ? (
            <fieldset>
              <legend className={fieldLabelClass}>Elige una opción para el presupuesto</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {([
                  ["fixed", "Precio fijo", "Tienes un monto definido."],
                  ["range", "Rango", "Puedes compartir un mínimo y máximo."],
                  ["unknown", "No estoy seguro", "Prefieres recibir orientación."],
                ] as const).map(([value, label, description]) => (
                  <label className={`flex min-h-[110px] cursor-pointer flex-col rounded-2xl border p-4 transition-colors ${draft.budgetType === value ? "border-accent/45 bg-accent-soft/60" : "border-border hover:bg-surface"}`} key={value}>
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                      <input checked={draft.budgetType === value} className="size-4 accent-accent focus-visible:ring-2 focus-visible:ring-accent" name="budget-type" onChange={() => setField("budgetType", value)} type="radio" value={value} />
                      {label}
                    </span>
                    <span className="mt-2 pl-[26px] text-xs leading-5 text-muted-foreground">{description}</span>
                  </label>
                ))}
              </div>
              {draft.budgetType === "fixed" ? (
                <div className="mt-5 max-w-sm">
                  <label className={fieldLabelClass} htmlFor="fixed-budget">Monto fijo (USD)</label>
                  <div className="relative">
                    <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input autoFocus className={`${fieldClass} pl-8`} id="fixed-budget" min="1" onChange={(event) => setField("fixedAmount", event.target.value)} placeholder="0" step="1" type="number" value={draft.fixedAmount} />
                  </div>
                </div>
              ) : null}
              {draft.budgetType === "range" ? (
                <div className="mt-5 grid max-w-xl gap-4 sm:grid-cols-2">
                  <div>
                    <label className={fieldLabelClass} htmlFor="minimum-budget">Mínimo (USD)</label>
                    <div className="relative">
                      <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <input autoFocus className={`${fieldClass} pl-8`} id="minimum-budget" min="0" onChange={(event) => setField("minimumBudget", event.target.value)} placeholder="0" step="1" type="number" value={draft.minimumBudget} />
                    </div>
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="maximum-budget">Máximo (USD)</label>
                    <div className="relative">
                      <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <input className={`${fieldClass} pl-8`} id="maximum-budget" min="0" onChange={(event) => setField("maximumBudget", event.target.value)} placeholder="0" step="1" type="number" value={draft.maximumBudget} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">El máximo debe ser igual o mayor que el mínimo.</p>
                </div>
              ) : null}
            </fieldset>
          ) : null}

          {step === 8 ? (
            <fieldset>
              <legend className={fieldLabelClass}>¿Cuándo te gustaría empezar?</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {urgencyOptions.map((option) => (
                  <label className={`flex min-h-[88px] cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${draft.urgency === option.value ? "border-accent/45 bg-accent-soft/60" : "border-border hover:bg-surface"}`} key={option.value}>
                    <input checked={draft.urgency === option.value} className="mt-0.5 size-4 shrink-0 accent-accent focus-visible:ring-2 focus-visible:ring-accent" name="urgency" onChange={() => setField("urgency", option.value)} type="radio" value={option.value} />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {step === 9 ? (
            <div>
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-[#fbfafc] p-6 text-center transition-colors hover:border-accent/40 hover:bg-accent-soft/30 focus-within:ring-2 focus-within:ring-accent">
                <span className="grid size-11 place-items-center rounded-xl bg-white text-accent shadow-sm">
                  <Upload aria-hidden="true" className="size-5" />
                </span>
                <span className="mt-3 text-sm font-semibold text-foreground">Selecciona archivos de referencia</span>
                <span className="mt-1 text-xs text-muted-foreground">Opcional. No se subirán en esta versión.</span>
                <input className="sr-only" multiple onChange={updateFiles} type="file" />
              </label>
              {draft.attachments.length ? (
                <ul aria-label="Archivos seleccionados" className="mt-4 space-y-2">
                  {draft.attachments.map((name, index) => (
                    <li className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm text-foreground" key={`${name}-${index}`}>
                      <FilePlus2 aria-hidden="true" className="size-4 shrink-0 text-accent" />
                      <span className="truncate">{name}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step === 10 ? (
            <div>
              <div className="mb-5 flex items-start gap-3 rounded-xl bg-surface p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-accent">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                </span>
                <p className="text-sm leading-6 text-muted-foreground">
                  El resumen ayuda a freelancers a comprender la situación y proponer su propio enfoque.
                </p>
              </div>
              <div className="divide-y divide-border rounded-2xl border border-border px-4 sm:px-5">
                <SummaryRow label="Problema" value={draft.title} step={1} onEdit={selectStep} />
                <SummaryRow label="Situación actual" value={draft.currentSituation} step={2} onEdit={selectStep} />
                <SummaryRow label="Resultado esperado" value={draft.desiredOutcome} step={3} onEdit={selectStep} />
                <SummaryRow label="A quién afecta" value={draft.impact} step={4} onEdit={selectStep} />
                <SummaryRow label="Restricciones" value={draft.constraints || "Opcional, no especificado"} step={5} onEdit={selectStep} />
                <div className="flex flex-col gap-2 border-b border-border py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Áreas relacionadas</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {draft.hashtags.length ? draft.hashtags.map((tag) => <Hashtag key={tag} tag={tag} />) : <span className="text-sm text-foreground">No especificadas</span>}
                    </div>
                  </div>
                  <button className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-accent hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => selectStep(6)} type="button">
                    <PencilLine aria-hidden="true" className="size-3.5" />Editar
                  </button>
                </div>
                <SummaryRow label="Presupuesto" value={draft.budgetType ? formatBudget(budgetFromDraft(draft)) : "No especificado"} step={7} onEdit={selectStep} />
                <SummaryRow label="Cuándo comenzar" value={urgencyLabel(draft.urgency)} step={8} onEdit={selectStep} />
                <SummaryRow label="Archivos" value={draft.attachments.length ? draft.attachments.join(", ") : "Ninguno"} step={9} onEdit={selectStep} />
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Esta publicación es una demostración y no se enviará a un servidor.
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="mt-5 rounded-xl border border-accent/25 bg-accent-soft/65 px-4 py-3 text-sm font-medium text-accent" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
            <Button disabled={step === 1} onClick={goBack} variant="outline">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Anterior
            </Button>
            {step < stepNames.length ? (
              <Button onClick={continueFlow}>
                Continuar
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            ) : (
              <Button onClick={() => setPublished(true)}>
                Publicar problema
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
