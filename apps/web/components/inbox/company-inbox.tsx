"use client";

import { Columns3, Inbox, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { changeInboxDecision, comparisonAvailability, filterInboxProposals, type CompanyInboxServices, type InboxFilter, type InboxProblemGroup } from "@/lib/company-inbox";
import { listProblemProposals, setProposalInteraction, type InboxProposal } from "@/lib/company-inbox-service";
import { getMyCompanyProblems } from "@/lib/problem-service";
import { toggleCompare } from "@/lib/proposal-comparison";
import type { CompanyProposalInteraction } from "@/types/domain";
import { MatchCelebration } from "./match-celebration";
import { ProposalCard } from "./proposal-card";
import { ProposalComparison } from "./proposal-comparison";
import { ProposalFullContent } from "./proposal-content";

const defaultServices: CompanyInboxServices = {
  listProblems: getMyCompanyProblems,
  listProposals: listProblemProposals,
  setInteraction: setProposalInteraction,
};
const filters: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "saved", label: "Guardadas" },
  { value: "unseen", label: "Sin revisar" },
  { value: "dismissed", label: "Descartadas" },
];
type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; groups: InboxProblemGroup[] };

export function CompanyInbox({ services = defaultServices, initialFilter = "all" }: { services?: CompanyInboxServices; initialFilter?: InboxFilter }) {
  const { toast } = useToast();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<InboxFilter>(initialFilter);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [detail, setDetail] = useState<InboxProposal | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const groupsRef = useRef<InboxProblemGroup[]>([]);
  const busyRef = useRef(new Set<string>());
  const readyRef = useRef(false);
  const versionRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    readyRef.current = false;
    void (async () => {
      try {
        const problems = await services.listProblems();
        const groups = await Promise.all(problems.map(async (problem) => ({ problem, proposals: await services.listProposals(problem.id) })));
        if (!active) return;
        groupsRef.current = groups;
        readyRef.current = true;
        setState({ status: "ready", groups });
        const params = new URLSearchParams(window.location.search);
        let id = params.get("problema") || "";
        if (!id) {
          id = (initialFilter === "saved" ? groups.find((group) => group.proposals.some((proposal) => proposal.myState === "saved" && !proposal.matchId)) : undefined)?.problem.id
            ?? groups.find((group) => group.proposals.length > 0)?.problem.id ?? "";
          if (id) {
            params.set("problema", id);
            const url = new URL(window.location.href);
            url.search = params.toString();
            window.history.replaceState(null, "", url);
          }
        }
        setSelectedId(id);
        const available = groups.find((group) => group.problem.id === id)?.proposals ?? [];
        setSelectedForComparison((current) => current.filter((proposalId) => available.some((proposal) => proposal.id === proposalId)));
      } catch (error) {
        if (active) {
          readyRef.current = false;
          setState({ status: "error", message: error instanceof Error ? error.message : "No pudimos cargar las propuestas." });
        }
      }
    })();
    return () => { active = false; readyRef.current = false; };
  }, [attempt, initialFilter, services]);

  useEffect(() => {
    function syncLocation() {
      setSelectedId(new URLSearchParams(window.location.search).get("problema") ?? "");
      setSelectedForComparison([]);
      setComparing(false);
    }
    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, []);

  function selectProblem(id: string) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("problema", id);
    else url.searchParams.delete("problema");
    window.history.pushState(null, "", url);
    setSelectedId(id);
    setSelectedForComparison([]);
    setComparing(false);
  }

  function replaceProposals(problemId: string, proposals: InboxProposal[]) {
    groupsRef.current = groupsRef.current.map((group) => group.problem.id === problemId ? { ...group, proposals } : group);
    const existingIds = new Set(groupsRef.current.flatMap((group) => group.proposals.map((proposal) => proposal.id)));
    setSelectedForComparison((current) => current.filter((id) => existingIds.has(id)));
    setState((current) => current.status === "ready" ? { status: "ready", groups: groupsRef.current } : current);
  }

  async function refreshProblem(problemId: string): Promise<InboxProposal[]> {
    const proposals = await services.listProposals(problemId);
    replaceProposals(problemId, proposals);
    return proposals;
  }

  function setBusy(proposalId: string, busy: boolean) {
    if (busy) busyRef.current.add(proposalId);
    else busyRef.current.delete(proposalId);
    setBusyIds([...busyRef.current]);
  }

  async function decide(proposal: InboxProposal, next: CompanyProposalInteraction, undo = false) {
    if (busyRef.current.size > 0) return;
    const version = (versionRef.current[proposal.id] ?? 0) + 1;
    versionRef.current[proposal.id] = version;
    const startingFocus = document.activeElement;
    setBusy(proposal.id, true);
    function restoreFocusIfRemoved() {
      window.requestAnimationFrame(() => {
        if (document.activeElement === document.body && startingFocus instanceof HTMLElement && !startingFocus.isConnected) {
          document.getElementById("inbox-heading")?.focus();
        }
      });
    }
    function announceDecision(confirmed: CompanyProposalInteraction) {
      if (undo) {
        toast({ title: "Decisión restaurada", tone: "success" });
        return;
      }
      function undoDecision() {
        if (!readyRef.current) {
          toast({ title: "La bandeja aún no está disponible", description: "Cuando vuelva a cargar, puedes intentar deshacer esta decisión.", tone: "warning", actionLabel: "Deshacer", onAction: undoDecision, durationMs: 8000 });
          return;
        }
        if (busyRef.current.size > 0) {
          toast({ title: "Hay una actualización en curso", description: "Cuando termine, puedes volver a deshacer esta decisión.", tone: "neutral", actionLabel: "Deshacer", onAction: undoDecision, durationMs: 8000 });
          return;
        }
        const latest = groupsRef.current.flatMap((item) => item.proposals).find((item) => item.id === proposal.id);
        if (versionRef.current[proposal.id] !== version || !latest || latest.myState !== confirmed || latest.matchId) {
          toast({ title: "La decisión cambió", description: "Revisa el estado actual de la propuesta.", tone: "warning" });
          return;
        }
        void decide(latest, proposal.myState, true);
      }
      toast({
        title: confirmed === "saved" ? "Propuesta guardada" : "Propuesta descartada",
        tone: "success", actionLabel: "Deshacer", durationMs: 8000,
        onAction: undoDecision,
      });
    }
    try {
      const confirmed = await changeInboxDecision(services.setInteraction, proposal.id, proposal.myState, next);
      const group = groupsRef.current.find((item) => item.problem.id === proposal.problemId);
      if (group) replaceProposals(proposal.problemId, group.proposals.map((item) => item.id === proposal.id ? { ...item, myState: confirmed } : item));
      restoreFocusIfRemoved();

      if (confirmed === "interested") {
        const refreshed = await refreshProblem(proposal.problemId);
        restoreFocusIfRemoved();
        const match = refreshed.find((item) => item.id === proposal.id)?.matchId;
        if (match) setMatchId(match);
        else toast({ title: "Interés registrado", description: "No pudimos obtener el Match. Actualiza la bandeja para consultarlo.", tone: "warning" });
      } else {
        announceDecision(confirmed);
      }
    } catch (error) {
      try {
        const refreshed = await refreshProblem(proposal.problemId);
        restoreFocusIfRemoved();
        const actual = refreshed.find((item) => item.id === proposal.id);
        if (next === "interested" && actual?.matchId) setMatchId(actual.matchId);
        else if (next !== "interested" && actual?.myState === next && !actual.matchId) announceDecision(next);
        else toast({ title: "No pudimos completar la acción", description: error instanceof Error ? error.message : "Inténtalo de nuevo.", tone: "danger" });
      } catch {
        readyRef.current = false;
        setState({ status: "error", message: "No pudimos confirmar el estado de la propuesta. Actualiza la bandeja para consultarlo." });
      }
    } finally {
      setBusy(proposal.id, false);
    }
  }

  function retry() {
    if (busyRef.current.size > 0) return;
    readyRef.current = false;
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }
  function backToInbox() {
    setComparing(false);
    window.requestAnimationFrame(() => document.getElementById("inbox-heading")?.focus());
  }

  const groups = state.status === "ready" ? state.groups : [];
  const withProposals = groups.filter((group) => group.proposals.length > 0);
  const selectedGroup = groups.find((group) => group.problem.id === selectedId);
  const proposals = selectedGroup?.proposals ?? [];
  const visible = filterInboxProposals(proposals, filter);
  const selected = proposals.filter((proposal) => selectedForComparison.includes(proposal.id));
  const availability = comparisonAvailability(selected.length);
  const canInteract = selectedGroup?.problem.status === "open" || selectedGroup?.problem.status === "paused";

  return <main className="company-inbox mx-auto w-full max-w-6xl px-4 pb-44 pt-8 sm:px-8 sm:pt-12">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-lavender">Panel de empresa</p><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-4xl" id="inbox-heading" tabIndex={-1}>Propuestas recibidas</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Revisa las propuestas por problema y encuentra con quién te gustaría conversar.</p></div>
      {state.status === "ready" ? <Button disabled={busyIds.length > 0} onClick={retry} variant="outline"><RotateCcw aria-hidden="true" className="size-4" />Actualizar bandeja</Button> : null}
    </header>

    {state.status === "loading" ? <div aria-label="Cargando bandeja de propuestas" className="mt-8 grid gap-4" role="status"><span className="sr-only">Cargando bandeja de propuestas</span><Skeleton className="h-12 w-full max-w-xl" /><SkeletonCard /><SkeletonCard /></div> : null}
    {state.status === "error" ? <div className="mt-8 rounded-2xl border border-border bg-surface"><EmptyState action={<Button onClick={retry}>Reintentar</Button>} description={state.message} icon={RotateCcw} title="No pudimos cargar la bandeja" tone="warning" /></div> : null}
    {state.status === "ready" && !withProposals.length && !selectedId ? <div className="mt-8 rounded-2xl border border-border bg-surface"><EmptyState action={<ButtonLink href="/app/problemas">Ver mis problemas</ButtonLink>} description="Cuando recibas propuestas enviadas para tus problemas, aparecerán aquí." icon={Inbox} title="Aún no has recibido propuestas" /></div> : null}
    {state.status === "ready" && (withProposals.length > 0 || selectedId) ? <>
      <div className="mt-8 max-w-xl"><label className="block text-sm font-semibold" htmlFor="inbox-problem">Problema</label><select className="mt-2 min-h-12 w-full rounded-xl border border-border bg-surface px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" id="inbox-problem" onChange={(event) => selectProblem(event.target.value)} value={withProposals.some((group) => group.problem.id === selectedId) ? selectedId : ""}><option value="">Selecciona un problema</option>{withProposals.map(({ problem, proposals: items }) => <option key={problem.id} value={problem.id}>{problem.title || "Problema sin título"} · {items.length} {items.length === 1 ? "propuesta" : "propuestas"}</option>)}</select></div>
      {!selectedGroup && selectedId ? <div className="mt-6 rounded-2xl border border-border bg-surface"><EmptyState action={withProposals[0] ? <Button onClick={() => selectProblem(withProposals[0].problem.id)}>Ver propuestas disponibles</Button> : <ButtonLink href="/app/problemas">Ver mis problemas</ButtonLink>} description="El problema indicado no está disponible en tu cuenta." icon={Inbox} title="No encontramos este problema" /></div> : null}
      {selectedGroup && !proposals.length ? <div className="mt-6 rounded-2xl border border-border bg-surface"><EmptyState action={<ButtonLink href="/app/problemas">Ver mis problemas</ButtonLink>} description="Las propuestas enviadas para este problema aparecerán aquí." icon={Inbox} title="Este problema aún no tiene propuestas" /></div> : null}
      {selectedGroup && proposals.length > 0 ? <div className="mt-8">
        {comparing ? <ProposalComparison onBack={backToInbox} proposals={selected} /> : <>
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="break-words font-display text-xl font-semibold">{selectedGroup.problem.title || "Problema sin título"}</h2><p className="mt-1 text-sm text-muted-foreground">{proposals.length} {proposals.length === 1 ? "propuesta enviada" : "propuestas enviadas"}</p></div></div>
          {!canInteract ? <p className="mt-4 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm leading-6 text-warning">Para cambiar decisiones, el problema debe estar abierto o en pausa.</p> : null}
          <div aria-label="Filtrar propuestas por estado" className="mt-5 flex flex-wrap gap-2" role="group">{filters.map((item) => <button aria-pressed={filter === item.value} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${filter === item.value ? "border-accent bg-accent/20 text-foreground" : "border-border text-muted-foreground hover:bg-surface hover:text-foreground"}`} key={item.value} onClick={() => setFilter(item.value)} type="button">{item.label}</button>)}</div>
          {busyIds.length ? <p aria-live="polite" className="mt-3 text-sm text-muted-foreground" role="status">Actualizando una decisión; podrás realizar otra acción en un momento.</p> : null}
          {visible.length ? <div className="mt-5 grid gap-4">{visible.map((proposal) => <ProposalCard busy={busyIds.length > 0} canInteract={Boolean(canInteract)} comparisonFull={availability.isFull} key={proposal.id} onCompare={() => setSelectedForComparison((current) => toggleCompare(current, proposal.id))} onDecision={(next) => { void decide(proposal, next); }} onDetail={() => setDetail(proposal)} pending={busyIds.includes(proposal.id)} proposal={proposal} selected={selectedForComparison.includes(proposal.id)} />)}</div> : <div className="mt-5 rounded-2xl border border-border bg-surface"><EmptyState action={<Button onClick={() => setFilter("all")} variant="outline">Ver todas</Button>} compact description="Prueba otro filtro para seguir revisando este problema." icon={Inbox} title="No hay propuestas en este estado" /></div>}
        </>}
      </div> : null}
    </> : null}

    {state.status === "ready" && selected.length > 0 && !comparing ? <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-surface p-3 shadow-2xl md:bottom-6 md:left-auto md:right-6 md:w-[min(32rem,calc(100%-3rem))]">
      <div aria-live="polite" className="min-w-0"><p className="flex items-center gap-2 text-sm font-semibold"><Columns3 aria-hidden="true" className="size-4 text-brand-lavender" />Comparar ({selected.length}/3)</p>{!availability.canOpen ? <p className="mt-1 text-xs text-muted-foreground">Elige al menos 2 propuestas.</p> : null}</div>
      <Button disabled={!availability.canOpen} onClick={() => setComparing(true)}>Ver comparación</Button>
    </div> : null}
    <BottomSheet description="Todos los detalles enviados por el profesional." onClose={() => setDetail(null)} open={Boolean(detail)} title="Propuesta completa">{detail ? <ProposalFullContent proposal={detail} /> : null}</BottomSheet>
    {matchId ? <MatchCelebration matchId={matchId} onClose={() => setMatchId(null)} /> : null}
  </main>;
}
