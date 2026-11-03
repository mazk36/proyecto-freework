import type { CompanyInboxServices, InboxProblem } from "@/lib/company-inbox";
import type { InboxProposal } from "@/lib/company-inbox-service";
import { transitionCompanyProposal } from "@/lib/discovery";

const problems: InboxProblem[] = [
  { id: "problema-muestra", title: "Ordenar la atención de nuestros clientes", status: "open" },
  { id: "problema-muestra-dos", title: "Reducir el trabajo manual en reportes", status: "paused" },
];

const sampleProposals: InboxProposal[] = [
  {
    id: "muestra-ana", problemId: problems[0].id, freelancerId: "ana", freelancerName: "Ana Torres", freelancerSlug: null, headline: "Diseñadora de servicios digitales",
    diagnosis: "Las solicitudes llegan por distintos canales y el equipo pierde visibilidad del seguimiento. Primero necesitamos entender el recorrido completo de cada consulta.",
    solution: "Mapearé el proceso actual y diseñaré un flujo compartido de atención con una prueba con el equipo.", deliverables: "Mapa del proceso, prototipo del flujo y guía de implementación.", timeline: "4 semanas", price: 4200, currency: "PEN", recurringCosts: "No se prevén costos recurrentes.", maintenanceWarranty: "Dos semanas de acompañamiento después de la entrega.", relatedExperience: "He diseñado flujos de atención para equipos de servicios.", submittedAt: "2026-10-28T15:00:00Z", myState: "unseen", matchId: null,
  },
  {
    id: "muestra-diego", problemId: problems[0].id, freelancerId: "diego", freelancerName: "Diego Salazar", freelancerSlug: null, headline: "Especialista en automatización de procesos",
    diagnosis: "El problema principal es la dispersión de las solicitudes y la repetición de tareas manuales al asignarlas.", solution: "Propongo centralizar las solicitudes y automatizar la asignación, con revisión del equipo antes de implementarla.", deliverables: "Diagnóstico técnico, tablero compartido y automatizaciones documentadas.", timeline: "6 semanas", price: 1250, currency: "USD", recurringCosts: "Las licencias de las herramientas elegidas se cotizarán por separado.", maintenanceWarranty: "Un mes para corregir incidencias de la implementación.", relatedExperience: "Experiencia en automatización para pequeños equipos comerciales.", submittedAt: "2026-10-29T15:00:00Z", myState: "saved", matchId: null,
  },
  {
    id: "muestra-lucia", problemId: problems[0].id, freelancerId: "lucia", freelancerName: "Lucía Ramos", freelancerSlug: null, headline: "Consultora de experiencia de cliente",
    diagnosis: "El equipo necesita acuerdos claros para priorizar y responder, además de una vista compartida de cada caso.", solution: "Trabajaré con el equipo para definir criterios de atención, medir tiempos y establecer un proceso de mejora.", deliverables: "Taller de diagnóstico, indicadores y manual de atención.", timeline: "3 semanas", price: 3500, currency: "PEN", recurringCosts: "Sin costos recurrentes de mi servicio.", maintenanceWarranty: "Una sesión de seguimiento a los 30 días.", relatedExperience: "He acompañado equipos de atención en negocios de servicios.", submittedAt: "2026-10-30T15:00:00Z", myState: "unseen", matchId: null,
  },
  {
    id: "muestra-mateo", problemId: problems[0].id, freelancerId: "mateo", freelancerName: "Mateo Vega", freelancerSlug: null, headline: "Desarrollador de herramientas internas",
    diagnosis: "Hace falta una fuente común para consultar el estado y las personas responsables de cada solicitud.", solution: "Construiré un tablero interno sencillo y validaré su uso con el equipo antes de ampliarlo.", deliverables: "Tablero funcional, documentación y sesión de entrega.", timeline: "5 semanas", price: 4900, currency: "PEN", recurringCosts: "El alojamiento se define con la empresa.", maintenanceWarranty: "Corrección de errores durante 30 días.", relatedExperience: "Desarrollo de herramientas internas para operaciones.", submittedAt: "2026-10-31T15:00:00Z", myState: "dismissed", matchId: null,
  },
  {
    id: "muestra-reportes", problemId: problems[1].id, freelancerId: "lucia", freelancerName: "Lucía Ramos", freelancerSlug: null, headline: "Consultora de experiencia de cliente",
    diagnosis: "Los reportes requieren reunir información manualmente desde varias fuentes.", solution: "Revisaré los datos y diseñaré un proceso de consolidación compartido.", deliverables: "Mapa de fuentes y propuesta de automatización.", timeline: "2 semanas", price: 2100, currency: "PEN", recurringCosts: "", maintenanceWarranty: "Una sesión de seguimiento.", relatedExperience: "Proyectos de documentación de procesos.", submittedAt: "2026-10-31T17:00:00Z", myState: "unseen", matchId: null,
  },
];

export function createSampleInboxServices(): CompanyInboxServices {
  let proposals = sampleProposals.map((proposal) => ({ ...proposal }));
  return {
    listProblems: async () => problems.map((problem) => ({ ...problem })),
    listProposals: async (problemId) => proposals.filter((proposal) => proposal.problemId === problemId).map((proposal) => ({ ...proposal })),
    setInteraction: async (proposalId, next) => {
      const proposal = proposals.find((item) => item.id === proposalId);
      if (!proposal) throw new Error("No encontramos la propuesta de muestra.");
      const state = transitionCompanyProposal(proposal.myState, next) ?? "unseen";
      proposals = proposals.map((item) => item.id === proposalId ? { ...item, myState: state, matchId: state === "interested" ? `match-${item.id}` : item.matchId } : item);
      return state;
    },
  };
}
