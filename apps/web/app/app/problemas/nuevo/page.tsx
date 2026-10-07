import type { Metadata } from "next";
import { ProblemPublishingPlaceholder } from "@/components/app/problem-publishing-placeholder";

export const metadata: Metadata = { title: "Publicar un problema | Freework" };

export default function NewProblemPage() {
  return <ProblemPublishingPlaceholder />;
}
