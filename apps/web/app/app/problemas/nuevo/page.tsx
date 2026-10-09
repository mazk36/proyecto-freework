import type { Metadata } from "next";
import { ProblemPublishingWizard } from "@/components/app/problem-publishing-wizard";

export const metadata: Metadata = { title: "Publicar un problema | MatchWork" };

export default function NewProblemPage() {
  return <ProblemPublishingWizard />;
}
