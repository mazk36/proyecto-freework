import type { Metadata } from "next";
import { ProblemExplorer } from "@/components/problems/problem-explorer";

export const metadata: Metadata = {
  title: "Explorar problemas | Freework",
  description: "Explora problemas y descubre distintas formas de resolverlos.",
};

type ProblemsPageProps = {
  searchParams: Promise<{ search?: string | string[] }>;
};

export default async function ProblemsPage({ searchParams }: ProblemsPageProps) {
  const params = await searchParams;
  const search = Array.isArray(params.search) ? params.search[0] : params.search;

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 pb-16 pt-10 sm:px-7 sm:pb-20 sm:pt-14 lg:px-10">
      <header className="mb-8 max-w-3xl sm:mb-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-accent">
          Explorar problemas
        </p>
        <h1 className="text-balance text-4xl font-semibold leading-tight tracking-[-0.05em] text-foreground sm:text-5xl">
          Hay problemas esperando otra perspectiva.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Filtra por el contexto del problema, no por una solución técnica predeterminada.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Datos ficticios para esta demostración. No hay empresas ni propuestas reales.
        </p>
      </header>
      <ProblemExplorer initialQuery={search ?? ""} now={Date.now()} />
    </div>
  );
}
