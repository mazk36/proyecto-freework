"use client";

import { Heart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCanWrite } from "@/components/app/account-status";
import { CompanyTrustChip } from "@/components/ui/company-trust-chip";
import { ProposalSheet } from "@/components/proposals/proposal-sheet";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { selectDeckProblems } from "@/lib/deck";
import { listMyProblemInteractions, setProblemInteraction } from "@/lib/interaction-service";
import { formatProblemBudget, type PublicProblem } from "@/lib/problem-domain";
import { listOpenBusinessProblems, ProblemServiceError } from "@/lib/problem-service";
import { DeckDetail } from "./deck-detail";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; problems: PublicProblem[] };

export function SavedProblems() {
  const { toast, dismiss } = useToast();
  const canWrite = useCanWrite();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<PublicProblem | null>(null);
  const [proposal, setProposal] = useState<PublicProblem | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submittedRef = useRef(false);

  function openProposal(problem: PublicProblem) {
    submittedRef.current = false;
    setProposal(problem);
  }

  useEffect(() => {
    let active = true;
    Promise.all([listOpenBusinessProblems(), listMyProblemInteractions()]).then(([problems, interactions]) => {
      if (!active) return;
      const saved = new Set(interactions.filter((item) => item.state === "saved").map((item) => item.problemId));
      setState({ status: "ready", problems: selectDeckProblems(problems.filter((problem) => saved.has(problem.id)), {}) });
    }).catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, [attempt]);

  function restore(problem: PublicProblem) {
    setState((current) => current.status === "ready" && !current.problems.some((item) => item.id === problem.id)
      ? { ...current, problems: selectDeckProblems([...current.problems, problem], {}) } : current);
  }

  function remove(problem: PublicProblem) {
    if (!canWrite) return;
    setState((current) => current.status === "ready" ? { ...current, problems: current.problems.filter((item) => item.id !== problem.id) } : current);
    headingRef.current?.focus();
    let undoing = false;
    const request = setProblemInteraction(problem.id, null)
      .then((result) => ({ result, error: null }))
      .catch((error: unknown) => ({ result: null, error: error instanceof ProblemServiceError ? error.message : null }));
    const toastId = toast({
      title: "Quitado de tus Likes", actionLabel: "Deshacer", durationMs: 6000, tone: "neutral",
      onAction: () => {
        if (undoing) return;
        undoing = true;
        void (async () => {
          if ((await request).result !== "unseen") return;
          try {
            if (await setProblemInteraction(problem.id, "saved") !== "saved") throw new Error("No se confirmó la acción.");
            restore(problem);
            toast({ title: "Problema restaurado en tus Likes", tone: "success" });
          } catch (error) {
            toast({ title: "No pudimos deshacer la acción", description: error instanceof ProblemServiceError ? error.message : "Vuelve a intentarlo desde Descubrir.", tone: "danger" });
          }
        })();
      },
    });
    void request.then(({ result, error }) => {
      if (result === "unseen") return;
      dismiss(toastId);
      if (result === null || result === "saved") {
        restore(problem);
        toast({ title: "No pudimos quitar el problema", description: error ?? "Revisa tu conexión e inténtalo de nuevo.", tone: "danger" });
      } else {
        toast({ title: "El estado del problema cambió", description: "Actualizamos tus Likes con el estado confirmado.", tone: "neutral" });
      }
    });
  }

  return <section aria-labelledby="saved-problems-heading">
    <h2 className="font-display text-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" id="saved-problems-heading" ref={headingRef} tabIndex={-1}>Problemas que te interesan</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Aquí aparecen los problemas guardados que siguen abiertos.</p>
    {state.status === "loading" ? <div aria-label="Cargando problemas guardados" className="mt-5 grid gap-4" role="status"><SkeletonCard /><SkeletonCard /></div> : null}
    {state.status === "error" ? <div className="mt-5 rounded-2xl border border-border bg-surface"><EmptyState action={<Button onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>Reintentar</Button>} compact description="Revisa tu conexión e inténtalo de nuevo." icon={Heart} title="No pudimos cargar tus Likes" tone="warning" /></div> : null}
    {state.status === "ready" && !state.problems.length ? <div className="mt-5 rounded-2xl border border-border bg-surface"><EmptyState action={<ButtonLink href="/app/descubrir" variant="outline">Descubrir problemas</ButtonLink>} compact description="Los problemas abiertos que guardes aparecerán aquí." icon={Heart} title="Aún no hay problemas guardados" /></div> : null}
    {state.status === "ready" && state.problems.length ? <div className="mt-5 grid gap-4">{state.problems.map((problem) => <article className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" key={problem.id}>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge icon={Heart} tone="accent">Me interesa</Badge><CompanyTrustChip verified={problem.companyVerified} /><span className="text-xs text-muted-foreground">{problem.industrySnapshot || "Sector empresarial"} · {problem.companyName || "Empresa reservada"}</span></div><h3 className="mt-3 break-words font-display text-base font-semibold">{problem.title}</h3><p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{problem.description}</p><p className="mt-3 font-mono text-sm">{formatProblemBudget(problem.budgetChoice, problem.currency)}</p></div>
      <div className="flex flex-wrap items-center gap-2"><Button disabled={!canWrite} onClick={() => openProposal(problem)}>Proponer</Button><Button onClick={() => setSelected(problem)} variant="outline">Ver detalle</Button><button aria-label={`Quitar ${problem.title} de tus Likes`} className="grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" disabled={!canWrite} onClick={() => remove(problem)} type="button"><X aria-hidden="true" className="size-5" /></button></div>
    </article>)}</div> : null}
    <BottomSheet onClose={() => setSelected(null)} open={Boolean(selected)} title="Detalle del problema">{selected ? <DeckDetail onPropose={() => { openProposal(selected); setSelected(null); }} problem={selected} /> : null}</BottomSheet>
    {proposal ? <ProposalSheet key={proposal.id} onClose={() => { setProposal(null); if (submittedRef.current) window.requestAnimationFrame(() => headingRef.current?.focus()); }} onSubmitted={() => { submittedRef.current = true; setState((current) => current.status === "ready" ? { ...current, problems: current.problems.filter((item) => item.id !== proposal.id) } : current); }} problem={proposal} /> : null}
  </section>;
}
