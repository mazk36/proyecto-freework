"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { PublicProblem } from "@/lib/problem-domain";

export function ProposalPlaceholder({ problem, onClose }: { problem: PublicProblem | null; onClose: () => void }) {
  return <BottomSheet onClose={onClose} open={Boolean(problem)} title="Proponer ahora">
    <p className="font-display text-base font-semibold">{problem?.title}</p>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">La propuesta completa llega en el siguiente paso.</p>
    <Button className="mt-6" onClick={onClose} variant="outline">Cerrar</Button>
  </BottomSheet>;
}
