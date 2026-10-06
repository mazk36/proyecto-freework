import type { Metadata } from "next";
import { ProblemWizard } from "@/components/publish/problem-wizard";

export const metadata: Metadata = {
  title: "Publicar un problema | Freework",
  description: "Describe el problema que quieres resolver y recibe propuestas desde distintas perspectivas.",
};

type NewProblemPageProps = {
  searchParams: Promise<{ title?: string | string[] }>;
};

export default async function NewProblemPage({ searchParams }: NewProblemPageProps) {
  const params = await searchParams;
  const initialTitle = Array.isArray(params.title) ? params.title[0] : params.title;

  return <ProblemWizard initialTitle={initialTitle ?? ""} />;
}
