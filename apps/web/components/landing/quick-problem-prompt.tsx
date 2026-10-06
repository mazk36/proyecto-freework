"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function QuickProblemPrompt() {
  const router = useRouter();
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    router.push(cleanTitle ? `/problems/new?title=${encodeURIComponent(cleanTitle)}` : "/problems/new");
  }

  return (
    <form
      className="rounded-2xl border border-border bg-white p-2 shadow-[0_14px_50px_-35px_rgba(36,27,65,0.45)] sm:flex sm:items-center"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="hero-problem-title">
        Describe brevemente el problema que quieres resolver
      </label>
      <input
        className="min-h-12 w-full bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/75 sm:min-w-0 sm:flex-1"
        id="hero-problem-title"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Describe brevemente tu problema..."
        value={title}
      />
      <button
        className="mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:mt-0 sm:w-auto"
        type="submit"
      >
        Publicar problema
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
    </form>
  );
}
