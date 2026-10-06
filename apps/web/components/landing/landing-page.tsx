import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  Compass,
  MessageSquareText,
  MoveRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { QuickProblemPrompt } from "@/components/landing/quick-problem-prompt";
import { ProblemGrid } from "@/components/problems/problem-grid";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Problem } from "@/types/domain";

const companySteps = [
  {
    title: "Describe tu problema",
    description: "Cuenta qué sucede y qué te gustaría que cambiara. No necesitas definir cómo hacerlo.",
  },
  {
    title: "Recibe diferentes soluciones",
    description: "Freelancers con distintas perspectivas analizan el contexto y proponen un camino.",
  },
  {
    title: "Elige la que mejor se adapte",
    description: "Compara enfoques, alcance, tiempo y precio antes de decidir cómo avanzar.",
  },
];

const freelancerSteps = [
  {
    title: "Encuentra un problema",
    description: "Explora necesidades reales por contexto, área y presupuesto.",
  },
  {
    title: "Propón tu solución",
    description: "Explica cómo abordarías la situación y qué resultado puedes entregar.",
  },
  {
    title: "Compite por valor, no por etiquetas",
    description: "Haz visible tu criterio y el valor de tu propuesta, no una lista de tecnologías.",
  },
];

function HowItWorksPanel({
  label,
  title,
  steps,
  accent,
}: {
  label: string;
  title: string;
  steps: typeof companySteps;
  accent: "purple" | "gray";
}) {
  return (
    <article className="rounded-card border border-border bg-white p-5 sm:p-7">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.12em] ${accent === "purple" ? "text-accent" : "text-muted-foreground"}`}>
            {label}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">{title}</h3>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${accent === "purple" ? "bg-accent-soft text-accent" : "bg-surface text-foreground"}`}>
          {accent === "purple" ? <CircleHelp aria-hidden="true" className="size-5" /> : <Compass aria-hidden="true" className="size-5" />}
        </span>
      </div>
      <ol className="space-y-0">
        {steps.map((step, index) => (
          <li className="relative flex gap-4 pb-6 last:pb-0" key={step.title}>
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-border" />
            ) : null}
            <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${accent === "purple" ? "bg-accent text-white" : "bg-surface text-foreground"}`}>
              0{index + 1}
            </span>
            <div className="pt-0.5">
              <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

function HeroDiagram() {
  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <div aria-hidden="true" className="absolute -right-3 -top-4 size-24 rounded-full border border-accent/15 sm:-right-7 sm:-top-7 sm:size-32" />
      <div aria-hidden="true" className="absolute -bottom-4 -left-2 size-16 rounded-full bg-accent-soft/80 sm:-bottom-7 sm:-left-5 sm:size-24" />
      <div className="relative rounded-[26px] border border-border bg-white p-4 shadow-[0_30px_70px_-48px_rgba(34,27,57,0.48)] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className="size-2 rounded-full bg-accent" />
            Una necesidad, distintas miradas
          </span>
          <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            EJEMPLO
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-[#fbfafc] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="grid size-7 place-items-center rounded-lg bg-white text-foreground shadow-sm">
              <CircleHelp aria-hidden="true" className="size-3.5" />
            </span>
            Problema de una empresa
          </div>
          <p className="mt-3 max-w-md text-pretty text-base font-semibold leading-6 tracking-[-0.02em] text-foreground sm:text-lg">
            “Cada visita a un cliente se convierte en horas de trabajo administrativo.”
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["ventas", "operaciones", "productividad"].map((tag) => (
              <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center py-3 text-accent">
          <MoveRight aria-hidden="true" className="size-5" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
              <span className="grid size-6 place-items-center rounded-lg bg-accent-soft">
                <Sparkles aria-hidden="true" className="size-3.5" />
              </span>
              Propuesta A
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">Simplificar el registro en terreno</p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Un flujo breve pensado para cerrar cada visita en el momento.</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <span className="grid size-6 place-items-center rounded-lg bg-surface">
                <ArrowDownRight aria-hidden="true" className="size-3.5" />
              </span>
              Propuesta B
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">Revisar el proceso del equipo</p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Acordar qué información importa y cuándo recopilarla.</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <Check aria-hidden="true" className="size-4 text-accent" />
          La empresa compara soluciones al mismo problema
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ recentProblems }: { recentProblems: Problem[] }) {
  return (
    <>
      <section className="overflow-hidden border-b border-border bg-white">
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-12 px-5 pb-16 pt-12 sm:px-7 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-10 lg:py-20">
          <div className="max-w-[640px]">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent" />
              Un marketplace para resolver problemas
            </p>
            <h1 className="text-balance text-[clamp(2.8rem,7vw,5.2rem)] font-semibold leading-[0.99] tracking-[-0.065em] text-foreground">
              Describe el problema.
              <br />
              Encuentra la <span className="text-accent">solución.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Las empresas explican qué necesitan resolver. Freelancers proponen maneras distintas de hacerlo, con el contexto y el resultado en el centro.
            </p>

            <div className="mt-8">
              <p className="mb-2.5 text-sm font-semibold text-foreground">
                ¿Qué problema quieres resolver?
              </p>
              <QuickProblemPrompt />
              <p className="mt-3 text-xs text-muted-foreground">
                No necesitas saber qué tecnología necesitas.
              </p>
            </div>

            <Link
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:border-accent/30 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              href="/problems"
            >
              <span className="grid size-7 place-items-center rounded-lg bg-surface text-accent">
                <Compass aria-hidden="true" className="size-4" />
              </span>
              Encuentra un problema que puedas resolver
              <ArrowRight aria-hidden="true" className="ml-1 size-4 text-muted-foreground" />
            </Link>
          </div>

          <HeroDiagram />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1320px] px-5 py-16 sm:px-7 sm:py-20 lg:px-10" id="como-funciona">
        <SectionHeading
          description="Un mismo problema puede tener más de una buena respuesta. El contexto abre la puerta a perspectivas diferentes."
          eyebrow="Cómo funciona"
          title="Empieza con lo que necesitas resolver."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <HowItWorksPanel accent="purple" label="Si eres empresa" steps={companySteps} title="Explica la necesidad" />
          <HowItWorksPanel accent="gray" label="Si eres freelancer" steps={freelancerSteps} title="Propón tu perspectiva" />
        </div>
      </section>

      <section className="border-y border-border bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-7 lg:px-10">
          <SectionHeading
            action={
              <ButtonLink href="/problems" variant="outline">
                Ver todos los problemas
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </ButtonLink>
            }
            description="Explora necesidades reales y descubre distintas formas de abordarlas."
            eyebrow="En contexto"
            title="Problemas recientes"
          />
          <ProblemGrid problems={recentProblems} />
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Ejemplos ficticios para mostrar la experiencia. Las propuestas no representan servicios disponibles.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1320px] px-5 py-16 sm:px-7 sm:py-20 lg:px-10">
        <div className="grid overflow-hidden rounded-[28px] border border-border bg-[#1d1c22] text-white lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-7 sm:p-10 lg:p-14">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#b8a7ff]">
              El punto de partida cambia
            </p>
            <h2 className="max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
              No necesitas saber qué tecnología necesitas.
              <br />
              <span className="text-[#c9bdff]">Solo qué problema quieres resolver.</span>
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
              Una necesidad puede explorarse desde distintos ángulos antes de decidir cuál es el siguiente paso.
            </p>
          </div>
          <div className="relative flex min-h-[230px] flex-col justify-center border-t border-white/10 bg-white/[0.03] p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
            <div className="mb-5 flex items-center gap-3 text-sm font-medium text-white/65">
              <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-[#c9bdff]">
                <MessageSquareText aria-hidden="true" className="size-4" />
              </span>
              Una necesidad clara
            </div>
            <div className="ml-4 border-l border-white/20 pl-7">
              <p className="mb-4 text-sm font-semibold text-white">Distintas propuestas</p>
              <div className="space-y-2.5">
                {["Entender qué frena el proceso", "Reducir pasos repetidos", "Acompañar al equipo"].map((idea) => (
                  <div className="flex items-center gap-2.5 text-sm text-white/70" key={idea}>
                    <span className="size-1.5 rounded-full bg-[#a994ff]" />
                    {idea}
                  </div>
                ))}
              </div>
            </div>
            <ArrowDownRight aria-hidden="true" className="absolute bottom-7 right-7 size-7 text-white/25" />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-white py-14 sm:py-16">
        <div className="mx-auto grid w-full max-w-[1320px] gap-6 px-5 sm:px-7 lg:grid-cols-2 lg:items-center lg:px-10">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-accent">El siguiente paso</p>
            <h2 className="max-w-xl text-balance text-3xl font-semibold leading-tight tracking-[-0.04em] text-foreground sm:text-4xl">
              Publica el problema. Deja que las soluciones compitan.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              O encuentra una situación donde tu experiencia pueda marcar la diferencia.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <ButtonLink href="/problems/new" size="lg">
              Publicar un problema
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink href="/problems" size="lg" variant="outline">
              Explorar problemas
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
