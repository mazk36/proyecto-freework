"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Network, RotateCcw, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { selectDeckProblems } from "@/lib/deck";
import { persistDeckInteraction, type DeckInteractionWriter } from "@/lib/deck-interactions";
import { listMyProblemInteractions, setProblemInteraction } from "@/lib/interaction-service";
import type { PublicProblem } from "@/lib/problem-domain";
import { listOpenBusinessProblems, ProblemServiceError } from "@/lib/problem-service";
import type { FreelancerProblemInteraction } from "@/types/domain";
import { DeckDetail } from "./deck-detail";
import { DeckTutorial } from "./deck-tutorial";
import { ProposalPlaceholder } from "./proposal-placeholder";
import { SwipeCard, type ExitDirection } from "./swipe-card";

type InteractionMap = Record<string, FreelancerProblemInteraction>;
type LoadState = { status: "loading" } | { status: "error"; userId: string; message: string } | { status: "ready"; userId: string; problems: PublicProblem[]; interactions: InteractionMap };
type UndoEntry = { problem: PublicProblem; state: "saved" | "dismissed"; toastId: string; undoing: boolean; save: Promise<boolean> };

export function SwipeDeck() {
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<LoadState>({ status: "loading" });
  const userId = user?.id;
  const role = user?.role;

  useEffect(() => {
    if (!userId || role !== "freelancer") return;
    let active = true;
    Promise.all([listOpenBusinessProblems(), listMyProblemInteractions()]).then(([problems, entries]) => {
      if (!active) return;
      setData({ status: "ready", userId, problems, interactions: Object.fromEntries(entries.map((entry) => [entry.problemId, entry.state])) });
    }).catch((error: unknown) => {
      if (active) setData({ status: "error", userId, message: error instanceof ProblemServiceError ? error.message : "No pudimos cargar los problemas." });
    });
    return () => { active = false; };
  }, [attempt, role, userId]);

  if (!user) return null;
  if (user.role !== "freelancer") return <DeckShell><EmptyState description="Este espacio está disponible para profesionales independientes." icon={Sparkles} title="Descubre problemas" /></DeckShell>;
  if (data.status === "loading" || data.userId !== user.id) return <DeckShell><DeckLoading /></DeckShell>;
  if (data.status === "error") return <DeckShell><DeckHeading /><div className="mx-auto max-w-xl rounded-3xl border border-border bg-surface"><EmptyState action={<Button onClick={() => { setData({ status: "loading" }); setAttempt((value) => value + 1); }}>Reintentar</Button>} description={data.message} icon={RotateCcw} title="No pudimos cargar los problemas" tone="warning" /></div></DeckShell>;
  return <DeckExperience initialInteractions={data.interactions} problems={data.problems} saveInteraction={setProblemInteraction} />;
}

function DeckShell({ children }: { children: React.ReactNode }) {
  return <main className="swipe-deck mx-auto w-full max-w-6xl overflow-x-clip px-4 pb-10 pt-6 sm:px-8 sm:pt-9">{children}</main>;
}

function DeckHeading() {
  return <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
    <div><p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-brand-lavender">Descubrir</p><h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Problemas que esperan una solución</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Explora el contexto y encuentra dónde puedes aportar.</p></div>
  </header>;
}

function DeckLoading() {
  return <><DeckHeading /><div aria-label="Cargando problemas" className="grid items-start gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-10" role="status"><span className="sr-only">Cargando problemas</span><div className="relative mx-auto h-[min(70dvh,40rem)] w-full max-w-md lg:mx-0">{[2, 1, 0].map((position) => <div className="absolute inset-0" key={position} style={{ transform: `translateY(${position * 10}px) scale(${1 - position * 0.04})`, opacity: 1 - position * 0.25 }}><SkeletonCard className="h-full" /></div>)}</div><SkeletonCard className="hidden h-96 lg:block" /></div></>;
}

export function DeckExperience({
  problems, initialInteractions, saveInteraction, tutorialStorageKey = "matchwork.swipe-tutorial.v1",
}: {
  problems: PublicProblem[];
  initialInteractions: InteractionMap;
  saveInteraction: DeckInteractionWriter;
  tutorialStorageKey?: string;
}) {
  const { toast, dismiss } = useToast();
  const [interactions, setInteractions] = useState(initialInteractions);
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [resetting, setResetting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [proposalProblem, setProposalProblem] = useState<PublicProblem | null>(null);
  const [lastExiting, setLastExiting] = useState<PublicProblem | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [exitDirection, setExitDirection] = useState<ExitDirection>({ direction: "like", width: 0 });
  const activeCard = useRef<HTMLElement>(null);
  const emptyState = useRef<HTMLDivElement>(null);
  const desktopDetail = useRef<HTMLDivElement>(null);
  const shouldFocusCard = useRef(false);
  const decisionLock = useRef<string | null>(null);
  const latestUndo = useRef<UndoEntry | null>(null);
  const cards = useMemo(() => selectDeckProblems(problems, interactions), [problems, interactions]);
  const current = cards[0];
  const displayedProblem = current ?? lastExiting;
  const dismissedIds = Object.keys(interactions).filter((id) => interactions[id] === "dismissed");

  useEffect(() => () => {
    if (latestUndo.current) dismiss(latestUndo.current.toastId);
    latestUndo.current = null;
  }, [dismiss]);

  useEffect(() => {
    if (!shouldFocusCard.current) return;
    if (!current && lastExiting) return;
    shouldFocusCard.current = false;
    const frame = window.requestAnimationFrame(() => (current ? activeCard.current : emptyState.current)?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [current, lastExiting]);

  function clearPending(id: string) {
    setPending((previous) => { const next = new Set(previous); next.delete(id); return next; });
  }

  function setInteraction(id: string, state: FreelancerProblemInteraction) {
    setInteractions((previous) => ({ ...previous, [id]: state }));
  }

  async function undo(entry: UndoEntry) {
    if (latestUndo.current !== entry || entry.undoing) return;
    latestUndo.current = null;
    entry.undoing = true;
    dismiss(entry.toastId);
    decisionLock.current = null;
    setLastExiting(null);
    shouldFocusCard.current = true;
    setInteraction(entry.problem.id, "unseen");
    setAnnouncement(`Decisión deshecha. ${entry.problem.title} vuelve al mazo.`);
    if (!await entry.save) { clearPending(entry.problem.id); return; }
    const outcome = await persistDeckInteraction(saveInteraction, entry.problem.id, null, entry.state);
    if (!outcome.confirmed) {
      setInteraction(entry.problem.id, outcome.state);
      toast({ title: "No pudimos deshacer la acción", description: "Inténtalo de nuevo en unos momentos.", tone: "danger" });
    }
    clearPending(entry.problem.id);
  }

  function decide(direction: "like" | "dismiss", width = activeCard.current?.getBoundingClientRect().width ?? 0) {
    if (!current || resetting || pending.has(current.id) || decisionLock.current === current.id) return;
    decisionLock.current = current.id;
    if (latestUndo.current) { dismiss(latestUndo.current.toastId); latestUndo.current = null; }
    const state = direction === "like" ? "saved" : "dismissed";
    const entry: UndoEntry = { problem: current, state, toastId: "", undoing: false, save: Promise.resolve(false) };
    latestUndo.current = entry;
    setExitDirection({ direction, width });
    if (cards.length === 1) setLastExiting(current);
    setPending((previous) => new Set(previous).add(current.id));
    shouldFocusCard.current = true;
    setInteraction(current.id, state);
    setAnnouncement(`${direction === "like" ? "Guardado en tus Likes" : "Descartado"}: ${current.title}.`);
    navigator.vibrate?.(8);
    entry.toastId = toast({
      title: direction === "like" ? "Guardado en tus Likes" : "Descartado",
      tone: direction === "like" ? "accent" : "neutral",
      actionLabel: direction === "like" ? "Proponer ahora" : "Deshacer",
      onAction: direction === "like" ? () => setProposalProblem(current) : () => { void undo(entry); },
      secondaryActionLabel: direction === "like" ? "Deshacer" : undefined,
      onSecondaryAction: direction === "like" ? () => { void undo(entry); } : undefined,
      onClose: () => { if (latestUndo.current === entry) latestUndo.current = null; },
      durationMs: 6000,
    });
    entry.save = (async () => {
      const outcome = await persistDeckInteraction(saveInteraction, current.id, state, "unseen");
      try {
        if (outcome.confirmed) return true;
        setInteraction(current.id, outcome.state);
        if (latestUndo.current === entry) { latestUndo.current = null; dismiss(entry.toastId); }
        decisionLock.current = null;
        shouldFocusCard.current = true;
        setAnnouncement("No pudimos guardar tu decisión. Revisa el problema de nuevo.");
        toast({ title: "No pudimos guardar tu decisión", description: "Revisa tu conexión e inténtalo de nuevo.", tone: "danger" });
        return false;
      } finally { if (!entry.undoing) clearPending(current.id); }
    })();
  }

  async function reviewDismissed() {
    if (!dismissedIds.length || resetting || pending.size > 0) return;
    if (latestUndo.current) { dismiss(latestUndo.current.toastId); latestUndo.current = null; }
    setResetting(true);
    shouldFocusCard.current = true;
    setInteractions((previous) => {
      const next = { ...previous };
      for (const id of dismissedIds) next[id] = "unseen";
      return next;
    });
    const results = await Promise.allSettled(dismissedIds.map((id) => saveInteraction(id, null)));
    const failed = results.flatMap((result, index) => result.status === "rejected" ? [{ id: dismissedIds[index], state: "dismissed" as const }] : result.value !== "unseen" ? [{ id: dismissedIds[index], state: result.value }] : []);
    if (failed.length) {
      shouldFocusCard.current = true;
      setInteractions((previous) => ({ ...previous, ...Object.fromEntries(failed.map(({ id, state }) => [id, state])) }));
      toast({ title: "No pudimos recuperar todos los problemas", description: "Puedes volver a intentarlo.", tone: "danger" });
    } else {
      setAnnouncement("Tus problemas descartados están disponibles para revisar otra vez.");
      toast({ title: "Problemas listos para revisar", tone: "success" });
    }
    decisionLock.current = null;
    setResetting(false);
  }

  function openDetail() {
    if (window.matchMedia("(min-width: 1024px)").matches) desktopDetail.current?.focus();
    else setDetailOpen(true);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!window.matchMedia("(min-width: 1024px)").matches || event.altKey || event.ctrlKey || event.metaKey || detailOpen || proposalProblem) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      if (event.key === "ArrowLeft" && current) { event.preventDefault(); decide("dismiss"); }
      else if (event.key === "ArrowRight" && current) { event.preventDefault(); decide("like"); }
      else if (event.key === "Enter" && current && (!target || target === document.body || target === activeCard.current)) { event.preventDefault(); openDetail(); }
      else if (event.key.toLowerCase() === "p" && current) { event.preventDefault(); setProposalProblem(current); }
      else if (event.key.toLowerCase() === "z" && latestUndo.current) { event.preventDefault(); void undo(latestUndo.current); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <MotionConfig reducedMotion="user">
      <DeckShell>
        <DeckHeading />
        <p aria-atomic="true" aria-live="polite" className="sr-only">{announcement}</p>
        {displayedProblem ? <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-10">
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <div className="relative h-[min(70dvh,40rem)] w-full pb-5">
              <AnimatePresence custom={exitDirection} initial={false} onExitComplete={() => setLastExiting(null)}>{cards.slice(0, 3).map((problem, position) => <SwipeCard activeRef={activeCard} disabled={resetting || pending.has(problem.id)} key={problem.id} onDecision={decide} onOpenDetail={openDetail} position={position} problem={problem} />)}</AnimatePresence>
              <DeckTutorial storageKey={tutorialStorageKey} />
            </div>
            <div className="h-24 md:hidden" aria-hidden="true" />
            <div className="fixed inset-x-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mt-5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none" style={{ bottom: "calc(5.1rem + env(safe-area-inset-bottom))" }}>
              <div className="mx-auto flex w-full max-w-md items-center justify-center gap-3">
                <button aria-label="No me interesa" className="grid size-14 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50" disabled={!current || resetting || pending.has(displayedProblem.id)} onClick={() => decide("dismiss")} type="button"><X aria-hidden="true" className="size-6" /></button>
                <Button className="min-h-14 min-w-0 flex-1" disabled={!current || resetting || pending.has(displayedProblem.id)} onClick={() => setProposalProblem(displayedProblem)}>Proponer ahora <ArrowUpRight aria-hidden="true" className="size-4" /></Button>
                <button aria-label="Me interesa" className="grid size-14 shrink-0 place-items-center rounded-2xl border border-accent/40 bg-accent/15 text-brand-lavender transition-colors hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50" disabled={!current || resetting || pending.has(displayedProblem.id)} onClick={() => decide("like")} type="button"><Heart aria-hidden="true" className="size-6" /></button>
              </div>
            </div>
            <p className="mt-4 hidden items-center justify-center gap-2 text-xs text-muted-foreground lg:flex"><ArrowLeft aria-hidden="true" className="size-3.5" /> descartar <ArrowRight aria-hidden="true" className="ml-2 size-3.5" /> me interesa <span className="ml-2">Enter detalle · P proponer · Z deshacer</span></p>
          </div>
          <div aria-label="Detalle del problema actual" className="ui-scrollbar hidden max-h-[min(76dvh,45rem)] overflow-y-auto rounded-3xl border border-border bg-surface p-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:block" ref={desktopDetail} tabIndex={-1}>
            <AnimatePresence initial={false} mode="wait"><motion.div animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }} key={displayedProblem.id} transition={{ duration: 0.15 }}><DeckDetail onPropose={() => setProposalProblem(displayedProblem)} problem={displayedProblem} /></motion.div></AnimatePresence>
          </div>
        </div> : <div className="mx-auto max-w-xl rounded-3xl border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" ref={emptyState} tabIndex={-1}><EmptyState action={<div className="flex flex-wrap justify-center gap-3"><ButtonLink href="/app/likes">Ver mis Likes</ButtonLink><Button disabled={!dismissedIds.length || resetting || pending.size > 0} onClick={() => { void reviewDismissed(); }} variant="outline">Volver a revisar descartados</Button></div>} description="Cuando haya más problemas disponibles, los encontrarás aquí." icon={Network} title="Ya viste todo por ahora" /></div>}
        <BottomSheet onClose={() => setDetailOpen(false)} open={detailOpen && Boolean(current)} title="Detalle del problema">{current ? <DeckDetail onPropose={() => { setDetailOpen(false); setProposalProblem(current); }} problem={current} /> : null}</BottomSheet>
        <ProposalPlaceholder onClose={() => setProposalProblem(null)} problem={proposalProblem} />
      </DeckShell>
    </MotionConfig>
  );
}
