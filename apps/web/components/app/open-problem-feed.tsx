"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { ButtonLink } from "@/components/ui/button";
import { listOpenBusinessProblems, budgetLabel, deadlineLabel, objectiveLabels, impactLabels } from "@/lib/problem-service";
import type { PublicProblem } from "@/lib/problem-domain";

export function OpenProblemFeed() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<PublicProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    if (user.role !== "freelancer") {
      setError("La exploración de problemas está disponible para cuentas freelancer.");
      setIsLoading(false);
      return;
    }
    void listOpenBusinessProblems().then((items) => {
      if (active) setProblems(items);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "No pudimos cargar los problemas disponibles.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  if (isLoading) return <main className="mx-auto max-w-5xl px-5 py-16 text-center text-sm text-muted-foreground" role="status">Cargando problemas disponibles…</main>;
  if (error) return <AppEmptyState action={<ButtonLink href="/app">Volver al inicio</ButtonLink>} description={error} title="No pudimos abrir Explorar." />;
  if (!problems.length) return <AppEmptyState description="Cuando una empresa publique un problema, aparecerá aquí con la información que haya decidido compartir." title="Aún no hay problemas disponibles." />;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Problemas disponibles</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Conoce el contexto del negocio y explora necesidades reales que buscan resolver.</p>
      </header>
      <section aria-label="Problemas publicados" className="mt-7 grid gap-4 lg:grid-cols-2">
        {problems.map((problem) => (
          <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6" key={problem.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{problem.industrySnapshot || "Sector empresarial"}{problem.companyName ? ` · ${problem.companyName}` : " · Empresa reservada"}</p>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Abierto</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold">{problem.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{problem.description}</p>
            {problem.impacts.length ? <p className="mt-4 text-xs leading-5 text-muted-foreground">Impacto: {impactLabels(problem.impacts).join(", ")}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {objectiveLabels(problem.objectives).map((objective) => <span className="rounded-full bg-background px-2.5 py-1 text-xs" key={objective}>{objective}</span>)}
            </div>
            <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-border pt-4 text-sm">
              <span className="font-semibold">{budgetLabel(problem.budgetChoice, problem.currency)}</span>
              <span className="text-muted-foreground">Plazo: {deadlineLabel(problem.deadlineChoice)}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
