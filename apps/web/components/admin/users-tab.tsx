"use client";

import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminApi } from "@/components/admin/admin-api";
import { ReasonSheet } from "@/components/admin/reason-sheet";
import { Segmented } from "@/components/admin/segmented";
import { usePagedList } from "@/components/admin/use-paged-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatAdminDate } from "@/lib/admin-panel";
import type { AdminUserRow } from "@/types/database";

type Role = "all" | "company" | "freelancer";
type Suspension = "all" | "active" | "suspended";
const rowKey = (row: AdminUserRow) => row.user_id;
const roleLabel = { company: "Empresa", freelancer: "Freelancer" } as const;

export function UsersTab({ api }: { api: AdminApi }) {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role>("all");
  const [suspension, setSuspension] = useState<Suspension>("all");
  const [target, setTarget] = useState<AdminUserRow | null>(null);
  useEffect(() => { const id = window.setTimeout(() => setSearch(searchInput), 300); return () => window.clearTimeout(id); }, [searchInput]);
  const list = usePagedList((cursor) => api.listUsers({ search, role, suspension, cursor }), rowKey, [search, role, suspension]);

  async function confirm(user: AdminUserRow, reason: string) {
    const suspended = user.suspended_at === null;
    await api.setUserSuspended(user.user_id, suspended, reason);
    setTarget(null);
    toast({ title: suspended ? "Usuario suspendido" : "Usuario reactivado", description: user.full_name, tone: suspended ? "warning" : "success" });
    void list.reload();
  }
  const suspending = target !== null && target.suspended_at === null;

  return (
    <div>
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground" htmlFor="admin-user-search">Buscar por nombre o correo</label>
          <input autoComplete="off" className="mt-2 min-h-11 w-full max-w-md rounded-xl border border-border bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" id="admin-user-search" maxLength={100} onChange={(event) => setSearchInput(event.target.value)} type="search" value={searchInput} />
        </div>
        <Segmented label="Rol" onChange={setRole} options={[{ id: "all", label: "Todos" }, { id: "company", label: "Empresas" }, { id: "freelancer", label: "Freelancers" }]} value={role} />
        <Segmented label="Estado de la cuenta" onChange={setSuspension} options={[{ id: "all", label: "Todos" }, { id: "active", label: "Activos" }, { id: "suspended", label: "Suspendidos" }]} value={suspension} />
      </div>
      <div className="mt-5" aria-busy={list.status === "loading"}>
        {list.status === "loading" ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton className="h-16 w-full rounded-2xl" key={i} />)}</div> : null}
        {list.status === "error" ? <div className="rounded-2xl border border-border bg-surface p-5" role="alert"><p className="text-sm">{list.error}</p><Button className="mt-3" onClick={() => void list.reload()} variant="outline">Reintentar</Button></div> : null}
        {list.status === "ready" && list.items.length === 0 ? <EmptyState icon={Users} title="No hay usuarios con estos filtros." description="Prueba con otra búsqueda o cambia los filtros." compact /> : null}
        {list.status === "ready" && list.items.length > 0 ? (
          <>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {list.items.map((user) => (
                <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={user.user_id}>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground"><span className="truncate">{user.full_name}</span><Badge tone="neutral">{roleLabel[user.role]}</Badge>{user.suspended_at ? <Badge tone="warning">Suspendido</Badge> : <Badge tone="success">Activo</Badge>}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{user.email ?? "Sin correo"} · alta {formatAdminDate(user.created_at)}</p>
                    {user.suspension_reason ? <p className="mt-1 text-sm text-muted-foreground">Motivo: {user.suspension_reason}</p> : null}
                  </div>
                  <Button onClick={() => setTarget(user)} variant="outline">{user.suspended_at ? "Reactivar" : "Suspender"}</Button>
                </li>
              ))}
            </ul>
            {list.hasMore ? <div className="mt-4 flex justify-center"><Button disabled={list.loadingMore} onClick={() => void list.loadMore()} variant="outline">{list.loadingMore ? "Cargando…" : "Cargar más"}</Button></div> : null}
          </>
        ) : null}
      </div>
      <ReasonSheet
        confirmLabel={suspending ? "Suspender usuario" : "Reactivar usuario"}
        description={target ? (suspending ? `${target.full_name} no podrá publicar, proponer ni chatear, y verá el motivo en su cuenta.` : `${target.full_name} podrá volver a usar MatchWork.`) : ""}
        onClose={() => setTarget(null)}
        onConfirm={(reason) => target ? confirm(target, reason) : Promise.resolve()}
        open={target !== null}
        title={suspending ? "Suspender usuario" : "Reactivar usuario"}
      />
    </div>
  );
}
