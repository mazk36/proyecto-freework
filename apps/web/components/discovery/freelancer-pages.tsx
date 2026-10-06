"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bookmark, Check, RotateCcw, Settings2, ShieldCheck } from "lucide-react";
import { ProposalComposer } from "@/components/discovery/proposal-composer";
import { useDemoStore } from "@/components/discovery/demo-store";
import { Button, ButtonLink } from "@/components/ui/button";
import { BudgetDisplay } from "@/components/ui/budget-display";
import { formatMoney } from "@/lib/problem-utils";
import {
  DEMO_FREELANCER,
  getFreelancerProposalStatus,
  selectFreelancerProposals,
} from "@/lib/discovery";
import { PROBLEMS } from "@/data/problems";
import type { FreelancerProposalStatus } from "@/types/domain";

const pageClass = "mx-auto w-full max-w-[1000px] px-5 pb-16 pt-8 sm:px-7 sm:pt-12 lg:px-10";

export function FreelancerSavedItemsPage() {
  const router = useRouter();
  const store = useDemoStore();
  const [composerProblemId, setComposerProblemId] = useState<string | null>(null);
  const saved = PROBLEMS.filter((problem) => store.problemInteractions[problem.id] === "saved");
  const composerProblem = PROBLEMS.find((problem) => problem.id === composerProblemId) ?? null;

  return (
    <section className={pageClass}>
      <PageHeading eyebrow="Tu lista" title="Saved" description="Problemas que guardaste para revisar con más tiempo." />
      {saved.length ? (
        <div className="grid gap-3">
          {saved.map((problem) => (
            <article className="rounded-card border border-border bg-white p-5 sm:p-6" key={problem.id}>
              <p className="text-xs font-semibold text-muted-foreground">{problem.company.name} · <BudgetDisplay budget={problem.budget} /></p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-foreground">{problem.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{problem.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href={`/problems/${problem.id}`} variant="outline">Ver problema</ButtonLink>
                <Button onClick={() => setComposerProblemId(problem.id)}>Proponer solución</Button>
                <Button onClick={() => store.setProblemInteraction(problem.id, null)} variant="quiet">Quitar de guardados</Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Bookmark aria-hidden="true" className="size-5" />} title="Todavía no has guardado oportunidades." description="En Discover puedes guardar los problemas que quieras revisar después." action={<ButtonLink href="/discover">Ir a Discover <ArrowRight aria-hidden="true" className="size-4" /></ButtonLink>} />
      )}
      <ProposalComposer
        onClose={() => setComposerProblemId(null)}
        onSubmit={(problemId, draft) => store.submitProposal(problemId, draft)}
        onSubmitted={() => {
          setComposerProblemId(null);
          router.push("/proposals");
        }}
        problem={composerProblem}
      />
    </section>
  );
}

export function FreelancerDismissedItemsPage() {
  const store = useDemoStore();
  const dismissed = PROBLEMS.filter((problem) => store.problemInteractions[problem.id] === "dismissed");
  return (
    <section className={pageClass}>
      <PageHeading eyebrow="Puedes volver a verlos" title="Problemas descartados" description="Restaurar un problema lo devuelve a tu conjunto elegible de Discovery." />
      {dismissed.length ? (
        <div className="grid gap-3">
          {dismissed.map((problem) => (
            <article className="rounded-card border border-border bg-white p-5 sm:p-6" key={problem.id}>
              <p className="text-xs font-semibold text-muted-foreground">{problem.company.name} · <BudgetDisplay budget={problem.budget} /></p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">{problem.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{problem.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => store.setProblemInteraction(problem.id, null)} variant="outline">Restaurar</Button>
                <ButtonLink href={`/problems/${problem.id}`} variant="quiet">Ver problema</ButtonLink>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<RotateCcw aria-hidden="true" className="size-5" />} title="No tienes oportunidades descartadas." description="Los problemas que pases desde Discover aparecerán aquí y podrás restaurarlos." action={<ButtonLink href="/discover">Ir a Discover</ButtonLink>} />
      )}
    </section>
  );
}

const proposalStatusLabels: Record<FreelancerProposalStatus, string> = {
  sent: "Enviada",
  saved: "Guardada por la empresa",
  matched: "¡Hay Match!",
  dismissed: "Descartada por la empresa",
};

export function MyProposalsPage() {
  const store = useDemoStore();
  if (store.role !== "freelancer") {
    return <section className={pageClass}><PageHeading eyebrow="Vista de freelancer" title="My proposals" description="Cambia el rol de demostración en la barra superior para ver tus propuestas." /></section>;
  }
  const proposals = selectFreelancerProposals(store.proposals, DEMO_FREELANCER.id);
  return (
    <section className={pageClass}>
      <PageHeading eyebrow="Tu actividad" title="My proposals" description="Solo tú puedes ver tus propuestas y el estado que les asignó la empresa." />
      <p className="mb-5 flex items-center gap-2 rounded-xl border border-accent/15 bg-accent-soft/50 px-4 py-3 text-xs leading-5 text-foreground/75">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-accent" />
        Las propuestas de otros freelancers no aparecen en esta vista.
      </p>
      {proposals.length ? (
        <div className="grid gap-3">
          {proposals.map((proposal) => {
            const problem = PROBLEMS.find((item) => item.id === proposal.problemId);
            const status = getFreelancerProposalStatus(proposal, store.matches, store.proposalInteractions);
            return (
              <article className="rounded-card border border-border bg-white p-5 sm:p-6" key={proposal.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-muted-foreground">{problem?.company.name ?? "Empresa"}{problem ? ` · ${problem.title}` : ""}</p>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === "matched" ? "bg-accent-soft text-accent" : "bg-surface text-muted-foreground"}`}>{proposalStatusLabels[status]}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-foreground">{proposal.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{proposal.approach}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span>Tiempo: <strong className="text-foreground">{proposal.estimatedTimeline}</strong></span>
                  <span>Precio: <strong className="text-foreground">{formatMoney(proposal.price, proposal.currency)}</strong></span>
                  {problem ? <Link className="font-semibold text-accent hover:underline" href={`/problems/${problem.id}`}>Ver problema</Link> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Check aria-hidden="true" className="size-5" />} title="Aún no has enviado propuestas." description="Explora una oportunidad y presenta tu enfoque cuando quieras participar." action={<ButtonLink href="/discover">Descubrir problemas</ButtonLink>} />
      )}
    </section>
  );
}

export function PreferencesPage() {
  const store = useDemoStore();
  const [preferredHashtags, setPreferredHashtags] = useState(store.preferences.preferredHashtags);
  const [maxBudget, setMaxBudget] = useState(store.preferences.maxBudget?.toString() ?? "");
  const tags = Array.from(new Set(PROBLEMS.flatMap((problem) => problem.hashtags))).sort((a, b) => a.localeCompare(b, "es"));
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!store.hydrated) return;
    setPreferredHashtags(store.preferences.preferredHashtags);
    setMaxBudget(store.preferences.maxBudget?.toString() ?? "");
  }, [store.hydrated, store.preferences]);

  function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedBudget = maxBudget.trim() ? Number(maxBudget) : null;
    if (parsedBudget !== null && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
      setNotice("Ingresa un presupuesto máximo igual o mayor que cero.");
      return;
    }
    store.setPreferences({ preferredHashtags, maxBudget: parsedBudget });
    setNotice("Tus preferencias se actualizaron y se guardaron en este navegador.");
  }

  return (
    <section className={`${pageClass} max-w-3xl`}>
      <PageHeading eyebrow="Discovery" title="Preferencias" description="Una puntuación sencilla ordena oportunidades por tus temas, presupuesto y fecha de publicación." />
      <form className="rounded-card border border-border bg-white p-5 sm:p-7" onSubmit={savePreferences}>
        <fieldset>
          <legend className="text-sm font-semibold text-foreground">Temas que te interesan</legend>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Se priorizan problemas que incluyan uno o más de estos hashtags.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {tags.map((tag) => (
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm text-foreground" key={tag}>
                <input
                  checked={preferredHashtags.includes(tag)}
                  className="size-4 accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  onChange={(event) => setPreferredHashtags((current) => event.target.checked ? [...new Set([...current, tag])] : current.filter((value) => value !== tag))}
                  type="checkbox"
                  value={tag}
                />
                #{tag}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-6 border-t border-border pt-5">
          <label className="block text-sm font-semibold text-foreground" htmlFor="max-budget">Presupuesto máximo que te interesa</label>
          <div className="mt-2 flex max-w-sm items-center rounded-xl border border-border bg-white focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10">
            <span aria-hidden="true" className="pl-3.5 text-sm text-muted-foreground">USD</span>
            <input className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none" id="max-budget" min="0" onChange={(event) => setMaxBudget(event.target.value)} placeholder="Sin límite" step="100" type="number" value={maxBudget} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Déjalo vacío para no priorizar por presupuesto.</p>
        </div>
        {notice ? <p className="mt-4 text-sm text-foreground" role="status">{notice}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
          <Button type="submit"><Check aria-hidden="true" className="size-4" />Guardar preferencias</Button>
          <ButtonLink href="/discover" variant="outline">Volver a Discover</ButtonLink>
        </div>
      </form>
    </section>
  );
}

export function ProfilePage() {
  const store = useDemoStore();
  const [resetMessage, setResetMessage] = useState("");
  return (
    <section className={`${pageClass} max-w-3xl`}>
      <PageHeading eyebrow="Perfil de demostración" title="Profile" description="La cuenta y el rol son simulados. No se ha implementado autenticación." />
      <div className="rounded-card border border-border bg-white p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Rol actual</p>
        <p className="mt-2 text-lg font-semibold text-foreground">{store.role === "freelancer" ? DEMO_FREELANCER.name : "Nova Retail"}</p>
        {store.role === "freelancer" ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{DEMO_FREELANCER.description}</p> : <p className="mt-1 text-sm leading-6 text-muted-foreground">Empresa de demostración · Comercio</p>}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
          {store.role === "freelancer" ? <ButtonLink href="/discover/preferences" variant="outline"><Settings2 aria-hidden="true" className="size-4" />Preferencias</ButtonLink> : <ButtonLink href="/company/problems" variant="outline">Mis problemas</ButtonLink>}
          <Button onClick={() => { store.resetDemoState(); setResetMessage("La demo volvió a su estado inicial."); }} variant="quiet"><RotateCcw aria-hidden="true" className="size-4" />Reiniciar demo</Button>
        </div>
        {resetMessage ? <p className="mt-3 text-sm text-foreground" role="status">{resetMessage}</p> : null}
      </div>
      <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-xs leading-5 text-muted-foreground">
        La privacidad de las propuestas es una regla de interfaz y datos mock. La autorización real tendrá que aplicarse en el servidor antes de incorporar datos de usuarios.
      </p>
    </section>
  );
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="mb-7 max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
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
