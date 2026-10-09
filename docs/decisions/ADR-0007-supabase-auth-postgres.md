# ADR-0007: Autenticación y persistencia con Supabase

## Estado

Aceptado.

## Contexto

La web de MatchWork se exporta como sitio estático para GitHub Pages. El Camino A necesita cuentas reales, borradores compartidos, publicaciones y permisos aplicados en la fuente de datos. No hay API propia ni proveedor de autenticación o persistencia adoptado.

## Decisión

- Usar Supabase Auth para registro, inicio, cierre y recuperación de contraseña.
- Usar PostgreSQL de Supabase para cuentas, perfiles empresariales y publicaciones.
- Aplicar Row Level Security y privilegios mínimos a las tablas. Las tablas de empresas y problemas no conceden acceso de lectura o escritura directo a los roles públicos; los RPC validan sesión, rol y propiedad antes de leer o escribir.
- Registrar el rol seleccionado al crear la cuenta en una tabla controlada por la base de datos. El usuario puede leer su rol, pero no modificarlo desde el cliente.
- Permitir que freelancers consulten únicamente campos de problemas abiertos mediante un RPC público autenticado. La función omite el nombre de empresa cuando está oculto y no devuelve contexto privado.
- Usar en el frontend únicamente la URL de proyecto y la publishable key. No se usa una service role key en el navegador ni en GitHub Pages.
- Mantener la aplicación estática. Email confirmation y recuperación regresan a una ruta estática de callback que procesa Supabase Auth.

## Alternativas consideradas

- API propia: no adoptada porque no existe despliegue de servidor en el repositorio.
- Supabase SSR: no adoptado para este flujo, porque el frontend de producción no ejecuta un servidor Next.js y se exporta como HTML estático.
- Acceso directo del cliente a tablas: no adoptado para problemas empresariales porque los campos de identidad y contexto requieren una superficie de lectura más restringida que una consulta de tabla completa.

## Consecuencias

- Aplicar la migración SQL y configurar URL, publishable key, redirects de Auth y variables de GitHub Pages antes de habilitar la experiencia en producción.
- La selección de empresa o freelancer queda fija en el perfil de base de datos tras el alta; RLS y los RPC no confían en el rol del navegador.
- Los problemas pueden persistir como borradores, publicarse, pausarse, reanudarse, editarse con consentimiento renovado y cerrarse.
- El esquema no incluye propuestas ni adjudicaciones. No se muestra una contratación ni se simula que existan propuestas; esa integración se documenta por separado.

## Fecha

2026-10-09
