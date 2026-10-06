"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Handshake } from "lucide-react";
import { useDemoStore } from "@/components/discovery/demo-store";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/problem-utils";
import { DEMO_COMPANY_ID, DEMO_FREELANCER } from "@/lib/discovery";
import { PROBLEMS } from "@/data/problems";

function MatchDetailContent() {
  const searchParams = useSearchParams();
  const store = useDemoStore();
  const id = searchParams.get("match");
  const match = store.matches.find((item) =>
    item.id === id && (store.role === "company" ? item.companyId === DEMO_COMPANY_ID : item.freelancerId === DEMO_FREELANCER.id),
  );
  const problem = match ? PROBLEMS.find((item) => item.id === match.problemId) : undefined;
  const proposal = match ? store.proposals.find((item) => item.id === match.proposalId) : undefined;

  if (!match || !problem || !proposal) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-2xl font-semibold">No encontramos ese Match</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Quizá no está disponible para el rol de demostración actual.</p>
        <ButtonLink className="mt-5" href="/matches" variant="outline">Ver Matches</ButtonLink>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-7 sm:pt-12">
      <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/matches">
        <ArrowLeft aria-hidden="true" className="size-4" />Volver a Matches
      </Link>
      <article className="mt-6 rounded-[24px] border border-border bg-white p-6 sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent"><Handshake aria-hidden="true" className="size-7" /></span>
        <p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.14em] text-accent">Interés mutuo</p>
        <h1 className="mt-2 text-center text-3xl font-semibold tracking-[-0.05em] text-foreground">¡Hicieron Match!</h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-6 text-muted-foreground">Aquí podrán negociar los detalles del proyecto. El chat estará disponible en la siguiente fase.</p>
        <div className="mt-7 rounded-2xl bg-background p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Problema</p>
          <h2 className="mt-1.5 font-semibold text-foreground">{problem.title}</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
            <div><dt className="text-xs text-muted-foreground">Empresa</dt><dd className="mt-1 font-medium">{problem.company.name}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Freelancer</dt><dd className="mt-1 font-medium">{proposal.freelancer.name}</dd></div>
          </dl>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Solución acordada para conversar</p>
            <p className="mt-1.5 font-semibold text-foreground">{proposal.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatMoney(proposal.price, proposal.currency)} · {proposal.estimatedTimeline}</p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">Este Match no significa contratación, pago ni contrato.</p>
        <div className="mt-6 flex justify-center"><ButtonLink href="/matches" variant="outline">Volver a mis Matches</ButtonLink></div>
      </article>
    </section>
  );
}

export function MatchDetailRoute() {
  return (
    <Suspense fallback={<section className="mx-auto max-w-2xl px-5 py-16 text-center"><p className="text-sm text-muted-foreground">Cargando Match…</p></section>}>
      <MatchDetailContent />
    </Suspense>
  );
}
