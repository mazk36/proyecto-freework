import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProblemDetail } from "@/components/problems/problem-detail";
import { PROBLEMS, PROPOSALS_BY_PROBLEM } from "@/data/problems";

type ProblemPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ProblemPageProps): Promise<Metadata> {
  const { id } = await params;
  const problem = PROBLEMS.find((item) => item.id === id);

  return problem
    ? {
        title: `${problem.title} | Freework`,
        description: problem.summary,
      }
    : { title: "Problema no encontrado | Freework" };
}

export default async function ProblemPage({ params }: ProblemPageProps) {
  const { id } = await params;
  const problem = PROBLEMS.find((item) => item.id === id);
  if (!problem) notFound();

  return (
    <ProblemDetail
      problem={problem}
      proposals={PROPOSALS_BY_PROBLEM[problem.id] ?? []}
    />
  );
}
