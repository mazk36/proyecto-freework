# Visión del producto

## Problema

Las empresas muchas veces conocen el problema que quieren resolver, pero no necesariamente la mejor solución técnica.

## Propuesta

Freework busca permitir que una empresa describa su problema y reciba propuestas de solución elaboradas por freelancers. Distintos enfoques podrán competir para resolver un mismo problema.

## Participantes principales

- Empresa.
- Freelancer.

## Principio central

**Problem first, solution second.** La empresa parte de una necesidad o situación, en vez de tener que definir de antemano la solución técnica.

## Discovery-first marketplace

Discovery es la experiencia principal para tomar decisiones oportunidad por oportunidad; Explore (`/problems`) se mantiene como búsqueda manual con filtros, ordenamiento y mosaico. Para freelancers, Discovery presenta problemas uno por uno. Para empresas, presenta soluciones privadas enviadas a sus propios problemas. Guardar y descartar son interacciones reversibles en la demo; enviar una solución la retira del feed del freelancer.

Una `SolutionProposal` solo debe estar disponible para el freelancer que la envió y para la empresa responsable del problema. Un Match se crea cuando ya existe una propuesta enviada y esa empresa marca que le interesa. El Match indica que ambas partes quieren continuar conversando; no indica contratación, pago ni contrato. El chat queda fuera de esta fase.

El ranking inicial es una función determinista y sustituible que considera preferencias mock de hashtags, presupuesto y recencia. No se ha decidido un algoritmo de recomendación futuro.

## Límites de la demo

El selector de rol simula Freelancer y Empresa sin autenticación real. El estado vive en el frontend y se conserva con `localStorage`. La privacidad actual solo se refleja en selectores y vistas mock; la autorización real deberá implementarse en servidor antes de usar datos de personas o empresas.

## Estado y preguntas abiertas

Autenticación, backend, persistencia de servidor y autorización siguen pendientes. Monetización, pagos, reputación, contratos, inteligencia artificial, chat y algoritmos avanzados siguen fuera de esta fase o pendientes de definición. No deben tratarse como requisitos aprobados.
