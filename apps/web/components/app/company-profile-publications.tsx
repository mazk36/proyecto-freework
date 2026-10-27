"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, FileText } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getMyCompanyProblems } from "@/lib/problem-service";
import type { CompanyProblem, ProblemStatus } from "@/lib/problem-domain";

const statusCopy: Record<ProblemStatus, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "bg-surface-raised text-muted-foreground" },
  open: { label: "Publicado", className: "bg-emerald-400/15 text-emerald-200" },
  paused: { label: "En pausa", className: "bg-amber-300/15 text-amber-100" },
  closed: { label: "Cerrado", className: "bg-surface-raised text-muted-foreground" },
};

export function CompanyProfilePublications() {
  const [problems, setProblems] = useState<CompanyProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getMyCompanyProblems().then((result) => {
      if (active) setProblems(result);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "No pudimos cargar tus publicaciones.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const counts = {
    open: problems.filter((problem) => problem.status === "open").length,
    draft: problems.filter((problem) => problem.status === "draft").length,
    paused: problems.filter((problem) => problem.status === "paused").length,
    closed: problems.filter((problem) => problem.status === "closed").length,
  };

  return (
    <section aria-labelledby="company-problems-title" className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-soft"><FileText aria-hidden="true" className="size-5" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-soft">Actividad empresarial</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight" id="company-problems-title">Publicaciones de la empresa</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Revisa publicaciones y borradores vinculados a tu cuenta.</p>
          </div>
        </div>
        <ButtonLink href="/app/problemas" variant="outline">Gestionar publicaciones</ButtonLink>
      </div>

      {isLoading ? <p className="mt-6 text-sm text-muted-foreground" role="status">Cargando tus publicaciones…</p> : null}
      {!isLoading && error ? <p className="mt-6 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200" role="alert">{error}</p> : null}
      {!isLoading && !error ? (
        <>
          <dl aria-label="Resumen de publicaciones" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatusCount label="Publicados" value={counts.open} />
            <StatusCount label="Borradores" value={counts.draft} />
            <StatusCount label="En pausa" value={counts.paused} />
            <StatusCount label="Cerrados" value={counts.closed} />
          </dl>
          {problems.length ? (
            <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
              {problems.slice(0, 4).map((problem) => {
                const status = statusCopy[problem.status];
                const href = problem.status === "draft"
                  ? `/app/problemas/nuevo/?id=${encodeURIComponent(problem.id)}`
                  : `/app/problemas/detalle/?id=${encodeURIComponent(problem.id)}`;
                return (
                  <li className="flex flex-wrap items-center gap-3 p-4" key={problem.id}>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                    <span className="min-w-0 flex-1 break-words text-sm font-medium">{problem.title || "Borrador sin título"}</span>
                    <Link className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-accent-soft transition hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href={href}>
                      {problem.status === "draft" ? "Continuar" : "Ver detalles"}<ArrowUpRight aria-hidden="true" className="size-4" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border px-5 py-7 text-center">
              <p className="text-sm font-medium">Aún no has creado publicaciones.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Cuando publiques o guardes un borrador, su estado aparecerá aquí.</p>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

function StatusCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
