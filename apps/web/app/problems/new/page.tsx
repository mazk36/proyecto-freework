import type { Metadata } from "next";
import { ProblemWizardRoute } from "@/components/publish/problem-wizard-route";

export const metadata: Metadata = {
  title: "Publicar un problema | Freework",
  description: "Describe el problema que quieres resolver y recibe propuestas desde distintas perspectivas.",
};

export default function NewProblemPage() {
  return <ProblemWizardRoute />;
}
