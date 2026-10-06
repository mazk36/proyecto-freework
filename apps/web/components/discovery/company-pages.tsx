"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bookmark, RotateCcw } from "lucide-react";
import { useDemoStore } from "@/components/discovery/demo-store";
import { Button, ButtonLink } from "@/components/ui/button";
import { BudgetDisplay } from "@/components/ui/budget-display";
import { formatMoney } from "@/lib/problem-utils";
import { DEMO_COMPANY_ID, selectCompanyProposals } from "@/lib/discovery";
import { PROBLEMS } from "@/data/problems";

const pageClass = "mx-auto w-full max-w-[1000px] px-5 pb-16 pt-8 sm:px-7 sm:pt-12 lg:px-10";

export function CompanyProblemsPage() {
  const store = useDemoStore();
  if (store.role !== "company") return <RoleNotice title="Mis problemas" />;

  const problems = PROBLEMS.filter((problem) => problem.company.id === DEMO_COMPANY_ID);
  return (
    <section className={pageClass}>
      <PageHeading title="Mis problemas" description="Elige una publicación para revisar las propuestas privadas que recibió." />
      <div className="grid gap-3">
        {problems.map((problem) => {
          const count = selectCompanyProposals(store.proposals, DEMO_COMPANY_ID, problem.id).length;
          return (
            <article className="flex flex-col gap-4 rounded-card border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" key={problem.id}>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground"><strong className="text-foreground">{problem.company.name}</strong> · <BudgetDisplay budget={problem.budget} /></p>
                <h2 className="mt-2 text-lg font-semibold text-foreground">{problem.title}</h2>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">{problem.summary}</p>
              </div>
              <ButtonLink className="w-full sm:w-auto" href={`/company/problems/${problem.id}/solutions/discover`}>
                Revisar {count} {count === 1 ? "solución" : "soluciones"}
                <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
            </article>
          );
        })}
      </div>
      <ButtonLink className="mt-6" href="/problems/new" variant="outline">Publicar otro problema</ButtonLink>
    </section>
  );
}

export function CompanySavedItemsPage() {
  const router = useRouter();
  const store = useDemoStore();
  const saved = selectCompanyProposals(store.proposals, DEMO_COMPANY_ID).filter(
    (proposal) => store.proposalInteractions[proposal.id] === "saved",
  );
  if (store.role !== "company") return <RoleNotice title="Saved" />;

  return (
    <section className={pageClass}>
      <PageHeading title="Saved" description="Soluciones que guardaste al revisar los problemas de Nova Retail." />
      {saved.length ? (
        <div className="grid gap-3">
          {saved.map((proposal) => {
            const problem = PROBLEMS.find((item) => item.id === proposal.problemId);
            return (
              <article className="rounded-card border border-border bg-white p-5 sm:p-6" key={proposal.id}>
                <p className="text-xs font-semibold text-muted-foreground">{problem?.title ?? "Problema"} · {proposal.freelancer.name}</p>
                <h2 className="mt-2 text-lg font-semibold text-foreground">{proposal.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{proposal.approach}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span>{proposal.estimatedTimeline}</span>
                  <span className="font-semibold text-foreground">{formatMoney(proposal.price, proposal.currency)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => {
                    store.setProposalInteraction(proposal.id, null);
                    if (problem) router.push(`/company/problems/${problem.id}/solutions/discover`);
                  }}>Quitar de Saved y revisar</Button>
                  {problem ? <ButtonLink href={`/problems/${problem.id}`} variant="outline">Ver problema</ButtonLink> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Bookmark aria-hidden="true" className="size-5" />} title="Todavía no has guardado soluciones." description="En el feed de empresa, guarda las propuestas que quieras comparar más adelante." action={<ButtonLink href="/discover">Descubrir soluciones</ButtonLink>} />
      )}
    </section>
  );
}

export function CompanyDismissedItemsPage() {
  const store = useDemoStore();
  const dismissed = selectCompanyProposals(store.proposals, DEMO_COMPANY_ID).filter(
    (proposal) => store.proposalInteractions[proposal.id] === "dismissed",
  );
  if (store.role !== "company") return <RoleNotice title="Descartadas" />;

  return (
    <section className={pageClass}>
      <PageHeading title="Soluciones descartadas" description="Puedes restaurar una propuesta y volverá al Discovery del problema correspondiente." />
      {dismissed.length ? (
        <div className="grid gap-3">
          {dismissed.map((proposal) => {
            const problem = PROBLEMS.find((item) => item.id === proposal.problemId);
            return (
              <article className="rounded-card border border-border bg-white p-5 sm:p-6" key={proposal.id}>
                <p className="text-xs font-semibold text-muted-foreground">{problem?.title ?? "Problema"} · {proposal.freelancer.name}</p>
                <h2 className="mt-2 text-lg font-semibold text-foreground">{proposal.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{proposal.approach}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => store.setProposalInteraction(proposal.id, null)} variant="outline">Restaurar</Button>
                  {problem ? <ButtonLink href={`/company/problems/${problem.id}/solutions/discover`} variant="quiet">Ver soluciones del problema</ButtonLink> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<RotateCcw aria-hidden="true" className="size-5" />} title="No tienes soluciones descartadas." description="Las propuestas que descartes desde Discover estarán disponibles aquí." action={<ButtonLink href="/discover">Volver a Discover</ButtonLink>} />
      )}
    </section>
  );
}

function RoleNotice({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-2xl px-5 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Vista de empresa</p>
      <h1 className="mt-2 text-2xl font-semibold">{title} solo está disponible en el rol Empresa.</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Cambia el rol de demostración desde el selector de la barra superior.</p>
      <ButtonLink className="mt-5" href="/discover" variant="outline">Ir a Discover</ButtonLink>
    </section>
  );
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-7 max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Nova Retail</p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </header>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <section className="grid min-h-[300px] place-items-center rounded-card border border-dashed border-border bg-white px-6 py-10 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</span>
        <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-center">{action}</div>
      </div>
    </section>
  );
}
