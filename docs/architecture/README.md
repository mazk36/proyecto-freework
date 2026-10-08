# Arquitectura

La aplicación web usa Next.js App Router, TypeScript y Tailwind CSS, según [ADR-0001](../decisions/ADR-0001-frontend-stack.md). MatchWork se exporta como sitio estático para GitHub Pages.

La web pública contiene la landing, `/iniciar-sesion` y `/registro`. La aplicación se agrupa bajo `/app`; su navegación cambia según el rol de la cuenta temporal. La UI está en español y la identidad visual (colores, tipografía y geometría) se define mediante variables CSS compartidas y está documentada en [MatchWork core identity](../brand/matchwork-core-identity.md).

`AuthProvider` separa la sesión temporal de las pantallas. Conserva en `localStorage` metadatos de cuenta (nombre, correo y rol) y la sesión activa; no escribe contraseñas. `AuthBoundary` redirige las rutas de la app desde el navegador. Como el sitio es estático y no hay servidor de autenticación, esta frontera no es una medida de seguridad y cualquier usuario puede modificarla o evitarla.

No hay datasets mock en la aplicación. Las secciones sin fuente de datos muestran estados vacíos. Las funciones puras de Discovery y sus pruebas permanecen separadas de la presentación para conservar la lógica de dominio sin alimentar la UI con contenido de ejemplo.

La autenticación y autorización reales, la persistencia del producto y la publicación de problemas requieren decisiones e implementación de servidor en una fase posterior. Consulta [ADR-0003](../decisions/ADR-0003-public-private-shell-and-temporary-auth.md) y [la plantilla ADR](../decisions/ADR-0000-template.md) para las decisiones registradas.
