"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCanWrite } from "@/components/app/account-status";
import { ProblemServiceError } from "@/lib/problem-service";
import {
  initialProposalFormState,
  createProposalSaveQueue,
  proposalErrors,
  proposalFormReducer,
  proposalSaveDelay,
  type ProposalFormAction,
} from "@/lib/proposal-form";
import type { ProposalServices } from "@/lib/proposal-service";

function friendlyError(error: unknown, fallback: string): string {
  return error instanceof ProblemServiceError ? error.message : fallback;
}

export function useProposalForm(problemId: string, services: ProposalServices, onClose: () => void, onSubmitted: () => void) {
  const canWrite = useCanWrite();
  const [state, setState] = useState(initialProposalFormState);
  const stateRef = useRef(state);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<"saving" | "submitting" | null>(null);
  const busyRef = useRef(false);
  const [saveQueue] = useState(createProposalSaveQueue);
  const mounted = useRef(false);

  const dispatch = useCallback((action: ProposalFormAction) => {
    const next = proposalFormReducer(stateRef.current, action);
    stateRef.current = next;
    if (mounted.current) setState(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    services.list().then((proposals) => {
      if (!active) return;
      const proposal = proposals.find((item) => item.problemId === problemId && item.status !== "withdrawn");
      dispatch({ type: "load", proposal });
    }).catch((error: unknown) => {
      if (active) dispatch({ type: "load-error", message: friendlyError(error, "No pudimos cargar tu borrador. Revisa tu conexión e inténtalo de nuevo.") });
    });
    return () => { active = false; mounted.current = false; };
  }, [attempt, dispatch, problemId, services]);

  const persist = useCallback((force: boolean): Promise<boolean> => saveQueue.run(async () => {
    if (!canWrite || !mounted.current || (!force && busyRef.current)) return false;
    const snapshot = stateRef.current;
    if (snapshot.phase !== "ready") return false;
    if (!force && snapshot.revision <= snapshot.savedRevision) return true;
    const errors = proposalErrors(snapshot.draft, true);
    if (Object.keys(errors).length) {
      dispatch({ type: "validation-error", errors, message: "No pudimos guardar el borrador. Revisa los campos indicados." });
      return false;
    }
    dispatch({ type: "save-start" });
    try {
      const id = await services.save(problemId, snapshot.draft);
      dispatch({ type: "save-success", id, revision: snapshot.revision });
      return true;
    } catch (error) {
      dispatch({ type: "save-error", message: friendlyError(error, "No pudimos guardar el borrador. Revisa tu conexión e inténtalo de nuevo.") });
      return false;
    }
  }), [canWrite, dispatch, problemId, saveQueue, services]);

  useEffect(() => {
    const delay = proposalSaveDelay(state);
    if (!canWrite || delay === null || busy) return;
    const timer = window.setTimeout(() => { void persist(false); }, delay);
    return () => window.clearTimeout(timer);
  }, [busy, canWrite, persist, state]);

  async function saveAndClose(force: boolean) {
    if (busyRef.current) return;
    if (!canWrite) { onClose(); return; }
    const current = stateRef.current;
    if (current.phase !== "ready") { onClose(); return; }
    if (!force && current.revision <= current.savedRevision && !saveQueue.pending) { onClose(); return; }
    busyRef.current = true;
    setBusy("saving");
    const saved = await persist(true);
    busyRef.current = false;
    if (mounted.current) setBusy(null);
    if (saved && mounted.current) onClose();
  }

  async function submit(): Promise<"invalid" | "failed" | "submitted"> {
    if (!canWrite || busyRef.current || stateRef.current.phase !== "ready") return "failed";
    const errors = proposalErrors(stateRef.current.draft);
    if (Object.keys(errors).length) {
      dispatch({ type: "validation-error", errors });
      return "invalid";
    }
    busyRef.current = true;
    setBusy("submitting");
    try {
      if (!await persist(true)) return "failed";
      const id = stateRef.current.draft.id;
      if (!id) return "failed";
      await services.submit(id);
      dispatch({ type: "submitted" });
      if (mounted.current) onSubmitted();
      return "submitted";
    } catch (error) {
      dispatch({ type: "submit-error", message: friendlyError(error, "No pudimos enviar la propuesta. Todo lo que escribiste sigue aquí; inténtalo de nuevo.") });
      return "failed";
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  return { state, busy, dispatch, retry: () => { dispatch({ type: "load-start" }); setAttempt((value) => value + 1); }, close: () => saveAndClose(false), saveAndClose: () => saveAndClose(true), submit };
}
