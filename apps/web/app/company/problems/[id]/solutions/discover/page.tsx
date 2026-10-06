import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanySolutionsFeed } from "@/components/discovery/company-solutions-feed";
import { PROBLEMS } from "@/data/problems";
import { DEMO_COMPANY_ID } from "@/lib/discovery";

type CompanySolutionsPageProps = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PROBLEMS
    .filter((problem) => problem.company.id === DEMO_COMPANY_ID)
    .map((problem) => ({ id: problem.id }));
}

export async function generateMetadata({ params }: CompanySolutionsPageProps): Promise<Metadata> {
  const { id } = await params;
  const problem = PROBLEMS.find((item) => item.id === id && item.company.id === DEMO_COMPANY_ID);
  return { title: problem ? `Soluciones para ${problem.title} | Freework` : "Soluciones | Freework" };
}

export default async function CompanySolutionsPage({ params }: CompanySolutionsPageProps) {
  const { id } = await params;
  const problem = PROBLEMS.find((item) => item.id === id && item.company.id === DEMO_COMPANY_ID);
  if (!problem) notFound();
  return <CompanySolutionsFeed problemId={problem.id} />;
}
