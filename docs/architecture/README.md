# Arquitectura

La aplicación web usa Next.js App Router, TypeScript y Tailwind CSS, según [ADR-0001](../decisions/ADR-0001-frontend-stack.md). MatchWork se exporta como sitio estático para GitHub Pages. La autenticación, los perfiles y las publicaciones usan Supabase Auth y PostgreSQL con controles RLS según [ADR-0007](../decisions/ADR-0007-supabase-auth-postgres.md).

La web pública contiene la landing, `/iniciar-sesion`, `/registro` y `/auth/callback`. La aplicación se agrupa bajo `/app`; su navegación cambia según el rol persistido. La UI está en español y la identidad visual (colores, tipografía y geometría) se define mediante variables CSS compartidas y está documentada en [MatchWork core identity](../brand/matchwork-core-identity.md).

`AuthProvider` integra la sesión de Supabase Auth y obtiene el rol desde `app_users`, donde los usuarios solo pueden leer su propio perfil. `AuthBoundary` ofrece navegación y redirecciones en el navegador; no es el control de seguridad. Las funciones PostgreSQL y los privilegios RLS son la autoridad para leer o mutar perfiles y publicaciones.

No hay datasets mock en la aplicación. Las secciones sin fuente de datos muestran estados vacíos. Las funciones puras de Discovery y sus pruebas permanecen separadas de la presentación para conservar la lógica de dominio sin alimentar la UI con contenido de ejemplo.

La migración para el Camino A está en `supabase/migrations`. Aplica los pasos de configuración descritos en [integración Supabase](company-proposals-integration.md) y [flujo de desarrollo](../development/supabase-setup.md) antes de probar cuentas o publicaciones reales. El módulo de propuestas y adjudicación aún no tiene tablas ni servicios.
