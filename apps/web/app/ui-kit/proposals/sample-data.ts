import type { PublicProblem } from "@/lib/problem-domain";
import { createEmptyProposalDraft, type Proposal } from "@/lib/proposal-domain";
import type { ProposalServices } from "@/lib/proposal-service";

export const sampleProblems: PublicProblem[] = [
  { id: "muestra-problema-1", title: "Ordenar la atención de nuestros clientes", description: "El equipo recibe solicitudes por varios canales y necesita organizar su seguimiento.", companyName: "Empresa de muestra", industrySnapshot: "Servicios", impacts: ["time"], objectives: ["organize"], successCriteria: "Seguimiento claro de solicitudes.", budgetChoice: "3000_5000", currency: "PEN", deadlineChoice: "within_one_month", publishedAt: "2026-10-20T12:00:00Z" },
  { id: "muestra-problema-2", title: "Reducir el trabajo manual en reportes", description: "Queremos ahorrar tiempo al preparar nuestros reportes internos.", companyName: null, industrySnapshot: "Operaciones", impacts: ["repetitive"], objectives: ["automate"], successCriteria: "Menos trabajo manual.", budgetChoice: "unknown", currency: "USD", deadlineChoice: "flexible", publishedAt: "2026-10-19T12:00:00Z" },
  { id: "muestra-problema-3", title: "Mejorar el seguimiento de ventas", description: "Queremos contar con un proceso compartido de seguimiento.", companyName: "Comercio de muestra", industrySnapshot: "Comercio", impacts: ["errors"], objectives: ["increase_sales"], successCriteria: "Un proceso compartido.", budgetChoice: "1000_3000", currency: "PEN", deadlineChoice: "flexible", publishedAt: "2026-10-18T12:00:00Z" },
];

export function createSampleProposalServices(includeExamples = true): ProposalServices {
  const createdAt = "2026-10-25T12:00:00Z";
  const example = (id: string, problemId: string, status: Proposal["status"], price: number | null): Proposal => ({
    ...createEmptyProposalDraft(), id, problemId, problemTitleSnapshot: sampleProblems.find((problem) => problem.id === problemId)?.title ?? "Problema de muestra", freelancerId: "profesional-de-muestra", status,
    diagnosis: "Entiendo que el equipo necesita una forma clara de dar seguimiento.",
    solution: "Propongo revisar el proceso actual y diseñar una solución acorde.",
    deliverables: "Mapa del proceso y propuesta de implementación.", timeline: "Tres semanas", price,
    recurringCosts: "", maintenanceWarranty: "", relatedExperience: "", currency: "PEN",
    submittedAt: status === "draft" ? null : createdAt, createdAt, updatedAt: createdAt,
  });
  let proposals: Proposal[] = includeExamples ? [
    example("muestra-enviada", sampleProblems[0].id, "submitted", 3500),
    { ...example("muestra-borrador", sampleProblems[1].id, "draft", null), currency: "USD" },
    example("muestra-retirada", sampleProblems[2].id, "withdrawn", 1800),
  ] : [];
  let nextId = 0;
  return {
    list: async () => proposals.map((proposal) => ({ ...proposal })),
    save: async (problemId, input) => {
      const id = input.id ?? `borrador-de-muestra-${++nextId}`;
      const existing = proposals.find((item) => item.id === id);
      if (existing && existing.status !== "draft") throw new Error("Este ejemplo ya no es editable.");
      const now = new Date().toISOString();
      const problemTitleSnapshot = existing?.problemTitleSnapshot ?? sampleProblems.find((problem) => problem.id === problemId)?.title ?? "Problema de muestra";
      const proposal: Proposal = { ...input, id, problemId, problemTitleSnapshot, freelancerId: "profesional-de-muestra", status: "draft", submittedAt: null, createdAt: existing?.createdAt ?? now, updatedAt: now };
      proposals = [proposal, ...proposals.filter((item) => item.id !== id)];
      return id;
    },
    submit: async (id) => {
      const now = new Date().toISOString();
      proposals = proposals.map((item) => item.id === id ? { ...item, status: "submitted", submittedAt: now, updatedAt: now } : item);
      return id;
    },
    withdraw: async (id) => {
      proposals = proposals.map((item) => item.id === id ? { ...item, status: "withdrawn", updatedAt: new Date().toISOString() } : item);
      return id;
    },
  };
}
