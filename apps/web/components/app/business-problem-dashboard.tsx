"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { ButtonLink } from "@/components/ui/button";
import { getCompanyProfile, getMyCompanyProblems, budgetLabel } from "@/lib/problem-service";
import type { CompanyProblem, CompanyProfile } from "@/lib/problem-domain";

const statusCopy = {
  draft: { label: "Borrador", style: "bg-slate-100 text-slate-700" },
  open: { label: "Publicado", style: "bg-emerald-100 text-emerald-800" },
  paused: { label: "En pausa", style: "bg-amber-100 text-amber-900" },
  closed: { label: "Cerrado", style: "bg-slate-200 text-slate-700" },
} as const;

export function BusinessProblemDashboard() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<CompanyProblem[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProblems = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError("");
    try {
      if (user.role !== "company") throw new Error("Esta sección está disponible para cuentas de empresa.");
      const [savedProfile, savedProblems] = await Promise.all([getCompanyProfile(), getMyCompanyProblems()]);
      setProfile(savedProfile);
      setProblems(savedProblems);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar tus problemas.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadProblems(); }, [loadProblems]);

  if (isLoading) return <main className="mx-auto max-w-5xl px-5 py-16 text-center text-sm text-muted-foreground" role="status">Cargando tus publicaciones…</main>;
  if (error) {
    return <AppEmptyState action={<ButtonLink href="/app">Volver al inicio</ButtonLink>} description={error} title="No pudimos abrir esta sección." />;
  }

  const published = problems.filter((problem) => problem.status === "open").length;
  const drafts = problems.filter((problem) => problem.status === "draft").length;
  const paused = problems.filter((problem) => problem.status === "paused").length;
  const closed = problems.filter((problem) => problem.status === "closed").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{profile?.companyName || "Área empresarial"}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Mis problemas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Consulta tus borradores y publicaciones. Las propuestas aparecerán cuando se integre el módulo correspondiente.</p>
        </div>
        <ButtonLink href="/app/problemas/nuevo">Publicar un problema</ButtonLink>
      </header>

      <section aria-label="Resumen de mis problemas" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CountCard label="Publicados" value={published} />
        <CountCard label="Borradores" value={drafts} />
        <CountCard label="En pausa" value={paused} />
        <CountCard label="Cerrados" value={closed} />
      </section>

      {problems.length === 0 ? (
        <div className="mt-7 rounded-2xl border border-border bg-surface">
          <AppEmptyState action={<ButtonLink href="/app/problemas/nuevo">Publicar un problema</ButtonLink>} description="Describe una necesidad de tu negocio y guarda el avance como borrador cuando lo necesites." title="Aún no has publicado ningún problema." />
        </div>
      ) : (
        <section aria-label="Publicaciones de la empresa" className="mt-7 space-y-4">
          {problems.map((problem) => <ProblemCard key={problem.id} problem={problem} currency={profile ? countryCurrency(profile.countryCode) : "PEN"} />)}
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-semibold">Propuestas recibidas</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Todavía no hay un módulo conectado para recibir, comparar o elegir propuestas. No se muestran propuestas ni cifras hasta que existan registros reales.</p>
      </section>
    </main>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
}

function ProblemCard({ problem, currency }: { problem: CompanyProblem; currency: string }) {
  const status = statusCopy[problem.status];
  const displayDate = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(problem.publishedAt ?? problem.updatedAt));
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.style}`}>{status.label}</span>
            <span className="text-xs text-muted-foreground">{displayDate}</span>
          </div>
          <h2 className="mt-3 break-words text-lg font-semibold">{problem.title || "Borrador sin título"}</h2>
          <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{problem.description || "Aún no has añadido una descripción."}</p>
        </div>
        <p className="shrink-0 rounded-lg bg-background px-3 py-2 text-sm font-medium">{budgetLabel(problem.budgetChoice, currency)}</p>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {problem.status === "open" ? "Visible para freelancers" : problem.status === "paused" ? "No recibe nuevas propuestas" : problem.status === "draft" ? "Solo tú puedes ver este borrador" : "Publicación cerrada"}
        </p>
        <div className="flex flex-wrap gap-2">
          {problem.status === "draft" ? <Link className="inline-flex min-h-10 items-center rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover" href={`/app/problemas/nuevo/?id=${encodeURIComponent(problem.id)}`}>Continuar borrador</Link> : null}
          {problem.status !== "draft" ? <Link className="inline-flex min-h-10 items-center rounded-lg border border-border px-3.5 text-sm font-semibold hover:bg-background" href={`/app/problemas/detalle/?id=${encodeURIComponent(problem.id)}`}>Ver detalles</Link> : null}
        </div>
      </div>
    </article>
  );
}

function countryCurrency(countryCode: string): string {
  const currencies: Record<string, string> = { AR: "ARS", BR: "BRL", CL: "CLP", CO: "COP", ES: "EUR", MX: "MXN", PE: "PEN", US: "USD" };
  return currencies[countryCode] ?? "USD";
}
