"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { selectDeckProblems } from "@/lib/deck";
import { listMyProblemInteractions } from "@/lib/interaction-service";
import { formatProblemBudget, type PublicProblem } from "@/lib/problem-domain";
import { listOpenBusinessProblems } from "@/lib/problem-service";
import { DeckDetail } from "./deck-detail";
import { ProposalPlaceholder } from "./proposal-placeholder";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; problems: PublicProblem[] };

export function SavedProblems() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<PublicProblem | null>(null);
  const [proposal, setProposal] = useState<PublicProblem | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listOpenBusinessProblems(), listMyProblemInteractions()]).then(([problems, interactions]) => {
      if (!active) return;
      const saved = new Set(interactions.filter((item) => item.state === "saved").map((item) => item.problemId));
      setState({ status: "ready", problems: selectDeckProblems(problems.filter((problem) => saved.has(problem.id)), {}) });
    }).catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, [attempt]);

  return <section aria-labelledby="saved-problems-heading" className="mt-10">
    <h2 className="font-display text-xl font-semibold" id="saved-problems-heading">Problemas que te interesan</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Aquí aparecen los problemas guardados que siguen abiertos.</p>
    {state.status === "loading" ? <div aria-label="Cargando problemas guardados" className="mt-5 grid gap-4 sm:grid-cols-2" role="status"><SkeletonCard /><SkeletonCard /></div> : null}
    {state.status === "error" ? <div className="mt-5 rounded-2xl border border-border bg-surface"><EmptyState action={<Button onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>Reintentar</Button>} compact description="Revisa tu conexión e inténtalo de nuevo." icon={Heart} title="No pudimos cargar tus Likes" tone="warning" /></div> : null}
    {state.status === "ready" && !state.problems.length ? <div className="mt-5 rounded-2xl border border-border bg-surface"><EmptyState action={<ButtonLink href="/app/descubrir" variant="outline">Descubrir problemas</ButtonLink>} compact description="Los problemas abiertos que guardes aparecerán aquí." icon={Heart} title="Aún no hay problemas guardados" /></div> : null}
    {state.status === "ready" && state.problems.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{state.problems.map((problem) => <article className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-5" key={problem.id}><p className="text-xs text-muted-foreground">{problem.industrySnapshot || "Sector empresarial"} · {problem.companyName || "Empresa reservada"}</p><h3 className="mt-3 break-words font-display text-base font-semibold">{problem.title}</h3><p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{problem.description}</p><p className="mt-4 font-mono text-sm">{formatProblemBudget(problem.budgetChoice, problem.currency)}</p><Button className="mt-4 self-start" onClick={() => setSelected(problem)} variant="outline">Ver detalle</Button></article>)}</div> : null}
    <BottomSheet onClose={() => setSelected(null)} open={Boolean(selected)} title="Detalle del problema">{selected ? <DeckDetail onPropose={() => { setProposal(selected); setSelected(null); }} problem={selected} /> : null}</BottomSheet>
    <ProposalPlaceholder onClose={() => setProposal(null)} problem={proposal} />
  </section>;
}
