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
    company: { id: "company-nova-retail", name: "Nova Retail", industry: "Comercio" },
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
    company: { id: "company-mercado-norte", name: "Mercado Norte", industry: "Comercio" },
    proposalsCount: 2,
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
    company: { id: "company-casa-marea", name: "Casa Marea", industry: "Hogar" },
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
    company: { id: "company-senda-logistica", name: "Senda Logística", industry: "Logística" },
    proposalsCount: 2,
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
    company: { id: "company-taller-andino", name: "Taller Andino", industry: "Manufactura" },
    proposalsCount: 2,
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
    company: { id: "company-punto-claro", name: "Punto Claro", industry: "Servicios" },
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
    company: { id: "company-buen-dia-cafe", name: "Buen Día Café", industry: "Alimentos" },
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
    company: { id: "company-barrio-vivo", name: "Barrio Vivo", industry: "Comunidad" },
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
    company: { id: "company-aula-abierta", name: "Aula Abierta", industry: "Educación" },
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
    company: { id: "company-linea-sur", name: "Línea Sur", industry: "Servicios profesionales" },
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
    company: { id: "company-ruta-fresca", name: "Ruta Fresca", industry: "Distribución" },
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
    company: { id: "company-estudio-roble", name: "Estudio Roble", industry: "Servicios profesionales" },
    proposalsCount: 0,
    publishedAt: "2026-09-09T14:50:00-05:00",
    status: "open",
  },
  {
    id: "devoluciones-tienda",
    title: "Las devoluciones tardan en llegar al equipo que repone productos",
    summary:
      "Los cambios de estado se comunican por mensajes y el inventario no siempre refleja lo que volvió a tienda.",
    currentSituation:
      "El equipo recibe devoluciones durante el día, pero la revisión y el registro se hacen en momentos distintos.",
    desiredOutcome:
      "Queremos que cada devolución quede clara para atención al cliente y para quienes actualizan existencias.",
    impact: "Afecta al equipo de tienda, al almacén y a las personas que esperan una respuesta sobre su devolución.",
    constraints: "El proceso debe funcionar sin frenar la atención presencial.",
    hashtags: ["retail", "inventario", "atencionalcliente"],
    budget: { type: "range", min: 800, max: 1800, currency: "USD" },
    urgency: "this-month",
    company: { id: "company-nova-retail", name: "Nova Retail", industry: "Comercio" },
    proposalsCount: 2,
    publishedAt: "2026-10-04T18:00:00-05:00",
    status: "open",
  },
  {
    id: "reportes-produccion",
    title: "Consolidar los reportes de producción nos toma parte de cada turno",
    summary:
      "La información llega en formatos distintos y el equipo la ordena manualmente antes de revisarla.",
    currentSituation:
      "Cada estación registra avances con sus propias hojas y supervisión combina los datos al final del turno.",
    desiredOutcome:
      "Buscamos tener un resumen consistente para identificar atrasos y necesidades de apoyo durante la jornada.",
    impact: "Afecta a supervisión y a los equipos que coordinan materiales y entregas.",
    constraints: "La captura debe seguir siendo rápida para quienes están en planta.",
    hashtags: ["manufactura", "operaciones", "productividad"],
    budget: { type: "fixed", amount: 2800, currency: "USD" },
    urgency: "next-months",
    company: { id: "company-taller-andino", name: "Taller Andino", industry: "Manufactura" },
    proposalsCount: 0,
    publishedAt: "2026-10-03T10:15:00-05:00",
    status: "open",
  },
  {
    id: "agenda-consultas",
    title: "Coordinar las citas de atención requiere demasiados mensajes",
    summary:
      "Las personas consultan horarios por varios canales y el equipo vuelve a confirmar disponibilidad manualmente.",
    currentSituation:
      "La agenda se actualiza durante el día, pero no todas las personas ven los cambios a tiempo.",
    desiredOutcome:
      "Queremos reducir las idas y vueltas y que cada persona sepa cuándo tiene una cita confirmada.",
    impact: "Afecta a recepción, especialistas y personas que buscan una atención oportuna.",
    hashtags: ["servicios", "atencionalcliente", "operaciones"],
    budget: { type: "range", min: 1200, max: 2600, currency: "USD" },
    urgency: "this-month",
    company: { id: "company-punto-claro", name: "Punto Claro", industry: "Servicios" },
    proposalsCount: 0,
    publishedAt: "2026-10-02T08:45:00-05:00",
    status: "open",
  },
  {
    id: "pedidos-proveedores",
    title: "Nos cuesta anticipar qué insumos pedir a cada proveedor",
    summary:
      "Los pedidos se arman cuando alguien nota que falta algo y no siempre se aprovechan las condiciones acordadas.",
    currentSituation:
      "El consumo cambia según la semana y los registros no muestran con claridad cuánto tarda cada reposición.",
    desiredOutcome:
      "Buscamos planificar las compras con tiempo y mantener una relación más predecible con nuestros proveedores.",
    impact: "Afecta a cocina, administración y a la continuidad del servicio en horas de mayor demanda.",
    hashtags: ["alimentos", "inventario", "finanzas"],
    budget: { type: "unknown" },
    urgency: "no-rush",
    company: { id: "company-buen-dia-cafe", name: "Buen Día Café", industry: "Alimentos" },
    proposalsCount: 0,
    publishedAt: "2026-09-30T15:20:00-05:00",
    status: "open",
  },
];

export const PROPOSALS_BY_PROBLEM: Record<string, SolutionProposal[]> = {
  "registro-visitas-comerciales": [
    {
      id: "visitas-propuesta-1",
      problemId: "registro-visitas-comerciales",
      companyId: "company-nova-retail",
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
        id: "freelancer-valeria",
        name: "Valeria Rojas",
        initials: "VR",
        description: "Diseñadora de servicios para equipos comerciales.",
      },
    },
    {
      id: "visitas-propuesta-2",
      problemId: "registro-visitas-comerciales",
      companyId: "company-nova-retail",
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
        id: "freelancer-mateo",
        name: "Mateo Salas",
        initials: "MS",
        description: "Consultor de operaciones y mejora de procesos.",
      },
    },
  ],
  "errores-inventario-tienda": [
    {
      id: "inventario-propuesta-1",
      problemId: "errores-inventario-tienda",
      companyId: "company-mercado-norte",
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
        id: "freelancer-lucia",
        name: "Lucía Herrera",
        initials: "LH",
        description: "Especialista independiente en operación de tiendas.",
      },
    },
    {
      id: "inventario-propuesta-2",
      problemId: "errores-inventario-tienda",
      companyId: "company-mercado-norte",
      title: "Hacer visible cada movimiento de productos",
      approach:
        "Revisaría cómo se reciben, trasladan y reponen los productos para acordar puntos de registro sencillos durante el turno.",
      deliverables:
        "Flujo de registro actualizado, prueba en una sección y recomendaciones para extenderlo a las otras tiendas.",
      estimatedTimeline: "3 semanas",
      price: 1100,
      currency: "USD",
      conditions: "La prueba se limita inicialmente a una categoría de productos.",
      freelancer: {
        id: "freelancer-diego",
        name: "Diego Paredes",
        initials: "DP",
        description: "Consultor de procesos para comercios y almacenes.",
      },
    },
  ],
  "visitas-sin-contactos": [
    {
      id: "conversion-propuesta-1",
      problemId: "visitas-sin-contactos",
      companyId: "company-casa-marea",
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
        id: "freelancer-andres",
        name: "Andrés Vidal",
        initials: "AV",
        description: "Investigador de experiencia y comportamiento de clientes.",
      },
    },
    {
      id: "conversion-propuesta-2",
      problemId: "visitas-sin-contactos",
      companyId: "company-casa-marea",
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
        id: "freelancer-paola",
        name: "Paola Medina",
        initials: "PM",
        description: "Estratega de contenido para comercio digital.",
      },
    },
  ],
  "retrasos-pedidos": [
    {
      id: "pedidos-propuesta-1",
      problemId: "retrasos-pedidos",
      companyId: "company-senda-logistica",
      title: "Detectar las demoras antes de que el pedido salga tarde",
      approach:
        "Mapearía las etapas de preparación y despacho con el equipo para distinguir esperas, cambios de prioridad y falta de información.",
      deliverables: "Mapa del recorrido, tablero de señales de atraso y prueba de seguimiento para una ruta.",
      estimatedTimeline: "4 semanas",
      price: 3400,
      currency: "USD",
      conditions: "La prueba usa una ruta de despacho acordada con el equipo.",
      freelancer: {
        id: "freelancer-sofia",
        name: "Sofía Núñez",
        initials: "SN",
        description: "Especialista en operación y distribución.",
      },
    },
    {
      id: "pedidos-propuesta-2",
      problemId: "retrasos-pedidos",
      companyId: "company-senda-logistica",
      title: "Acordar un traspaso claro entre almacén y despacho",
      approach:
        "Observaría los cambios de responsabilidad durante un turno y propondría una rutina breve para confirmar los datos de cada pedido.",
      deliverables: "Protocolo de traspaso, checklist de salida y sesión de revisión con ambos equipos.",
      estimatedTimeline: "2 semanas",
      price: 2600,
      currency: "USD",
      conditions: "No requiere cambiar el sistema actual de pedidos.",
      freelancer: {
        id: "freelancer-mateo",
        name: "Mateo Salas",
        initials: "MS",
        description: "Consultor de operaciones y mejora de procesos.",
      },
    },
  ],
  "procesamiento-facturas": [
    {
      id: "facturas-propuesta-1",
      problemId: "procesamiento-facturas",
      companyId: "company-taller-andino",
      title: "Clasificar las facturas según lo que necesita revisión",
      approach:
        "Identificaría qué datos se repiten y qué excepciones requieren criterio humano para ordenar el trabajo diario.",
      deliverables: "Criterios de clasificación, flujo de revisión y una prueba con una muestra de documentos.",
      estimatedTimeline: "3 semanas",
      price: 3900,
      currency: "USD",
      conditions: "La empresa facilita ejemplos anonimizados de facturas recientes.",
      freelancer: {
        id: "freelancer-paola",
        name: "Paola Medina",
        initials: "PM",
        description: "Diseñadora de operaciones administrativas.",
      },
    },
    {
      id: "facturas-propuesta-2",
      problemId: "procesamiento-facturas",
      companyId: "company-taller-andino",
      title: "Reducir la transcripción antes de automatizar tareas",
      approach:
        "Revisaría cada paso de la captura actual y priorizaría los campos necesarios para decidir qué facturas requieren seguimiento.",
      deliverables: "Mapa del proceso, formato unificado y plan de mejora gradual.",
      estimatedTimeline: "2 semanas",
      price: 2100,
      currency: "USD",
      conditions: "Incluye recomendaciones; la carga de documentos sigue a cargo del equipo.",
      freelancer: {
        id: "freelancer-andres",
        name: "Andrés Vidal",
        initials: "AV",
        description: "Consultor en procesos financieros para pequeñas empresas.",
      },
    },
  ],
  "devoluciones-tienda": [
    {
      id: "devoluciones-propuesta-1",
      problemId: "devoluciones-tienda",
      companyId: "company-nova-retail",
      title: "Dar seguimiento a la devolución desde que llega a tienda",
      approach:
        "Acompañaría al personal para definir estados simples y una forma compartida de avisar cuándo el producto puede volver al inventario.",
      deliverables: "Flujo de seguimiento, guía de actualización y prueba con devoluciones reales de una tienda.",
      estimatedTimeline: "3 semanas",
      price: 1450,
      currency: "USD",
      conditions: "La prueba se realiza en una sola tienda antes de extender el proceso.",
      freelancer: {
        id: "freelancer-lucia",
        name: "Lucía Herrera",
        initials: "LH",
        description: "Especialista independiente en operación de tiendas.",
      },
    },
    {
      id: "devoluciones-propuesta-2",
      problemId: "devoluciones-tienda",
      companyId: "company-nova-retail",
      title: "Alinear atención al cliente con el registro de inventario",
      approach:
        "Revisaría qué información necesita cada equipo y propondría un traspaso único que evite volver a preguntar por el estado del producto.",
      deliverables: "Acuerdo de información, plantilla de seguimiento y sesión de puesta en marcha.",
      estimatedTimeline: "10 días",
      price: 980,
      currency: "USD",
      conditions: "No requiere integrar nuevas herramientas para iniciar la prueba.",
      freelancer: {
        id: "freelancer-valeria",
        name: "Valeria Rojas",
        initials: "VR",
        description: "Diseñadora de servicios para equipos comerciales.",
      },
    },
  ],
};

export const ALL_DEMO_PROPOSALS = Object.values(PROPOSALS_BY_PROBLEM).flat();
