"use client";

import { CircleUserRound, Compass, Heart, Layers3, MessagesSquare } from "lucide-react";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import { DeckExperience } from "@/components/swipe/swipe-deck";
import type { StoredProblemInteraction } from "@/lib/interaction-service";
import type { PublicProblem } from "@/lib/problem-domain";
import type { FreelancerProblemInteraction } from "@/types/domain";

const samples: PublicProblem[] = [
  {
    id: "muestra-1", title: "Queremos ordenar la atención de nuestros clientes",
    description: "Nuestro equipo recibe solicitudes por varios canales y hoy es difícil saber cuáles ya fueron atendidas. Buscamos una forma clara de organizar el seguimiento, reducir las tareas repetitivas y dar una mejor respuesta a cada cliente.",
    companyName: "Empresa de muestra", industrySnapshot: "Servicios", impacts: ["time", "customers"],
    objectives: ["organize", "customer_service", "save_time", "reduce_errors"], successCriteria: "Tener visibilidad del estado de cada solicitud y reducir el tiempo de respuesta del equipo.",
    budgetChoice: "3000_5000", currency: "PEN", deadlineChoice: "within_one_month", publishedAt: "2026-10-20T12:00:00Z",
  },
  {
    id: "muestra-2", title: "Necesitamos entender mejor nuestro proceso de ventas",
    description: "Registramos oportunidades en archivos separados y queremos identificar qué información necesita el equipo para dar seguimiento de forma consistente.",
    companyName: null, industrySnapshot: "Comercio", impacts: ["errors", "time"], objectives: ["organize", "increase_sales"],
    successCriteria: "Contar con un proceso compartido y fácil de mantener.", budgetChoice: "1000_3000", currency: "USD", deadlineChoice: "flexible", publishedAt: "2026-10-19T12:00:00Z",
  },
  {
    id: "muestra-3", title: "Reducir el trabajo manual en nuestros reportes",
    description: "Cada semana reunimos información desde varias fuentes para preparar reportes internos. Queremos reducir el tiempo dedicado a esa tarea y minimizar errores.",
    companyName: null, industrySnapshot: "Operaciones", impacts: ["repetitive"], objectives: ["automate", "reduce_errors"],
    successCriteria: "Un proceso más claro y menos tiempo de preparación.", budgetChoice: "unknown", currency: "PEN", deadlineChoice: "one_to_three_months", publishedAt: "2026-10-18T12:00:00Z",
  },
];

async function saveSample(_id: string, state: StoredProblemInteraction | null): Promise<FreelancerProblemInteraction> {
  return state ?? "unseen";
}

const navigation = [
  { label: "Swipe", icon: Layers3 }, { label: "Explorar", icon: Compass }, { label: "Likes", icon: Heart },
  { label: "Chats", icon: MessagesSquare }, { label: "Perfil", icon: CircleUserRound },
];

export function SwipePreview() {
  return <div className="private-app-shell min-h-dvh bg-background text-foreground">
    <header className="border-b border-border"><div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6"><MatchWorkLogoLockup className="w-[6.5rem] sm:w-32" size="compact" variant="reversed" /><span className="rounded-full border border-warning/40 bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">Datos de muestra · revisión visual</span></div></header>
    <div className="grid md:grid-cols-[5rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside aria-label="Navegación de muestra" className="hidden border-r border-border px-3 py-7 md:block lg:px-5"><div className="grid gap-2">{navigation.map(({ label, icon: Icon }, index) => <div className={`flex min-h-11 items-center justify-center gap-3 rounded-xl px-3 text-sm lg:justify-start ${index === 0 ? "bg-accent/15 text-foreground" : "text-muted-foreground"}`} key={label}><Icon aria-hidden="true" className="size-5" /><span className="sr-only lg:not-sr-only">{label}</span></div>)}</div></aside>
      <DeckExperience initialInteractions={{}} problems={samples} saveInteraction={saveSample} tutorialStorageKey="matchwork.swipe-tutorial.preview.v1" />
    </div>
    <div aria-label="Navegación de muestra" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden"><div className="mx-auto flex max-w-lg">{navigation.map(({ label, icon: Icon }, index) => <div className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[0.625rem] ${index === 0 ? "bg-accent/15 text-foreground" : "text-muted-foreground"}`} key={label}><Icon aria-hidden="true" className="size-5" />{label}</div>)}</div></div>
  </div>;
}
