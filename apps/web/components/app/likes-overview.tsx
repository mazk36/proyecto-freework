"use client";

import { ArrowUpRight, Bookmark, Heart, MessagesSquare, Send } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MyMatches } from "@/components/inbox/my-matches";
import { MyProposals } from "@/components/proposals/my-proposals";
import { SavedProblems } from "@/components/swipe/saved-problems";

export function LikesOverview() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "freelancer") return <FreelancerLikes key={user.id} />;

  const isCompany = user.role === "company";
  const cards = [
    {
      href: "/app/propuestas",
      icon: Send,
      title: isCompany ? "Propuestas recibidas" : "Mis propuestas",
      description: "Revisa las propuestas enviadas para cada uno de tus problemas.",
    },
    {
      href: isCompany ? "/app/guardados" : "#saved-problems-heading",
      icon: Bookmark,
      title: isCompany ? "Propuestas guardadas" : "Problemas guardados",
      description: isCompany ? "Revisa las propuestas que guardaste para consultar después." : "Revisa más abajo los problemas abiertos que guardaste desde Descubrir.",
    },
    {
      href: "/app/matches",
      icon: Heart,
      title: "Matches",
      description: "Consulta los Matches que hiciste para continuar la conversación.",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-lavender">Centro de interacciones</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Likes</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          Da seguimiento a propuestas, elementos guardados y Matches sin perder el contexto de cada problema.
        </p>
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {cards.map(({ href, icon: Icon, title, description }) => (
          <Link
            className="group flex min-h-52 min-w-0 flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/50 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-6"
            href={href}
            key={href}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-brand-lavender">
                <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </span>
              <ArrowUpRight aria-hidden="true" className="size-5 text-muted-foreground transition-colors group-hover:text-foreground" />
            </div>
            <h2 className="mt-5 text-lg font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5 text-sm">
        <Link className="inline-flex min-h-11 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/app/chats">
          <MessagesSquare aria-hidden="true" className="size-4" />
          Ir a Chats
        </Link>
      </div>

    </section>
  );
}

function FreelancerLikes() {
  const tabs = ["Me interesan", "Propuestas enviadas", "Matches"] as const;
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    tabRefs.current[next]?.focus();
  }

  return <section className="freelancer-likes mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
    <header className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-lavender">Centro de interacciones</p><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Likes</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Da seguimiento a tus intereses, propuestas y Matches sin perder el contexto de cada problema.</p></header>
    <div aria-label="Tus interacciones" className="mt-8 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface p-1 sm:max-w-2xl" role="tablist">
      {tabs.map((label, index) => <button aria-controls={`likes-panel-${index}`} aria-selected={selected === index} className={`min-h-12 min-w-0 rounded-xl px-2 py-2 text-xs font-semibold leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-4 sm:text-sm ${selected === index ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"}`} id={`likes-tab-${index}`} key={label} onClick={() => setSelected(index)} onKeyDown={(event) => handleKey(event, index)} ref={(element) => { tabRefs.current[index] = element; }} role="tab" tabIndex={selected === index ? 0 : -1} type="button">{label}</button>)}
    </div>
    {tabs.map((label, index) => <div aria-labelledby={`likes-tab-${index}`} className="mt-8" hidden={selected !== index} id={`likes-panel-${index}`} key={label} role="tabpanel" tabIndex={0}>
      {selected === index && index === 0 ? <SavedProblems /> : null}
      {selected === index && index === 1 ? <MyProposals /> : null}
      {selected === index && index === 2 ? <MyMatches role="freelancer" /> : null}
    </div>)}
  </section>;
}
