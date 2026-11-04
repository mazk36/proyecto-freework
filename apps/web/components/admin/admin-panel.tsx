"use client";

import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CompaniesTab } from "@/components/admin/companies-tab";
import { defaultAdminApi, type AdminApi } from "@/components/admin/admin-api";
import { ProblemsTab } from "@/components/admin/problems-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { UsersTab } from "@/components/admin/users-tab";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ADMIN_TABS, adminTabParam, parseAdminTab, type AdminTab, type CompanyFilter } from "@/lib/admin-panel";
import type { AdminSummaryRow } from "@/types/database";

type Access = { status: "loading" } | { status: "denied" } | { status: "error"; message: string } | { status: "granted" };

export function AdminPanel({ api = defaultAdminApi, syncUrl = true }: { api?: AdminApi; syncUrl?: boolean }) {
  const [access, setAccess] = useState<Access>({ status: "loading" });
  const [tab, setTab] = useState<AdminTab>("companies");
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("pending");
  const [summary, setSummary] = useState<AdminSummaryRow | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const tabRefs = useRef<Record<AdminTab, HTMLButtonElement | null>>({ companies: null, users: null, problems: null, settings: null });

  useEffect(() => {
    if (syncUrl) setTab(parseAdminTab(window.location.search));
    const onPop = () => { if (syncUrl) setTab(parseAdminTab(window.location.search)); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [syncUrl]);

  const checkAccess = useCallback(async () => {
    setAccess({ status: "loading" });
    try {
      setAccess((await api.isAdmin()) ? { status: "granted" } : { status: "denied" });
    } catch (error) {
      setAccess({ status: "error", message: error instanceof Error ? error.message : "No pudimos comprobar tu acceso." });
    }
  }, [api]);
  useEffect(() => { void checkAccess(); }, [checkAccess]);

  const loadSummary = useCallback(async () => {
    try { setSummary(await api.getAdminSummary()); setSummaryError(false); } catch { setSummaryError(true); }
  }, [api]);
  useEffect(() => { if (access.status === "granted") void loadSummary(); }, [access.status, loadSummary]);

  function selectTab(next: AdminTab) {
    setTab(next);
    if (syncUrl) window.history.pushState(null, "", `?tab=${adminTabParam(next)}`);
  }

  if (access.status === "loading") return <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8"><Skeleton className="h-10 w-48" /><Skeleton className="mt-6 h-28 w-full rounded-2xl" /></div>;
  if (access.status === "denied") return <section className="mx-auto grid min-h-[50vh] w-full max-w-3xl place-items-center px-5 py-12 text-center"><div><ShieldCheck aria-hidden="true" className="mx-auto size-10 text-muted-foreground" strokeWidth={1.6} /><h1 className="mt-4 text-2xl font-semibold">No tienes acceso</h1><p className="mt-2 text-sm text-muted-foreground">Esta sección es solo para administradores de MatchWork.</p></div></section>;
  if (access.status === "error") return <section className="mx-auto w-full max-w-3xl px-5 py-12 text-center" role="alert"><p className="text-sm">{access.message}</p><Button className="mt-4" onClick={() => void checkAccess()} variant="outline">Reintentar</Button></section>;

  const cards: { label: string; value: number | undefined; action?: () => void }[] = [
    { label: "Empresas por verificar", value: summary?.pending_verifications, action: () => { setCompanyFilter("pending"); selectTab("companies"); } },
    { label: "Empresas verificadas", value: summary?.verified_companies, action: () => { setCompanyFilter("verified"); selectTab("companies"); } },
    { label: "Problemas abiertos", value: summary?.open_problems },
    { label: "Freelancers activos", value: summary?.active_freelancers },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-lavender">Administración</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Panel admin</h1>
      </header>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen">
        {cards.map((card) => {
          const body = (
            <>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <div className="mt-2 font-mono text-3xl font-medium text-foreground">{card.value === undefined ? (summaryError ? "—" : <Skeleton className="h-8 w-12" />) : card.value}</div>
            </>
          );
          return card.action
            ? <button className="min-h-11 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" key={card.label} onClick={card.action} type="button">{body}</button>
            : <div className="rounded-2xl border border-border bg-surface p-4" key={card.label}>{body}</div>;
        })}
      </div>
      {summaryError ? <p className="mt-2 text-xs text-muted-foreground" role="status">No pudimos cargar el resumen. <button className="underline underline-offset-4" onClick={() => void loadSummary()} type="button">Reintentar</button></p> : null}

      <div aria-label="Secciones del panel" className="mt-8 flex gap-2 overflow-x-auto border-b border-border pb-px" role="tablist">
        {ADMIN_TABS.map((item, index) => (
          <button
            aria-controls={`admin-panel-${item.id}`}
            aria-selected={tab === item.id}
            className={`min-h-11 shrink-0 rounded-t-xl border-b-2 px-3 text-sm sm:px-4 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${tab === item.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            id={`admin-tab-${item.id}`}
            key={item.id}
            onClick={() => selectTab(item.id)}
            onKeyDown={(event) => {
              const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              if (!offset) return;
              event.preventDefault();
              const next = ADMIN_TABS[(index + offset + ADMIN_TABS.length) % ADMIN_TABS.length];
              selectTab(next.id);
              tabRefs.current[next.id]?.focus();
            }}
            ref={(element) => { tabRefs.current[item.id] = element; }}
            role="tab"
            tabIndex={tab === item.id ? 0 : -1}
            type="button"
          >{item.label}</button>
        ))}
      </div>
      <div aria-labelledby={`admin-tab-${tab}`} className="mt-6" id={`admin-panel-${tab}`} role="tabpanel">
        {tab === "companies" ? <CompaniesTab api={api} filter={companyFilter} onChanged={() => void loadSummary()} onFilterChange={setCompanyFilter} /> : null}
        {tab === "users" ? <UsersTab api={api} /> : null}
        {tab === "problems" ? <ProblemsTab api={api} /> : null}
        {tab === "settings" ? <SettingsTab api={api} /> : null}
      </div>
    </section>
  );
}
