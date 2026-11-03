import { describe, expect, it, vi } from "vitest";
import type { InboxProposal } from "@/lib/company-inbox-service";
import { changeInboxDecision, comparisonAvailability, filterInboxProposals, formatInboxDate } from "@/lib/company-inbox";

const proposal = (id: string, myState: InboxProposal["myState"], matchId: string | null = null): InboxProposal => ({
  id, myState, matchId, problemId: "p", freelancerId: id, freelancerName: null, freelancerSlug: null,
  headline: null, diagnosis: "Diagnóstico", solution: "Solución", deliverables: "Entrega", timeline: "Un mes",
  price: 100, currency: "PEN", recurringCosts: "", maintenanceWarranty: "", relatedExperience: "",
  submittedAt: "2026-11-02T12:00:00Z",
});

describe("bandeja de empresa", () => {
  it("filtra decisiones sin alterar el orden ni incluir Matches con estado anterior", () => {
    const proposals = [proposal("a", "saved"), proposal("b", "unseen"), proposal("c", "saved", "m"), proposal("d", "dismissed")];
    expect(filterInboxProposals(proposals, "all").map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
    expect(filterInboxProposals(proposals, "saved").map((item) => item.id)).toEqual(["a"]);
    expect(filterInboxProposals(proposals, "unseen").map((item) => item.id)).toEqual(["b"]);
    expect(filterInboxProposals(proposals, "dismissed").map((item) => item.id)).toEqual(["d"]);
  });

  it("habilita la comparación desde dos y limita la selección a tres", () => {
    expect(comparisonAvailability(1)).toEqual({ canOpen: false, isFull: false });
    expect(comparisonAvailability(2)).toEqual({ canOpen: true, isFull: false });
    expect(comparisonAvailability(3)).toEqual({ canOpen: true, isFull: true });
  });

  it("pasa por sin revisar antes de cambiar una decisión existente", async () => {
    const setInteraction = vi.fn().mockResolvedValueOnce("unseen").mockResolvedValueOnce("interested");
    await expect(changeInboxDecision(setInteraction, "a", "saved", "interested")).resolves.toBe("interested");
    expect(setInteraction.mock.calls).toEqual([["a", null], ["a", "interested"]]);
  });

  it("deshace una decisión y detecta conflictos sin fingir éxito", async () => {
    const setInteraction = vi.fn().mockResolvedValueOnce("unseen");
    await expect(changeInboxDecision(setInteraction, "a", "dismissed", "unseen")).resolves.toBe("unseen");
    expect(setInteraction).toHaveBeenCalledTimes(1);
    setInteraction.mockResolvedValueOnce("interested");
    await expect(changeInboxDecision(setInteraction, "a", "saved", "dismissed")).rejects.toThrow("decisión cambió");
    expect(setInteraction).toHaveBeenCalledTimes(2);
    await expect(changeInboxDecision(setInteraction, "a", "interested", "saved")).rejects.toThrow("Match");
  });

  it("propaga un fallo después de limpiar la decisión para que se vuelva a consultar el estado real", async () => {
    const setInteraction = vi.fn().mockResolvedValueOnce("unseen").mockRejectedValueOnce(new Error("Conexión interrumpida"));
    await expect(changeInboxDecision(setInteraction, "a", "saved", "dismissed")).rejects.toThrow("Conexión interrumpida");
    expect(setInteraction.mock.calls).toEqual([["a", null], ["a", "dismissed"]]);
  });

  it("comprueba la respuesta incluso cuando la decisión parte de sin revisar", async () => {
    const setInteraction = vi.fn().mockResolvedValue("dismissed");
    await expect(changeInboxDecision(setInteraction, "a", "unseen", "interested")).rejects.toThrow("decisión cambió");
    expect(setInteraction).toHaveBeenCalledOnce();
  });

  it("indica fechas inválidas sin lanzar un error", () => {
    expect(formatInboxDate("invalid")).toBe("Fecha no disponible");
  });
});
