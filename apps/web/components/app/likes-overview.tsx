"use client";

import { ArrowUpRight, Bookmark, Heart, MessagesSquare, Send } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

export function LikesOverview() {
  const { user } = useAuth();
  if (!user) return null;

  const isCompany = user.role === "company";
  const cards = [
    {
      href: "/app/propuestas",
      icon: Send,
      title: isCompany ? "Propuestas recibidas" : "Mis propuestas",
      description: "El seguimiento se habilitará cuando esté disponible la integración segura de propuestas.",
    },
    {
      href: "/app/guardados",
      icon: Bookmark,
      title: isCompany ? "Propuestas guardadas" : "Problemas guardados",
      description: "Revisa aquí los elementos que hayas guardado cuando la función esté conectada.",
    },
    {
      href: "/app/matches",
      icon: Heart,
      title: "Matches",
      description: "Las conexiones mutuas aparecerán aquí cuando exista una fuente real de Matches.",
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
        <Link className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/app/chats">
          <MessagesSquare aria-hidden="true" className="size-4" />
          Ir a Chats
        </Link>
      </div>

    </section>
  );
}
