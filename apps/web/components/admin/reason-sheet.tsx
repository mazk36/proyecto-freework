"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { REASON_MAX_LENGTH, validateReason } from "@/lib/admin-panel";

export function ReasonSheet({ open, title, description, confirmLabel, presets = [], hint, onClose, onConfirm }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  presets?: readonly string[];
  hint?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const fieldId = useId();
  useEffect(() => { if (open) { setReason(""); setTouched(false); setFailure(""); setBusy(false); } }, [open]);
  const error = validateReason(reason);
  const showError = touched && error;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (error || busy) return;
    setBusy(true);
    setFailure("");
    try {
      await onConfirm(reason.trim());
    } catch (reasonError) {
      setFailure(reasonError instanceof Error ? reasonError.message : "No pudimos completar la acción.");
      setBusy(false);
    }
  }

  return (
    <BottomSheet centered description={description} onClose={onClose} open={open} title={title}>
      <form className="mt-5 space-y-4" noValidate onSubmit={submit}>
        {presets.length ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sugerencias de texto">
            {presets.map((preset) => (
              <button className="min-h-11 rounded-xl border border-border px-3 text-left text-sm text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" key={preset} onClick={() => { setReason(preset); setTouched(true); }} type="button">{preset}</button>
            ))}
            <button className="min-h-11 rounded-xl border border-border px-3 text-sm text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => { setReason(""); setTouched(false); document.getElementById(fieldId)?.focus(); }} type="button">Otro</button>
          </div>
        ) : null}
        <div>
          <label className="block text-sm font-medium text-foreground" htmlFor={fieldId}>Motivo</label>
          {hint ? <p className="mt-1 text-sm text-muted-foreground" id={`${fieldId}-hint`}>{hint}</p> : null}
          <textarea
            aria-describedby={`${hint ? `${fieldId}-hint ` : ""}${fieldId}-count${showError ? ` ${fieldId}-error` : ""}`}
            aria-invalid={showError ? true : undefined}
            className="mt-2 min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            id={fieldId}
            onBlur={() => setTouched(true)}
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
          <div className="mt-1 flex justify-between gap-3 text-xs">
            <p className="text-rose-300" id={`${fieldId}-error`} role={showError ? "alert" : undefined}>{showError ? error : ""}</p>
            <p className="font-mono text-muted-foreground" id={`${fieldId}-count`}>{Array.from(reason.trim()).length}/{REASON_MAX_LENGTH}</p>
          </div>
        </div>
        {failure ? <p className="text-sm text-rose-300" role="alert">{failure}</p> : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} type="button" variant="outline">Cancelar</Button>
          <Button disabled={busy} type="submit">{busy ? "Guardando…" : confirmLabel}</Button>
        </div>
      </form>
    </BottomSheet>
  );
}
