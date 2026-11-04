"use client";

import { FilePenLine, RotateCcw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCanWrite } from "@/components/app/account-status";
import { CompanyTrustChip } from "@/components/ui/company-trust-chip";
import { StatusBadge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import type { PublicProblem } from "@/lib/problem-domain";
import { listOpenBusinessProblems, ProblemServiceError } from "@/lib/problem-service";
import { formatProposalPrice, type Proposal } from "@/lib/proposal-domain";
import { groupProposalsByStatus, resolveProposalProblem } from "@/lib/proposal-form";
import { listMyProposalCompanyTrust, proposalServices, type ProposalServices } from "@/lib/proposal-service";
import { ProposalSheet } from "./proposal-sheet";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; proposals: Proposal[]; problems: PublicProblem[]; trust: Record<string, boolean>; trustError: boolean };

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" }).format(date);
}

export function MyProposals({ services = proposalServices, loadProblems = listOpenBusinessProblems, loadTrust = listMyProposalCompanyTrust }: {
  services?: ProposalServices;
  loadProblems?: () => Promise<PublicProblem[]>;
  loadTrust?: typeof listMyProposalCompanyTrust;
}) {
  const { toast } = useToast();
  const canWrite = useCanWrite();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<{ problem: PublicProblem; unavailable: boolean } | null>(null);
  const [withdrawing, setWithdrawing] = useState<Proposal | null>(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const withdrawBusyRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submittedRef = useRef(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([services.list(), loadProblems().catch(() => null), loadTrust().catch(() => null)]).then(([proposals, problems, trust]) => {
      if (active) setState({ status: "ready", proposals, problems: problems ?? [], trust: Object.fromEntries((trust ?? []).map((item) => [item.proposalId, item.companyVerified])), trustError: trust === null });
    }).catch((error: unknown) => {
      if (active) setState({ status: "error", message: error instanceof ProblemServiceError ? error.message : "Revisa tu conexión e inténtalo de nuevo." });
    });
    return () => { active = false; };
  }, [attempt, loadProblems, loadTrust, services]);

  function refresh() { setState({ status: "loading" }); setAttempt((value) => value + 1); }

  async function withdraw() {
    if (!canWrite || !withdrawing || withdrawBusyRef.current) return;
    const proposal = withdrawing;
    withdrawBusyRef.current = true;
    setWithdrawBusy(true);
    setWithdrawError(null);
    try {
      await services.withdraw(proposal.id);
      setWithdrawing(null);
      refresh();
      window.requestAnimationFrame(() => headingRef.current?.focus());
      toast({ title: "Propuesta retirada", description: "Se conserva en tu historial.", tone: "success" });
    } catch (error) {
      setWithdrawError(error instanceof ProblemServiceError ? error.message : "No pudimos retirar la propuesta. Inténtalo de nuevo.");
    } finally { withdrawBusyRef.current = false; setWithdrawBusy(false); }
  }

  return <section aria-labelledby="my-proposals-heading">
    <h2 className="font-display text-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" id="my-proposals-heading" ref={headingRef} tabIndex={-1}>Mis propuestas</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Consulta tus envíos, continúa tus borradores y revisa tu historial.</p>
    {state.status === "loading" ? <div aria-label="Cargando propuestas" className="mt-5 grid gap-4" role="status"><span className="sr-only">Cargando propuestas</span><SkeletonCard /><SkeletonCard /></div> : null}
    {state.status === "error" ? <div className="mt-5 rounded-2xl border border-border bg-surface"><EmptyState action={<Button onClick={refresh}>Reintentar</Button>} description={state.message} icon={RotateCcw} title="No pudimos cargar tus propuestas" tone="warning" /></div> : null}
    {state.status === "ready" && state.trustError ? <p className="mt-4 text-sm text-muted-foreground" role="status">No pudimos cargar la verificación de las empresas. <button className="min-h-11 rounded px-2 font-semibold text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={refresh} type="button">Reintentar</button></p> : null}
    {state.status === "ready" && !state.proposals.length ? <div className="mt-5 rounded-2xl border border-border bg-surface"><EmptyState action={<ButtonLink href="/app/descubrir">Descubrir problemas</ButtonLink>} description="Cuando guardes un borrador o envíes una propuesta, podrás seguirla aquí." icon={Send} title="Aún no tienes propuestas" /></div> : null}
    {state.status === "ready" && state.proposals.length ? <div className="mt-6 space-y-8">
      {([
        ["submitted", "Enviadas"], ["draft", "Borradores"], ["withdrawn", "Retiradas"],
      ] as const).map(([status, title]) => {
        const proposals = groupProposalsByStatus(state.proposals)[status];
        return proposals.length ? <section aria-labelledby={`proposals-${status}`} key={status}><h3 className="font-display text-base font-semibold" id={`proposals-${status}`}>{title} <span className="text-sm font-normal text-muted-foreground">({proposals.length})</span></h3><div className="mt-3 grid gap-3">{proposals.map((proposal) => {
          const { problem, unavailable } = resolveProposalProblem(proposal, state.problems);
          return <article className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" key={proposal.id}>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={proposal.status} /><CompanyTrustChip verified={state.trust[proposal.id]} /><span className="text-xs text-muted-foreground">{proposal.submittedAt ? `Enviada el ${formatDate(proposal.submittedAt)}` : `Actualizada el ${formatDate(proposal.updatedAt)}`}</span></div><h4 className="mt-3 break-words font-display text-base font-semibold">{proposal.problemTitleSnapshot}</h4><p className="mt-2 font-mono text-sm">{proposal.price === null ? "Precio sin definir" : formatProposalPrice(proposal.price, proposal.currency)}</p></div>
            <div className="flex flex-wrap gap-2">{proposal.status === "draft" ? <Button onClick={() => { submittedRef.current = false; setEditing({ problem, unavailable }); }}><FilePenLine aria-hidden="true" className="size-4" />Continuar borrador</Button> : null}{proposal.status !== "withdrawn" ? <Button disabled={!canWrite} onClick={() => { setWithdrawError(null); setWithdrawing(proposal); }} variant="outline">Retirar propuesta</Button> : null}</div>
          </article>;
        })}</div></section> : null;
      })}
    </div> : null}
    <BottomSheet description="Esta acción conserva la propuesta en tu historial." onClose={() => { if (!withdrawBusy) setWithdrawing(null); }} open={Boolean(withdrawing)} title="¿Retirar propuesta?">
      <p className="text-sm leading-6 text-muted-foreground">{withdrawing?.status === "draft" ? "Retirarás este borrador y no podrás seguir editándolo." : "La empresa dejará de ver esta propuesta y no podrás volver a enviarla."}</p>
      {withdrawError ? <p className="mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm leading-6 text-danger" role="alert">{withdrawError}</p> : null}
      <p aria-live="polite" className="min-h-6 pt-3 text-sm text-muted-foreground">{withdrawBusy ? "Retirando propuesta…" : ""}</p>
      <div className="mt-4 flex flex-wrap gap-3"><Button disabled={!canWrite || withdrawBusy} onClick={() => { void withdraw(); }}>Sí, retirar propuesta</Button><Button disabled={withdrawBusy} onClick={() => setWithdrawing(null)} variant="outline">Cancelar</Button></div>
    </BottomSheet>
    {editing ? <ProposalSheet key={editing.problem.id} onClose={() => { setEditing(null); if (submittedRef.current) window.requestAnimationFrame(() => headingRef.current?.focus()); }} onSubmitted={() => { submittedRef.current = true; refresh(); }} problem={editing.problem} problemUnavailable={editing.unavailable} services={services} /> : null}
  </section>;
}
