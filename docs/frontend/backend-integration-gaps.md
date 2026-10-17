# Brechas de integración frontend/backend

La aplicación solo presenta acciones como completadas cuando una operación real devuelve éxito. Las vistas nuevas de Likes y Chats no simulan persistencia ni contenido.

## Descubrimiento y propuestas

- La consulta de problemas empresariales abiertos para freelancers ya tiene un servicio autenticado y limitado a campos públicos.
- No existe un servicio frontend/backend para enviar, revisar, aceptar o rechazar propuestas. La especificación funcional y las reglas de privacidad siguen en [Integración de propuestas y adjudicación](../architecture/company-proposals-integration.md).
- Guardar y descartar problemas o propuestas aún no tiene persistencia conectada.
- La experiencia Swipe debe consumir los problemas reales disponibles y esperar el contrato seguro de propuestas antes de ofrecer su envío.

## Talento y portafolios

- La vista de Explorar para empresas necesita una consulta frontend de perfiles profesionales publicados que respete la privacidad y el contrato descritos en [ADR-0008](../decisions/ADR-0008-profile-storage-and-privacy.md). Mientras no esté conectada, la pantalla comunica el estado pendiente y no muestra perfiles de ejemplo.

## Matches y conversaciones

- La aplicación no tiene una fuente conectada de Matches ni un servicio de conversaciones. El chat debe validar en backend que las partes tengan un Match autorizado antes de exponer el historial o permitir mensajes.
- El estado vacío de Chats enlaza a Matches existentes como vista informativa; no crea una conversación ni presupone mensajería en tiempo real.
