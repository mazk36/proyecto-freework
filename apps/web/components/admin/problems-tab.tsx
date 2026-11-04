"use client";

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminApi } from "@/components/admin/admin-api";
import { ReasonSheet } from "@/components/admin/reason-sheet";
import { Segmented } from "@/components/admin/segmented";
import { usePagedList } from "@/components/admin/use-paged-list";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanyTrustChip } from "@/components/ui/company-trust-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatAdminDate } from "@/lib/admin-panel";
import { formatProblemBudget } from "@/lib/problem-domain";
import type { AdminProblemRow } from "@/types/database";

type Filter = "all" | "open" | "suspended" | "closed";
const rowKey = (row: AdminProblemRow) => row.problem_id;

export function ProblemsTab({ api }: { api: AdminApi }) {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("open");
  const [target, setTarget] = useState<AdminProblemRow | null>(null);
  useEffect(() => { const id = window.setTimeout(() => setSearch(searchInput), 300); return () => window.clearTimeout(id); }, [searchInput]);
  const list = usePagedList((cursor) => api.listProblems({ search, status: filter, cursor }), rowKey, [search, filter]);

  async function confirm(problem: AdminProblemRow, reason: string) {
    const suspended = problem.suspended_at === null;
    await api.setProblemSuspended(problem.problem_id, suspended, reason);
    setTarget(null);
    toast({ title: suspended ? "Problema suspendido" : "Problema reactivado", description: problem.title || "Sin título", tone: suspended ? "warning" : "success" });
    void list.reload();
  }
  const suspending = target !== null && target.suspended_at === null;

  return (
    <div>
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground" htmlFor="admin-problem-search">Buscar por título o empresa</label>
          <input autoComplete="off" className="mt-2 min-h-11 w-full max-w-md rounded-xl border border-border bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" id="admin-problem-search" maxLength={100} onChange={(event) => setSearchInput(event.target.value)} type="search" value={searchInput} />
        </div>
        <Segmented label="Estado del problema" onChange={setFilter} options={[{ id: "open", label: "Abiertos" }, { id: "suspended", label: "Suspendidos" }, { id: "closed", label: "Cerrados" }, { id: "all", label: "Todos" }]} value={filter} />
      </div>
      <div className="mt-5" aria-busy={list.status === "loading"}>
        {list.status === "loading" ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton className="h-20 w-full rounded-2xl" key={i} />)}</div> : null}
        {list.status === "error" ? <div className="rounded-2xl border border-border bg-surface p-5" role="alert"><p className="text-sm">{list.error}</p><Button className="mt-3" onClick={() => void list.reload()} variant="outline">Reintentar</Button></div> : null}
        {list.status === "ready" && list.items.length === 0 ? <EmptyState icon={FileText} title="No hay problemas con estos filtros." description="Prueba con otra búsqueda o cambia el estado." compact /> : null}
        {list.status === "ready" && list.items.length > 0 ? (
          <>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {list.items.map((problem) => (
                <li className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between" key={problem.problem_id}>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{problem.title || "Sin título"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>{problem.company_name ?? "Empresa reservada"}</span><CompanyTrustChip verified={problem.company_verified} /></div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{formatProblemBudget(problem.budget_choice, problem.currency)}</span>
                      <span>Publicado {formatAdminDate(problem.published_at)}</span>
                      <span>{problem.proposal_count} {problem.proposal_count === 1 ? "propuesta" : "propuestas"}</span>
                    </p>
                    {problem.suspension_reason ? <p className="mt-1 text-sm text-muted-foreground">Motivo: {problem.suspension_reason}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3"><StatusBadge status={problem.status} />{problem.suspended_at ? <Badge tone="warning">Suspendido</Badge> : null}<Button onClick={() => setTarget(problem)} variant="outline">{problem.suspended_at ? "Reactivar" : "Suspender"}</Button></div>
                </li>
              ))}
            </ul>
            {list.hasMore ? <div className="mt-4 flex justify-center"><Button disabled={list.loadingMore} onClick={() => void list.loadMore()} variant="outline">{list.loadingMore ? "Cargando…" : "Cargar más"}</Button></div> : null}
          </>
        ) : null}
      </div>
      <ReasonSheet
        confirmLabel={suspending ? "Suspender problema" : "Reactivar problema"}
        description={target ? (suspending ? "El problema saldrá del feed y de los contadores, y no recibirá propuestas nuevas." : "El problema volverá a mostrarse y a recibir propuestas.") : ""}
        onClose={() => setTarget(null)}
        onConfirm={(reason) => target ? confirm(target, reason) : Promise.resolve()}
        open={target !== null}
        title={suspending ? "Suspender problema" : "Reactivar problema"}
      />
    </div>
  );
}
