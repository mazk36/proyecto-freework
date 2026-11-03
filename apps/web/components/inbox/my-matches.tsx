"use client";

import { Heart, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { formatInboxDate } from "@/lib/company-inbox";
import { listMyMatches, type MyMatch } from "@/lib/company-inbox-service";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; matches: MyMatch[] };

export function MyMatches({ role }: { role: "company" | "freelancer" }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void listMyMatches().then((matches) => {
      if (active) setState({ status: "ready", matches });
    }).catch((error: unknown) => {
      if (active) setState({ status: "error", message: error instanceof Error ? error.message : "No pudimos cargar tus Matches." });
    });
    return () => { active = false; };
  }, [attempt]);

  return <section aria-labelledby="matches-heading">
    <h2 className="font-display text-xl font-semibold" id="matches-heading">Tus Matches</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Conexiones para continuar la conversación sobre cada problema.</p>
    {state.status === "loading" ? <div aria-label="Cargando Matches" className="mt-5 grid gap-4" role="status"><span className="sr-only">Cargando Matches</span><SkeletonCard /><SkeletonCard /></div> : null}
    {state.status === "error" ? <div className="mt-5 rounded-2xl border border-border bg-surface"><EmptyState action={<Button onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>Reintentar</Button>} description={state.message} icon={RotateCcw} title="No pudimos cargar tus Matches" tone="warning" /></div> : null}
    {state.status === "ready" && !state.matches.length ? <div className="mt-5 rounded-2xl border border-border bg-surface"><EmptyState action={<ButtonLink href={role === "freelancer" ? "/app/descubrir" : "/app/propuestas"} variant="outline">{role === "freelancer" ? "Descubrir problemas" : "Ver propuestas"}</ButtonLink>} description={role === "freelancer" ? "Cuando una empresa muestre interés en tu propuesta, aparecerá aquí." : "Cuando muestres interés en una propuesta, el Match aparecerá aquí."} icon={Heart} title="Tus Matches aparecerán aquí" /></div> : null}
    {state.status === "ready" && state.matches.length > 0 ? <div className="mt-5 grid gap-4">{state.matches.map((match) => <article className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" key={match.matchId}>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge icon={Heart} tone="accent">Hicieron Match</Badge><span className="text-xs text-muted-foreground">{formatInboxDate(match.createdAt)}</span></div><h3 className="mt-3 break-words font-display font-semibold">{match.counterpartName || (role === "freelancer" ? "Empresa reservada" : "Profesional de MatchWork")}</h3><p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{match.problemTitle}</p></div>
      <ButtonLink href={`/app/chats?match=${encodeURIComponent(match.matchId)}`} variant="outline">Ver chat</ButtonLink>
    </article>)}</div> : null}
  </section>;
}
