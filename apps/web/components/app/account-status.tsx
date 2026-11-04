"use client";

import { createContext, useContext, useId } from "react";
import { Button } from "@/components/ui/button";

export type AccountStatus =
  | { state: "loading" }
  | { state: "error" }
  | { state: "active" }
  | { state: "suspended"; reason: string | null };

export const AccountStatusContext = createContext<AccountStatus>({ state: "active" });
export function useAccountStatus() { return useContext(AccountStatusContext); }
export function useCanWrite() { return useAccountStatus().state === "active"; }

export function SuspensionNotice({ reason, onLogout }: { reason: string | null; onLogout: () => void }) {
  const titleId = useId();
  return <section aria-labelledby={titleId} className="rounded-2xl border border-border bg-surface-raised p-4 text-foreground sm:p-5" role="status">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="font-semibold" id={titleId}>Tu cuenta está suspendida</h2>{reason ? <p className="mt-1 break-words text-sm leading-6">Motivo: {reason}</p> : null}<p className="mt-1 text-sm leading-6 text-muted-foreground">Si crees que es un error, contacta al equipo de MatchWork.</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Puedes consultar tu información; las acciones de escritura no están disponibles.</p></div>
      <Button onClick={onLogout} variant="outline">Cerrar sesión</Button>
    </div>
  </section>;
}
