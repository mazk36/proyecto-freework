"use client";

import { useEffect, useRef } from "react";
import { ProposalForm } from "@/components/proposals/proposal-form";
import type { Problem, ProposalDraft } from "@/types/domain";

type ProposalComposerProps = {
  problem: Problem | null;
  onClose: () => void;
  onSubmit: (problemId: string, draft: ProposalDraft) => string | null;
  onSubmitted: (proposalId: string) => void;
};

export function ProposalComposer({ problem, onClose, onSubmit, onSubmitted }: ProposalComposerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (problem && !dialog.open) dialog.showModal();
    if (!problem && dialog.open) dialog.close();
  }, [problem]);

  return (
    <dialog
      aria-labelledby="proposal-composer-title"
      className="m-auto max-h-[90dvh] w-[calc(100%-1.25rem)] max-w-3xl overflow-y-auto rounded-[24px] border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/45 sm:w-[calc(100%-3rem)]"
      onClose={onClose}
      ref={dialogRef}
    >
      {problem ? (
        <div className="p-3 sm:p-5">
          <p className="mb-3 px-3 pt-2 text-xs leading-5 text-muted-foreground sm:px-4">
            Para: <span className="font-semibold text-foreground">{problem.title}</span>
          </p>
          <ProposalForm
            onCancel={onClose}
            onSubmit={(draft) => {
              const proposalId = onSubmit(problem.id, draft);
              if (proposalId) onSubmitted(proposalId);
            }}
          />
        </div>
      ) : null}
      <span className="sr-only" id="proposal-composer-title">Proponer una solución</span>
    </dialog>
  );
}
