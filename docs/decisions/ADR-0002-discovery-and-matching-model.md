# ADR-0002: Discovery y modelo de matching

## Status

Accepted

## Context

La búsqueda por mosaico permite investigar problemas manualmente, pero no expresa por completo la experiencia secuencial que queremos para decidir si una oportunidad merece atención. La plataforma sigue centrada en `Problem`; freelancers pueden presentar distintas `SolutionProposal` para un mismo problema. Las propuestas necesitan privacidad por participante y el producto necesita distinguir interés mutuo de contratación.

## Decision

Agregar Discovery como experiencia principal y conservar Explore (`/problems`) como modo de búsqueda manual.

- Para un freelancer, Discovery presenta problemas de uno en uno; puede pasar, guardar o enviar una solución.
- Para una empresa, Discovery comienza con la selección de uno de sus problemas y presenta de una en una las soluciones que recibió.
- Las propuestas son privadas en las vistas normales: el freelancer consulta solo las propias y la empresa consulta las propuestas de problemas bajo su responsabilidad.
- Un Match se crea cuando una propuesta existente y enviada recibe la acción `Me interesa` de la empresa responsable. El Match significa interés mutuo para continuar una conversación; no representa contratación, pago ni contrato.
- El estado de la demo se administra en un proveedor React pequeño y se conserva localmente en el navegador. El ranking inicial es una función pura y determinista que usa preferencias mock de hashtags, presupuesto y recencia.
- La negociación/chat no se implementa en esta fase. Una pantalla placeholder explica que estará disponible después.

## Alternatives Considered

- Reemplazar el mosaico por Discovery: descartado porque Explore debe continuar disponible para búsqueda, filtros y comparación manual.
- Mostrar las soluciones públicamente en el detalle del problema: descartado porque los precios, enfoques y condiciones pertenecen a cada freelancer y a la empresa receptora.
- Añadir un backend o autenticación para esta demo: no se adopta; queda fuera del alcance actual.
- Usar ranking con IA o aprendizaje automático: no se adopta. No hay un algoritmo futuro decidido.

## Consequences

- Discovery da una decisión enfocada y de baja fricción a cada rol, mientras Explore mantiene control y contexto.
- Una misma necesidad puede mostrar varias soluciones independientes con distintos enfoques, plazos y precios.
- Los Matches son un estado explícito del dominio que prepara la futura negociación sin simular contratación.
- El estado `localStorage` facilita probar el flujo, pero es local a cada navegador y se puede modificar desde el cliente.
- Los filtros de propuestas en el frontend ofrecen solo privacidad de presentación para datos mock. La autorización real deberá verificarse en servidor antes de utilizar información de usuarios.
- Mantener filtros, transiciones y ranking como lógica de dominio probada evita acoplar esas reglas a componentes de presentación.

## Date

2026-10-06
