# Arquitectura

La aplicación web usa Next.js App Router, TypeScript y Tailwind CSS, según [ADR-0001](../decisions/ADR-0001-frontend-stack.md). MatchWork se exporta como sitio estático para GitHub Pages. La autenticación, los perfiles y las publicaciones usan Supabase Auth y PostgreSQL con controles RLS según [ADR-0007](../decisions/ADR-0007-supabase-auth-postgres.md).

La web pública contiene la landing, `/iniciar-sesion`, `/registro` y `/auth/callback`. La aplicación se agrupa bajo `/app`; su navegación cambia según el rol persistido. La UI está en español y la identidad visual (colores, tipografía y geometría) se define mediante variables CSS compartidas y está documentada en [MatchWork core identity](../brand/matchwork-core-identity.md).

`AuthProvider` integra la sesión de Supabase Auth y obtiene el rol desde `app_users`, donde los usuarios solo pueden leer su propio perfil. `AuthBoundary` ofrece navegación y redirecciones en el navegador; no es el control de seguridad. Las funciones PostgreSQL y los privilegios RLS son la autoridad para leer o mutar perfiles y publicaciones.

Los portafolios profesionales se basan en `profiles`, `freelancer_profiles`, `freelancer_skills`, `portfolio_projects` y `portfolio_media`. Las filas de perfil existentes se migran desde `app_users` como borradores privados; una publicación futura requerirá acción explícita. Los avatares viven en un bucket público y los medios de proyectos en uno privado. El detalle está en [arquitectura de perfiles](../backend/profile-architecture.md) y [seguridad RLS](../backend/security-and-rls.md).

No hay datasets mock en la aplicación. Las secciones sin fuente de datos muestran estados vacíos. Las funciones puras de Discovery y sus pruebas permanecen separadas de la presentación para conservar la lógica de dominio sin alimentar la UI con contenido de ejemplo.

Las migraciones están en `supabase/migrations`. La aplicación integra propuestas para freelancers; la bandeja de empresa y los Matches cuentan con persistencia y servicios, pero aún no con interfaz. Consulta el [contrato de propuestas](company-proposals-integration.md) y el [flujo de desarrollo](../development/supabase-setup.md) antes de probar cuentas, publicaciones o propuestas reales.

## Verificación y moderación

La fase 5a incorpora solo persistencia y servicios: solicitudes privadas de verificación, lista de administradores, auditoría, suspensión y un ajuste de publicación. Los cambios se realizan por RPC con autorización en PostgreSQL; las pantallas de empresa y administración se implementarán después. El feed y las conversaciones reciben únicamente el indicador de verificación pertinente, sin modificar su orden. Los contratos, las cuotas, los motivos visibles y el procedimiento para dar de alta al primer administrador se describen en [seguridad y RLS](../backend/security-and-rls.md).
