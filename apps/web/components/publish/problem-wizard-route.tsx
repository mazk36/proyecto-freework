"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProblemWizard } from "@/components/publish/problem-wizard";

function WizardFromSearchParams() {
  const searchParams = useSearchParams();
  return <ProblemWizard initialTitle={searchParams.get("title") ?? ""} />;
}

export function ProblemWizardRoute() {
  return (
    <Suspense fallback={<ProblemWizard />}>
      <WizardFromSearchParams />
    </Suspense>
  );
}
