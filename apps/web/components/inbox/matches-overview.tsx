"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { MyMatches } from "./my-matches";

export function MatchesOverview() {
  const { user } = useAuth();
  if (!user) return null;
  return <main className="matches-overview mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12"><header className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-lavender">Centro de interacciones</p><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Matches</h1></header><MyMatches key={user.id} role={user.role} /></main>;
}
