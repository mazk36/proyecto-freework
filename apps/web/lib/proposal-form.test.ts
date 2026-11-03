import { describe, expect, it } from "vitest";
import { createEmptyProposalDraft, type Proposal } from "@/lib/proposal-domain";
import { createProposalSaveQueue, groupProposalsByStatus, initialProposalFormState, parseProposalPrice, proposalErrors, proposalFormReducer, proposalSaveDelay, resolveProposalProblem, shouldScheduleProposalSave } from "@/lib/proposal-form";

const draft = createEmptyProposalDraft();

describe("proposal form state", () => {
  it("restores the existing draft and does not reopen a submitted proposal for editing", () => {
    const existing: Proposal = { ...draft, id: "p1", problemId: "problem", problemTitleSnapshot: "Título original", freelancerId: "freelancer", status: "draft", diagnosis: "Diagnóstico previo", price: 120.5, currency: "USD", submittedAt: null, createdAt: "2026-10-01", updatedAt: "2026-10-02" };
    const restored = proposalFormReducer(initialProposalFormState(), { type: "load", proposal: existing });
    expect(restored.phase).toBe("ready");
    expect(restored.draft).toMatchObject({ id: "p1", diagnosis: "Diagnóstico previo", currency: "USD" });
    expect(restored.priceText).toBe("120.5");
    expect(restored.saveStatus).toBe("saved");
    expect(proposalFormReducer(initialProposalFormState(), { type: "load", proposal: { ...existing, status: "submitted" } }).phase).toBe("already-submitted");
  });

  it("debounces edits and preserves newer changes and the generated id after a delayed save", () => {
    let state = proposalFormReducer(initialProposalFormState(), { type: "load" });
    expect(shouldScheduleProposalSave(state)).toBe(false);
    state = proposalFormReducer(state, { type: "edit-text", field: "diagnosis", value: "Primera versión" });
    expect(shouldScheduleProposalSave(state)).toBe(true);
    expect(proposalSaveDelay(state)).toBe(1500);
    state = proposalFormReducer(state, { type: "save-start" });
    state = proposalFormReducer(state, { type: "edit-text", field: "diagnosis", value: "Versión más reciente" });
    state = proposalFormReducer(state, { type: "save-success", id: "p1", revision: 1 });
    expect(state.draft).toMatchObject({ id: "p1", diagnosis: "Versión más reciente" });
    expect(state.savedRevision).toBe(1);
    expect(shouldScheduleProposalSave(state)).toBe(true);
    state = proposalFormReducer(state, { type: "save-success", id: "p1", revision: 2 });
    expect(shouldScheduleProposalSave(state)).toBe(false);
    expect(state.saveStatus).toBe("saved");
  });

  it("keeps edits on save failure without continuously retrying until another edit", () => {
    let state = proposalFormReducer(initialProposalFormState(), { type: "load" });
    state = proposalFormReducer(state, { type: "edit-text", field: "solution", value: "Mi solución" });
    state = proposalFormReducer(state, { type: "save-error", message: "Error de red" });
    expect(state.draft.solution).toBe("Mi solución");
    expect(shouldScheduleProposalSave(state)).toBe(false);
    state = proposalFormReducer(state, { type: "edit-text", field: "solution", value: "Mi nueva solución" });
    expect(shouldScheduleProposalSave(state)).toBe(true);
  });

  it("distinguishes a failed submission from a failed save", () => {
    let state = proposalFormReducer(initialProposalFormState(), { type: "load" });
    state = proposalFormReducer(state, { type: "edit-text", field: "solution", value: "Mi solución" });
    state = proposalFormReducer(state, { type: "save-success", id: "p1", revision: 1 });
    state = proposalFormReducer(state, { type: "submit-error", message: "No se pudo enviar" });
    expect(state.draft.solution).toBe("Mi solución");
    expect(state.saveStatus).toBe("saved");
    expect(state.error).toBe("No se pudo enviar");
  });

  it("serializes saves and allows a later retry after a failed request", async () => {
    const queue = createProposalSaveQueue();
    const calls: string[] = [];
    let finishFirst!: () => void;
    const first = queue.run(async () => {
      calls.push("primero");
      await new Promise<void>((resolve) => { finishFirst = resolve; });
      throw new Error("sin conexión");
    });
    const second = queue.run(async () => { calls.push("segundo"); return "guardado"; });
    await Promise.resolve();
    expect(calls).toEqual(["primero"]);
    expect(queue.pending).toBe(true);
    finishFirst();
    await expect(first).rejects.toThrow("sin conexión");
    await expect(second).resolves.toBe("guardado");
    expect(calls).toEqual(["primero", "segundo"]);
    expect(queue.pending).toBe(false);
  });

  it("maps errors to the correct fields, while allowing incomplete drafts", () => {
    expect(proposalErrors(draft)).toMatchObject({ diagnosis: expect.any(String), solution: expect.any(String), deliverables: expect.any(String), timeline: expect.any(String), price: expect.any(String) });
    expect(proposalErrors(draft, true)).toEqual({});
    const errors = proposalErrors({ ...draft, recurringCosts: "😀".repeat(2001), price: -1 }, true);
    expect(Object.keys(errors).sort()).toEqual(["price", "recurringCosts"]);
    expect(errors.recurringCosts).toContain("2000");
  });

  it("accepts decimal points or commas without silently rounding invalid prices", () => {
    expect(parseProposalPrice("12,50")).toBe(12.5);
    expect(parseProposalPrice("0")).toBe(0);
    expect(parseProposalPrice("")).toBeNull();
    expect(parseProposalPrice("2.999")).toBeNaN();
    expect(parseProposalPrice("-1")).toBeNaN();
  });

  it("groups each proposal exactly by its real status", () => {
    const proposals = ["draft", "submitted", "withdrawn", "draft"].map((status, id) => ({ ...draft, id: String(id), status } as Proposal));
    const groups = groupProposalsByStatus(proposals);
    expect(groups.draft.map((item) => item.id)).toEqual(["0", "3"]);
    expect(groups.submitted.map((item) => item.id)).toEqual(["1"]);
    expect(groups.withdrawn.map((item) => item.id)).toEqual(["2"]);
  });

  it("uses public problem information when available and the saved title otherwise", () => {
    const proposal = { ...draft, id: "p1", problemId: "missing-id", problemTitleSnapshot: "Título guardado", currency: "USD", status: "draft" } as Proposal;
    const fallback = resolveProposalProblem(proposal, []);
    expect(fallback.unavailable).toBe(true);
    expect(fallback.problem).toMatchObject({ id: "missing-id", title: "Título guardado", companyName: null, currency: "USD" });
    const available = { ...fallback.problem, title: "Título público", companyName: "Empresa pública" };
    expect(resolveProposalProblem(proposal, [available])).toEqual({ problem: available, unavailable: false });
  });
});
