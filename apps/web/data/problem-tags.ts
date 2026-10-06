export const PROBLEM_HASHTAGS = [
  "ventas",
  "marketing",
  "operaciones",
  "logistica",
  "finanzas",
  "automatizacion",
  "ecommerce",
  "productividad",
  "atencionalcliente",
  "recursoshumanos",
  "administracion",
  "educacion",
  "inventario",
  "retail",
] as const;

export type ProblemHashtag = (typeof PROBLEM_HASHTAGS)[number];
