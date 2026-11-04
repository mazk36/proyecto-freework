"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminApi } from "@/components/admin/admin-api";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatAdminDate } from "@/lib/admin-panel";

const KEY = "require_company_verification_to_publish" as const;

export function SettingsTab({ api }: { api: AdminApi }) {
  const { toast } = useToast();
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "ready"; enabled: boolean; updatedAt: string }>({ status: "loading" });
  const [pending, setPending] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const row = (await api.getSettings()).find((setting) => setting.key === KEY);
      setState(row ? { status: "ready", enabled: row.value === true, updatedAt: row.updated_at } : { status: "error", message: "No encontramos el ajuste." });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "No pudimos cargar los ajustes." });
    }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  async function apply(value: boolean) {
    setBusy(true);
    setFailure("");
    try {
      await api.setSetting(KEY, value);
      setPending(null);
      toast({ title: value ? "Verificación obligatoria activada" : "Verificación obligatoria desactivada", tone: "success" });
      await load();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "No pudimos guardar el ajuste.");
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "loading") return <Skeleton className="h-28 w-full rounded-2xl" />;
  if (state.status === "error") return <div className="rounded-2xl border border-border bg-surface p-5" role="alert"><p className="text-sm">{state.message}</p><Button className="mt-3" onClick={() => void load()} variant="outline">Reintentar</Button></div>;
  const enabled = state.enabled;
  return (
    <section aria-labelledby="setting-strict" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground" id="setting-strict">Exigir verificación para publicar</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Hoy, {enabled ? "las empresas sin verificar no pueden publicar problemas nuevos." : "las empresas sin verificar pueden publicar y muestran la etiqueta «Empresa sin verificar»."} Los problemas ya publicados siguen abiertos. Última modificación: {formatAdminDate(state.updatedAt)}.</p>
        </div>
        <button
          aria-checked={enabled}
          aria-labelledby="setting-strict"
          className="group relative mt-0 grid h-11 w-14 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => { setFailure(""); setPending(!enabled); }}
          role="switch"
          type="button"
        >
          <span aria-hidden="true" className={`absolute inset-x-0 top-1.5 h-8 rounded-full border transition-colors ${enabled ? "border-accent bg-accent" : "border-border bg-surface-raised"}`} />
          <span aria-hidden="true" className={`absolute top-[0.5625rem] size-6 rounded-full bg-white transition-transform ${enabled ? "translate-x-3" : "-translate-x-3"}`} />
        </button>
      </div>
      <BottomSheet centered description={pending ? "Las empresas sin verificar no podrán publicar problemas nuevos; los ya publicados siguen abiertos." : "Las empresas sin verificar volverán a poder publicar y mostrarán la etiqueta «Empresa sin verificar»."} onClose={() => setPending(null)} open={pending !== null} title={pending ? "¿Exigir verificación para publicar?" : "¿Dejar de exigir verificación?"}>
        <div className="mt-5 space-y-3">
          {failure ? <p className="text-sm text-rose-300" role="alert">{failure}</p> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => setPending(null)} variant="outline">Cancelar</Button>
            <Button disabled={busy} onClick={() => pending !== null && void apply(pending)}>{busy ? "Guardando…" : pending ? "Activar" : "Desactivar"}</Button>
          </div>
        </div>
      </BottomSheet>
    </section>
  );
}
