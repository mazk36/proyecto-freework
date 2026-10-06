import type { Problem, SolutionProposal } from "@/types/domain";

export const PROBLEMS: Problem[] = [
  {
    id: "registro-visitas-comerciales",
    title: "Nuestro equipo tarda demasiado registrando las visitas a clientes",
    summary:
      "Las visitas quedan anotadas en distintos lugares y consolidarlas consume tiempo al final de cada semana.",
    currentSituation:
      "Cada integrante del equipo comercial registra sus visitas como puede: algunos usan notas, otros hojas de cálculo y otros esperan al final de la semana para completar el informe.",
    desiredOutcome:
      "Queremos que registrar una visita tome poco tiempo y que la información esté disponible para todo el equipo.",
    impact:
      "Afecta a diez personas del equipo comercial y a quienes preparan el seguimiento de clientes.",
    constraints:
      "El equipo trabaja principalmente desde el teléfono y ya usa herramientas compartidas para coordinarse.",
    hashtags: ["ventas", "operaciones", "productividad"],
    budget: { type: "range", min: 500, max: 1500, currency: "USD" },
    urgency: "this-month",
    company: { name: "Nova Retail", industry: "Comercio" },
    proposalsCount: 2,
    publishedAt: "2026-10-05T21:10:00-05:00",
    status: "open",
  },
  {
    id: "errores-inventario-tienda",
    title: "Reducir errores en el inventario de nuestras tiendas",
    summary:
      "Los conteos físicos no siempre coinciden con los registros y descubrimos diferencias demasiado tarde.",
    currentSituation:
      "El personal actualiza existencias durante el día y realiza conteos manuales por secciones. En horas de mayor movimiento es fácil dejar un cambio sin registrar.",
    desiredOutcome:
      "Nos gustaría entender dónde se originan las diferencias y cerrar cada jornada con cifras más confiables.",
    impact:
      "El problema alcanza a las tres tiendas, al equipo que repone productos y a quienes preparan pedidos.",
    hashtags: ["inventario", "retail", "operaciones"],
    budget: { type: "fixed", amount: 900, currency: "USD" },
    urgency: "asap",
    company: { name: "Mercado Norte", industry: "Comercio" },
    proposalsCount: 1,
    publishedAt: "2026-10-05T23:10:00-05:00",
    status: "open",
  },
  {
    id: "visitas-sin-contactos",
    title: "Tenemos muchas visitas, pero pocas solicitudes de contacto",
    summary:
      "Las personas llegan a nuestro catálogo, aunque pocas terminan preguntando por nuestros productos.",
    currentSituation:
      "Recibimos consultas por canales distintos y no sabemos bien qué dudas hacen que una persona se retire sin escribirnos.",
    desiredOutcome:
      "Queremos comprender qué frena a nuestros visitantes y recibir consultas más claras de quienes sí necesitan ayuda.",
    impact:
      "Afecta la planificación del equipo de ventas y la forma en que presentamos el catálogo.",
    hashtags: ["marketing", "ecommerce", "atencionalcliente"],
    budget: { type: "range", min: 1200, max: 3000, currency: "USD" },
    urgency: "next-months",
    company: { name: "Casa Marea", industry: "Hogar" },
    proposalsCount: 2,
    publishedAt: "2026-10-05T12:15:00-05:00",
    status: "open",
  },
  {
    id: "retrasos-pedidos",
    title: "No identificamos con precisión dónde se retrasan los pedidos",
    summary:
      "Cuando un envío se demora, nos cuesta encontrar en qué parte del recorrido ocurrió el problema.",
    currentSituation:
      "Los equipos de preparación, despacho y atención al cliente actualizan la información en momentos distintos.",
    desiredOutcome:
      "Necesitamos ver con más claridad el recorrido de los pedidos y detectar retrasos antes de que el cliente consulte.",
    impact:
      "Afecta la coordinación del almacén, el despacho y la comunicación con clientes.",
    constraints:
      "No podemos interrumpir el despacho durante la jornada para cambiar el proceso.",
    hashtags: ["logistica", "operaciones", "atencionalcliente"],
    budget: { type: "range", min: 2500, max: 5000, currency: "USD" },
    urgency: "this-month",
    company: { name: "Senda Logística", industry: "Logística" },
    proposalsCount: 0,
    publishedAt: "2026-10-04T09:00:00-05:00",
    status: "open",
  },
  {
    id: "procesamiento-facturas",
    title: "Procesamos manualmente cientos de facturas cada semana",
    summary:
      "Revisar y clasificar documentos toma horas y hace difícil detectar rápidamente los que necesitan atención.",
    currentSituation:
      "Las facturas llegan por correo y se distribuyen entre varias personas para revisar datos, montos y fechas.",
    desiredOutcome:
      "Queremos reducir tareas repetitivas y tener una forma clara de revisar cada documento pendiente.",
    impact:
      "El equipo administrativo y financiero dedica parte de cada semana a transcribir información.",
    hashtags: ["administracion", "finanzas", "automatizacion"],
    budget: { type: "fixed", amount: 4800, currency: "USD" },
    urgency: "next-months",
    company: { name: "Taller Andino", industry: "Manufactura" },
    proposalsCount: 0,
    publishedAt: "2026-10-03T16:40:00-05:00",
    status: "open",
  },
  {
    id: "incorporacion-nuevos-empleados",
    title: "La incorporación de cada nuevo integrante se siente distinta",
    summary:
      "A cada persona le toma un tiempo diferente conocer los procesos, documentos y contactos importantes.",
    currentSituation:
      "La información de bienvenida vive en varios documentos y depende de quién tenga tiempo para acompañar al nuevo integrante.",
    desiredOutcome:
      "Nos gustaría que cada persona empiece con una experiencia clara y que el equipo no repita las mismas explicaciones.",
    impact:
      "Afecta a quienes se incorporan y a las personas que los acompañan durante sus primeras semanas.",
    hashtags: ["recursoshumanos", "administracion", "productividad"],
    budget: { type: "unknown" },
    urgency: "this-month",
    company: { name: "Punto Claro", industry: "Servicios" },
    proposalsCount: 0,
    publishedAt: "2026-10-02T11:20:00-05:00",
    status: "open",
  },
  {
    id: "consultas-repetidas-clientes",
    title: "Respondemos las mismas preguntas por varios canales",
    summary:
      "El equipo recibe dudas similares por teléfono, correo y redes, pero no logra compartir respuestas útiles.",
    currentSituation:
      "Cada persona busca la respuesta de nuevo y algunas consultas pasan de un canal a otro antes de resolverse.",
    desiredOutcome:
      "Queremos responder con más consistencia y dedicar tiempo a las preguntas que sí necesitan atención personal.",
    hashtags: ["atencionalcliente", "productividad", "operaciones"],
    budget: { type: "range", min: 300, max: 900, currency: "USD" },
    urgency: "no-rush",
    company: { name: "Buen Día Café", industry: "Alimentos" },
    proposalsCount: 0,
    publishedAt: "2026-10-01T08:45:00-05:00",
    status: "open",
  },
  {
    id: "seguimiento-campanas-locales",
    title: "Nos cuesta saber qué acciones locales atraen nuevos clientes",
    summary:
      "Hacemos actividades en distintos barrios, pero no podemos comparar con claridad qué está funcionando.",
    currentSituation:
      "El equipo registra resultados en reportes separados y los datos llegan con diferentes niveles de detalle.",
    desiredOutcome:
      "Buscamos decidir en qué actividades conviene concentrar el esfuerzo del siguiente trimestre.",
    hashtags: ["marketing", "ventas", "productividad"],
    budget: { type: "range", min: 5000, max: 8500, currency: "USD" },
    urgency: "next-months",
    company: { name: "Barrio Vivo", industry: "Comunidad" },
    proposalsCount: 0,
    publishedAt: "2026-09-29T13:10:00-05:00",
    status: "reviewing",
  },
  {
    id: "inscripciones-programas-educativos",
    title: "Las familias abandonan el proceso de inscripción a mitad de camino",
    summary:
      "Recibimos solicitudes incompletas y no sabemos en qué momento las familias dejan de continuar.",
    currentSituation:
      "La información se pide en varias etapas y el equipo contacta a cada familia para completar los datos que faltan.",
    desiredOutcome:
      "Queremos que el proceso sea más comprensible y reducir las solicitudes que requieren varias rondas de seguimiento.",
    impact:
      "Afecta a las familias postulantes y al equipo que organiza los programas.",
    hashtags: ["educacion", "administracion", "atencionalcliente"],
    budget: { type: "fixed", amount: 650, currency: "USD" },
    urgency: "this-month",
    company: { name: "Aula Abierta", industry: "Educación" },
    proposalsCount: 0,
    publishedAt: "2026-09-24T10:00:00-05:00",
    status: "open",
  },
  {
    id: "planificacion-compras-insumos",
    title: "Compramos insumos tarde o en cantidades difíciles de planificar",
    summary:
      "Los pedidos dependen de revisiones puntuales y no de una lectura compartida del consumo.",
    currentSituation:
      "Las distintas áreas solicitan insumos por separado y administración consolida las necesidades manualmente.",
    desiredOutcome:
      "Necesitamos anticipar mejor las compras sin acumular productos que luego no se usan.",
    hashtags: ["administracion", "inventario", "finanzas"],
    budget: { type: "unknown" },
    urgency: "no-rush",
    company: { name: "Línea Sur", industry: "Servicios profesionales" },
    proposalsCount: 0,
    publishedAt: "2026-09-19T15:25:00-05:00",
    status: "open",
  },
  {
    id: "preparacion-de-pedidos",
    title: "Preparar los pedidos del día exige revisar la misma información varias veces",
    summary:
      "El equipo vuelve a comprobar disponibilidad, instrucciones y datos de entrega antes de cada salida.",
    currentSituation:
      "Las prioridades cambian durante el día y no todas las personas ven la última actualización al mismo tiempo.",
    desiredOutcome:
      "Buscamos coordinar mejor el trabajo diario y reducir los pasos que se repiten en cada pedido.",
    constraints:
      "El proceso debe seguir siendo usable para el personal que trabaja en el almacén.",
    hashtags: ["logistica", "operaciones", "productividad"],
    budget: { type: "range", min: 750, max: 2200, currency: "USD" },
    urgency: "asap",
    company: { name: "Ruta Fresca", industry: "Distribución" },
    proposalsCount: 0,
    publishedAt: "2026-09-12T09:30:00-05:00",
    status: "open",
  },
  {
    id: "renovacion-de-clientes",
    title: "No tenemos una vista compartida de los clientes que necesitan seguimiento",
    summary:
      "Los recordatorios dependen de notas personales y algunos contactos se retoman tarde.",
    currentSituation:
      "El equipo conversa sobre oportunidades en reuniones, pero cada integrante lleva el seguimiento a su manera.",
    desiredOutcome:
      "Queremos acordar qué contactos requieren atención y cuándo conviene volver a conversar con ellos.",
    hashtags: ["ventas", "administracion", "productividad"],
    budget: { type: "fixed", amount: 6200, currency: "USD" },
    urgency: "next-months",
    company: { name: "Estudio Roble", industry: "Servicios profesionales" },
    proposalsCount: 0,
    publishedAt: "2026-09-09T14:50:00-05:00",
    status: "open",
  },
];

export const PROPOSALS_BY_PROBLEM: Record<string, SolutionProposal[]> = {
  "registro-visitas-comerciales": [
    {
      id: "visitas-propuesta-1",
      title: "Un registro breve al terminar cada visita",
      approach:
        "Primero mapearía el recorrido actual con dos personas del equipo y luego probaría un registro corto que capture solo lo necesario en el momento.",
      deliverables:
        "Mapa del proceso, prototipo navegable del registro y una guía breve para probarlo con el equipo.",
      estimatedTimeline: "3 semanas",
      price: 950,
      currency: "USD",
      conditions: "Incluye una ronda de ajustes después de la prueba piloto.",
      freelancer: {
        name: "Valeria Rojas",
        initials: "VR",
        description: "Diseñadora de servicios para equipos comerciales.",
      },
    },
    {
      id: "visitas-propuesta-2",
      title: "Aclarar qué información vale la pena conservar",
      approach:
        "Revisaría una muestra de los informes recientes, identificaría los datos que se usan para dar seguimiento y probaría una rutina sencilla de captura.",
      deliverables:
        "Taller de descubrimiento, formato de registro y recomendaciones para incorporarlo a la rutina existente.",
      estimatedTimeline: "2 semanas",
      price: 650,
      currency: "USD",
      conditions: "El acompañamiento incluye dos sesiones remotas con el equipo.",
      freelancer: {
        name: "Mateo Salas",
        initials: "MS",
        description: "Consultor de operaciones y mejora de procesos.",
      },
    },
  ],
  "errores-inventario-tienda": [
    {
      id: "inventario-propuesta-1",
      title: "Encontrar en qué momentos se descuadran los conteos",
      approach:
        "Acompañaría un ciclo de reposición y cierre para entender dónde se pierde continuidad entre el movimiento y el registro.",
      deliverables:
        "Mapa de puntos de control, protocolo de conteo y plan de prueba para una tienda.",
      estimatedTimeline: "10 días",
      price: 780,
      currency: "USD",
      conditions: "La visita presencial, si se necesita, se cotiza por separado.",
      freelancer: {
        name: "Lucía Herrera",
        initials: "LH",
        description: "Especialista independiente en operación de tiendas.",
      },
    },
  ],
  "visitas-sin-contactos": [
    {
      id: "conversion-propuesta-1",
      title: "Escuchar a las personas antes de rediseñar el recorrido",
      approach:
        "Analizaría las consultas existentes y conversaría con algunos visitantes para identificar las dudas que no están quedando resueltas.",
      deliverables:
        "Síntesis de hallazgos, mapa del recorrido y tres cambios priorizados para probar.",
      estimatedTimeline: "2 semanas",
      price: 1400,
      currency: "USD",
      conditions: "La empresa coordina el acceso a las personas participantes.",
      freelancer: {
        name: "Andrés Vidal",
        initials: "AV",
        description: "Investigador de experiencia y comportamiento de clientes.",
      },
    },
    {
      id: "conversion-propuesta-2",
      title: "Aclarar la información que precede a una consulta",
      approach:
        "Revisaría las páginas más visitadas, contrastaría su contenido con las preguntas recibidas y propondría ajustes de claridad.",
      deliverables:
        "Auditoría de contenido, recomendaciones priorizadas y prototipo de una página clave.",
      estimatedTimeline: "3 semanas",
      price: 1950,
      currency: "USD",
      conditions: "No incluye producción de fotografías ni redacción de todo el catálogo.",
      freelancer: {
        name: "Paola Medina",
        initials: "PM",
        description: "Estratega de contenido para comercio digital.",
      },
    },
  ],
};
