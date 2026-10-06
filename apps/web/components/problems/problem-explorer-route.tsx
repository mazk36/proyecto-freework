"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProblemExplorer } from "@/components/problems/problem-explorer";

function ExplorerFromSearchParams({ now }: { now: number }) {
  const searchParams = useSearchParams();
  return <ProblemExplorer initialQuery={searchParams.get("search") ?? ""} now={now} />;
}

export function ProblemExplorerRoute({ now }: { now: number }) {
  return (
    <Suspense fallback={<ProblemExplorer initialQuery="" now={now} />}>
      <ExplorerFromSearchParams now={now} />
    </Suspense>
  );
}
