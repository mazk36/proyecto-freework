"use client";

import { ArrowUpRight, CalendarDays, CircleDollarSign } from "lucide-react";
import { useCanWrite } from "@/components/app/account-status";
import { CompanyTrustChip } from "@/components/ui/company-trust-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatProblemBudget, formatProblemDeadline, type PublicProblem } from "@/lib/problem-domain";
import { impactLabels, objectiveLabels } from "@/lib/problem-service";

export function DeckDetail({ problem, onPropose }: { problem: PublicProblem; onPropose: () => void }) {
  const canWrite = useCanWrite();
  const impacts = impactLabels(problem.impacts);
  const objectives = objectiveLabels(problem.objectives);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-lavender">El contexto completo</p>
        <h2 className="mt-3 break-words font-display text-xl font-semibold leading-snug sm:text-2xl">{problem.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{problem.industrySnapshot || "Sector empresarial"} · {problem.companyName || "Empresa reservada"}</p>
        <CompanyTrustChip verified={problem.companyVerified} />
      </div>
      <div className="grid gap-4 border-y border-border py-5 sm:grid-cols-2">
        <div className="flex gap-3"><CircleDollarSign aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-lavender" /><div><p className="text-xs text-muted-foreground">Presupuesto</p><p className="mt-1 font-mono text-sm font-medium">{formatProblemBudget(problem.budgetChoice, problem.currency)}</p></div></div>
        <div className="flex gap-3"><CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-lavender" /><div><p className="text-xs text-muted-foreground">Plazo</p><p className="mt-1 text-sm font-medium">{formatProblemDeadline(problem.deadlineChoice)}</p></div></div>
      </div>
      <section>
        <h3 className="font-display text-sm font-semibold">Sobre el problema</h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{problem.description || "La empresa aún no ha compartido una descripción."}</p>
      </section>
      <section>
        <h3 className="font-display text-sm font-semibold">Impactos actuales</h3>
        {impacts.length ? <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-6 text-muted-foreground">{impacts.map((impact) => <li key={impact}>{impact}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-muted-foreground">La empresa no ha indicado impactos específicos.</p>}
      </section>
      <section>
        <h3 className="font-display text-sm font-semibold">Qué busca lograr</h3>
        {objectives.length ? <div className="mt-3 flex flex-wrap gap-2">{objectives.map((objective) => <Badge key={objective}>{objective}</Badge>)}</div> : <p className="mt-3 text-sm leading-6 text-muted-foreground">La empresa no ha indicado objetivos específicos.</p>}
      </section>
      <section>
        <h3 className="font-display text-sm font-semibold">Criterios de éxito</h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{problem.successCriteria || "La empresa no ha compartido criterios de éxito."}</p>
      </section>
      <Button className="min-h-14 w-full" disabled={!canWrite} onClick={onPropose}>Proponer ahora <ArrowUpRight aria-hidden="true" className="size-4" /></Button>
    </div>
  );
}
