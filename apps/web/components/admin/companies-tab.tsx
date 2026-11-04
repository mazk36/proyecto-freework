"use client";

import { Check, Copy, ExternalLink, X } from "lucide-react";
import { useCallback, useState } from "react";
import type { AdminApi } from "@/components/admin/admin-api";
import { ReasonSheet } from "@/components/admin/reason-sheet";
import { Segmented } from "@/components/admin/segmented";
import { usePagedList } from "@/components/admin/use-paged-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { COMPANY_FILTERS, formatRelativeDate, isStaleVerificationError, REJECTION_PRESETS, removeWithRestore, type CompanyFilter } from "@/lib/admin-panel";
import type { VerificationRequestRow } from "@/types/database";
import { Building2 } from "lucide-react";

const statusBadge = { pending: { tone: "warning", label: "Pendiente" }, verified: { tone: "success", label: "Verificada" }, rejected: { tone: "danger", label: "Rechazada" } } as const;
const rowKey = (row: VerificationRequestRow) => row.company_user_id;

function contactOf(row: VerificationRequestRow): string {
  return [row.website_url, row.corporate_email].filter(Boolean).join(" · ") || "—";
}

export function CompaniesTab({ api, filter, onFilterChange, onChanged }: { api: AdminApi; filter: CompanyFilter; onFilterChange: (filter: CompanyFilter) => void; onChanged: () => void }) {
  const { toast } = useToast();
  const list = usePagedList((cursor) => api.listVerificationRequests({ status: filter, cursor }), rowKey, [filter]);
  const [rejecting, setRejecting] = useState<VerificationRequestRow | null>(null);
  const [now] = useState(() => new Date());

  const applyStatus = useCallback((id: string, status: VerificationRequestRow["status"]) => {
    list.setItems((items) => filter === "all" ? items.map((item) => item.company_user_id === id ? { ...item, status } : item) : items.filter((item) => item.company_user_id !== id));
  }, [filter, list]);

  async function verify(row: VerificationRequestRow) {
    const removal = removeWithRestore(list.items, rowKey, row.company_user_id);
    applyStatus(row.company_user_id, "verified");
    try {
      await api.verify(row.company_user_id, row.updated_at);
      onChanged();
      toast({
        title: "Empresa verificada", description: row.company_name, tone: "success", durationMs: 8000, actionLabel: "Deshacer",
        onAction: () => { void api.undoVerification(row.company_user_id).then(() => { void list.reload(); onChanged(); }).catch((error: unknown) => toast({ title: "No se pudo deshacer", description: error instanceof Error ? error.message : undefined, tone: "danger" })); },
      });
    } catch (error) {
      list.setItems((items) => filter === "all" ? items.map((item) => item.company_user_id === row.company_user_id ? row : item) : removal.restore(items));
      toast({
        title: isStaleVerificationError(error) ? "La solicitud cambió" : "No se pudo verificar",
        description: error instanceof Error ? error.message : undefined, tone: "danger",
      });
      if (isStaleVerificationError(error)) void list.reload();
    }
  }

  async function reject(row: VerificationRequestRow, reason: string) {
    try {
      await api.reject(row.company_user_id, row.updated_at, reason);
    } catch (error) {
      if (isStaleVerificationError(error)) { setRejecting(null); void list.reload(); }
      throw error;
    }
    applyStatus(row.company_user_id, "rejected");
    setRejecting(null);
    onChanged();
    toast({ title: "Solicitud rechazada", description: row.company_name, tone: "neutral" });
  }

  function copy(value: string) {
    void navigator.clipboard?.writeText(value).then(() => toast({ title: "Copiado", tone: "success", durationMs: 2500 })).catch(() => toast({ title: "No se pudo copiar", tone: "danger" }));
  }

  return (
    <div>
      <Segmented label="Estado de la solicitud" onChange={onFilterChange} options={COMPANY_FILTERS} value={filter} />
      <div className="mt-5" aria-busy={list.status === "loading"}>
        {list.status === "loading" ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton className="h-24 w-full rounded-2xl" key={i} />)}</div> : null}
        {list.status === "error" ? (
          <div className="rounded-2xl border border-border bg-surface p-5" role="alert">
            <p className="text-sm text-foreground">{list.error}</p>
            <Button className="mt-3" onClick={() => void list.reload()} variant="outline">Reintentar</Button>
          </div>
        ) : null}
        {list.status === "ready" && list.items.length === 0 ? <EmptyState icon={Building2} title={filter === "pending" ? "No hay solicitudes pendientes." : "No hay solicitudes en este filtro."} description="Las solicitudes nuevas aparecerán aquí, de la más antigua a la más reciente." compact /> : null}
        {list.status === "ready" && list.items.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-border xl:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Solicitudes de verificación de empresas</caption>
                <thead className="bg-surface-raised text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>{["Empresa", "País", "Identificación fiscal", "Web o correo", "LinkedIn", "Enviada", "Estado", "Acciones"].map((h) => <th className="px-3 py-3 font-semibold" key={h} scope="col">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.items.map((row) => (
                    <tr className="align-top" key={row.company_user_id}>
                      <th className="px-3 py-3 font-medium text-foreground" scope="row"><span className="block">{row.company_name}</span><span className="block text-xs font-normal text-muted-foreground">{row.legal_name}</span></th>
                      <td className="px-3 py-3">{row.country_code}</td>
                      <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 font-mono text-xs">{row.tax_id}<button aria-label={`Copiar identificación fiscal de ${row.company_name}`} className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => copy(row.tax_id)} type="button"><Copy aria-hidden="true" className="size-4" /></button></span></td>
                      <td className="max-w-56 break-words px-3 py-3 text-muted-foreground">{contactOf(row)}</td>
                      <td className="px-3 py-3">{row.linkedin_url ? <a className="inline-flex min-h-11 items-center gap-1 text-foreground underline underline-offset-4" href={row.linkedin_url} rel="noopener noreferrer" target="_blank">Abrir<ExternalLink aria-hidden="true" className="size-3.5" /></a> : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{formatRelativeDate(row.submitted_at, now)}</td>
                      <td className="px-3 py-3"><Badge tone={statusBadge[row.status].tone}>{statusBadge[row.status].label}</Badge>{row.rejection_reason ? <p className="mt-1 max-w-48 text-xs text-muted-foreground">{row.rejection_reason}</p> : null}</td>
                      <td className="px-3 py-3">{row.status === "pending" ? <div className="flex gap-2"><Button className="whitespace-nowrap" onClick={() => void verify(row)} size="md"><Check aria-hidden="true" className="size-4" />Verificar</Button><Button className="whitespace-nowrap" onClick={() => setRejecting(row)} variant="outline"><X aria-hidden="true" className="size-4" />Rechazar</Button></div> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-3 xl:hidden">
              {list.items.map((row) => (
                <li className="rounded-2xl border border-border bg-surface p-4" key={row.company_user_id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate font-semibold text-foreground">{row.company_name}</p><p className="truncate text-sm text-muted-foreground">{row.legal_name}</p></div>
                    <Badge tone={statusBadge[row.status].tone}>{statusBadge[row.status].label}</Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm [&_dd]:min-w-0 [&_dd]:break-words">
                    <dt className="text-muted-foreground">País</dt><dd>{row.country_code}</dd>
                    <dt className="text-muted-foreground">Identificación</dt><dd className="flex flex-wrap items-center gap-1.5 font-mono text-xs">{row.tax_id}<button aria-label={`Copiar identificación fiscal de ${row.company_name}`} className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => copy(row.tax_id)} type="button"><Copy aria-hidden="true" className="size-4" /></button></dd>
                    <dt className="text-muted-foreground">Web o correo</dt><dd className="break-words">{contactOf(row)}</dd>
                    <dt className="text-muted-foreground">LinkedIn</dt><dd>{row.linkedin_url ? <a className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4" href={row.linkedin_url} rel="noopener noreferrer" target="_blank">Abrir<ExternalLink aria-hidden="true" className="size-3.5" /></a> : "—"}</dd>
                    <dt className="text-muted-foreground">Enviada</dt><dd>{formatRelativeDate(row.submitted_at, now)}</dd>
                    {row.rejection_reason ? <><dt className="text-muted-foreground">Motivo</dt><dd>{row.rejection_reason}</dd></> : null}
                  </dl>
                  {row.status === "pending" ? <div className="mt-4 grid gap-2"><Button className="w-full" onClick={() => void verify(row)}><Check aria-hidden="true" className="size-4" />Verificar</Button><Button className="w-full" onClick={() => setRejecting(row)} variant="outline"><X aria-hidden="true" className="size-4" />Rechazar</Button></div> : null}
                </li>
              ))}
            </ul>
            {list.hasMore ? <div className="mt-4 flex justify-center"><Button disabled={list.loadingMore} onClick={() => void list.loadMore()} variant="outline">{list.loadingMore ? "Cargando…" : "Cargar más"}</Button></div> : null}
          </>
        ) : null}
      </div>
      <ReasonSheet
        confirmLabel="Rechazar solicitud"
        description={rejecting ? `${rejecting.company_name} verá este motivo y podrá corregir y reenviar su solicitud.` : ""}
        hint="Lo verá la empresa. Sé claro y breve (5 a 200 caracteres)."
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => rejecting ? reject(rejecting, reason) : Promise.resolve()}
        open={rejecting !== null}
        presets={REJECTION_PRESETS}
        title="Rechazar solicitud"
      />
    </div>
  );
}
