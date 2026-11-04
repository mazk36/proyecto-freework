"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { CompanyTrustChip } from "@/components/ui/company-trust-chip";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { listOpenProblemsPage, PROBLEM_PAGE_SIZE, budgetLabel, deadlineLabel, objectiveLabels, impactLabels } from "@/lib/problem-service";
import type { PublicProblem } from "@/lib/problem-domain";

export function OpenProblemFeed() {
  const { user } = useAuth();
  const router = useRouter();
  const isCompany = user?.role === "company";
  // Explorar talento aún no existe: una empresa que llega aquí va a su bandeja de propuestas en vez de a una pantalla vacía.
  useEffect(() => { if (isCompany) router.replace("/app/propuestas/"); }, [isCompany, router]);
  const [problems, setProblems] = useState<PublicProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "freelancer") return;
    let active = true;
    void listOpenProblemsPage({ excludeInteracted: false }).then((items) => {
      if (!active) return;
      setProblems(items);
      setHasMore(items.length >= PROBLEM_PAGE_SIZE);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "No pudimos cargar los problemas disponibles.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  async function loadMore() {
    const last = problems.at(-1);
    if (!last?.publishedAt || loadingMore) return;
    setLoadingMore(true);
    setMoreError("");
    try {
      const page = await listOpenProblemsPage({ excludeInteracted: false, before: { publishedAt: last.publishedAt, id: last.id } });
      setProblems((current) => { const known = new Set(current.map((problem) => problem.id)); return [...current, ...page.filter((problem) => !known.has(problem.id))]; });
      setHasMore(page.length >= PROBLEM_PAGE_SIZE);
    } catch {
      setMoreError("No pudimos cargar más problemas. Inténtalo de nuevo.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (!user) return null;
  if (user.role === "company") return <p className="px-5 py-10 text-center text-sm text-muted-foreground" role="status">Abriendo tus propuestas…</p>;

  if (isLoading) return <div className="mx-auto max-w-5xl px-5 py-16 text-center text-sm text-muted-foreground" role="status">Cargando problemas disponibles…</div>;
  if (error) return <AppEmptyState tone="danger" action={<ButtonLink href="/app">Volver al inicio</ButtonLink>} description={error} title="No pudimos abrir Explorar." />;
  if (!problems.length) return <AppEmptyState description="Cuando una empresa publique un problema, aparecerá aquí con la información que haya decidido compartir." title="Aún no hay problemas disponibles." />;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Problemas disponibles</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Conoce el contexto del negocio y explora necesidades reales que buscan resolver.</p>
      </header>
      <section aria-label="Problemas publicados" className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {problems.map((problem) => (
          <article className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6" key={problem.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{problem.industrySnapshot || "Sector empresarial"}{problem.companyName ? ` · ${problem.companyName}` : " · Empresa reservada"}</p>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Abierto</span>
            </div>
            <CompanyTrustChip verified={problem.companyVerified} />
            <h2 className="mt-3 break-words text-lg font-semibold">{problem.title}</h2>
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
      {hasMore ? <div className="mt-8 flex flex-col items-center gap-2">
        <Button disabled={loadingMore} onClick={() => { void loadMore(); }} variant="outline">{loadingMore ? "Cargando…" : "Cargar más problemas"}</Button>
        {moreError ? <p className="text-sm text-danger" role="alert">{moreError}</p> : null}
      </div> : null}
    </div>
  );
}
