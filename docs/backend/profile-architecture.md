# Arquitectura de perfiles y portafolios

Esta fase añade datos profesionales y portafolios a la persistencia Supabase que ya usa MatchWork. La aplicación conserva `app_users` como autoridad para el UUID y el tipo de cuenta; `profiles` contiene únicamente campos destinados a mostrarse en un perfil. El esquema no copia correo, sesión ni metadatos de Auth.

## Modelo

| Tabla | Propósito | Visibilidad |
| --- | --- | --- |
| `auth.users` | Identidad y autenticación administradas por Supabase | Nunca se consulta desde la API pública |
| `app_users` | Nombre y tipo de cuenta confiables usados por las reglas actuales | El usuario autenticado solo puede leer su fila |
| `profiles` | Nombre público, slug, avatar y estado de publicación | Público al publicarse; el propietario también ve su borrador |
| `freelancer_profiles` | Titular, biografía, ubicación general, experiencia, enlace y disponibilidad | Público solo con perfil publicado; editable por su dueño |
| `company_profiles` | Nombre, sector y país existentes, más descripción y sitio opcionales | Privado en esta fase; se conserva el RPC de empresas |
| `skills` | Catálogo compartido de habilidades | Activas para usuarios autenticados; para visitantes solo las asociadas a perfiles publicados |
| `freelancer_skills` | Relación entre freelancer y habilidad de catálogo o etiqueta personalizada | Público solo con perfil publicado; editable por su dueño |
| `portfolio_projects` | Proyectos, habilidades utilizadas, orden y estado de publicación | Borradores visibles al dueño; publicados visibles solo con perfil público |
| `portfolio_media` | Metadatos y rutas relativas de imágenes | Mismas reglas de visibilidad del proyecto |

`profiles.id` corresponde al usuario autenticado. Una clave foránea compuesta mantiene `account_type` consistente con `app_users.role`; las credenciales de cliente no pueden cambiar ninguno de esos valores. Las claves propietarias tampoco están en los privilegios de actualización de las tablas hijas.

Las habilidades de catálogo no se editan desde clientes. Una capacidad aún no catalogada se puede guardar como `custom_name` dentro de la relación del freelancer. Para promoverla al catálogo compartido, una futura migración o proceso administrativo debe crear una fila en `skills`; no se cambia la etiqueta global desde un perfil individual.

## Usuarios existentes y registro

La migración rellena `profiles` desde filas existentes de `app_users`, conservando UUID, rol y nombre, y deja `is_public = false`. Crea una fila profesional vacía para cada freelancer. No crea datos para Auth users sin una fila confiable en `app_users` y no deduce un rol de `raw_user_meta_data` durante el backfill.

El trigger actual de Auth se amplía para insertar el perfil base y la fila freelancer después de insertar `app_users`. La operación es transaccional e idempotente. Como el trigger puede rechazar el alta si falla la base de datos, la migración agrega también `ensure_my_profile()`: una llamada autenticada puede completar el perfil de forma idempotente, pero solo si ya existe el `app_users` confiable. Ninguna función acepta un UUID propietario del cliente.

No se actualiza ni se reinicia `auth.users`, no se elimina ninguna cuenta y no se publican perfiles automáticamente. La migración no modifica la UI ni el flujo actual de registro.

## Publicación

Los perfiles se crean como borradores. Solo `save_my_profile` puede cambiar `is_public`, y solo para `auth.uid()`. Publicar o despublicar un perfil no cambia automáticamente la publicación individual de un proyecto; las consultas y políticas requieren que ambos estados sean públicos. Los perfiles de empresas permanecen privados en esta fase.

El formulario profesional guarda LinkedIn y GitHub con la migración incremental `20261019010000_freelancer_social_links.sql`. Las columnas mantienen las políticas del perfil profesional y validan los dominios de destino. `20261019020000_portfolio_project_skills.sql` añade hasta 20 etiquetas de habilidades utilizadas por proyecto; comparte la visibilidad RLS del proyecto. La vista pública usa la ruta estática `/profesionales/?slug=...`, compatible con exportación estática y protegida por las mismas políticas RLS.

## Imágenes

- `avatars` es público, acepta JPEG, PNG y WebP hasta 2 MiB y permite escrituras solo bajo la carpeta del usuario. Una vez subido, el objeto se puede recuperar con su URL pública aun si el perfil sigue como borrador. El cliente debe ofrecer únicamente imágenes que el usuario acepte hacer públicas.
- `portfolio-media` es privado, acepta JPEG, PNG y WebP hasta 5 MiB y exige una ruta `user_id/project_id/file_id.ext` de un proyecto propio. Las políticas de lectura permiten firmar enlaces solo para imágenes referenciadas por proyectos publicados de perfiles públicos, o para archivos propios. Los enlaces firmados expiran según el plazo solicitado.
- Un enlace firmado ya emitido sigue funcionando hasta expirar aunque después se retire el proyecto o el perfil; la futura UI debe usar un plazo corto apropiado para contenido público.
- PostgreSQL almacena rutas y metadatos, nunca bytes. La tabla `storage.objects` pertenece al servicio Storage: las cargas, reemplazos y eliminaciones deben pasar por la API Storage, no por SQL.
- Al eliminar un proyecto o una imagen, la futura integración debe retirar primero el archivo mediante Storage y después borrar sus filas. La política permite que el dueño borre archivos propios huérfanos si una eliminación se interrumpe. La fila de detalles freelancer no se puede borrar directamente, para evitar que una cascada retire su portafolio por accidente.

Los límites por bucket son límites de archivo, no cuotas del proyecto. El plan Free publicado actualmente incluye 1 GB de almacenamiento de archivos y 500 MB de base de datos; también puede pausar proyectos inactivos y no incluye backups automáticos. Verifica los límites vigentes antes de producción en [precios de Supabase](https://supabase.com/pricing) y [precios de Storage](https://supabase.com/docs/guides/storage/pricing). Las transformaciones de imágenes no forman parte de esta fase.

## Migraciones y recuperación

La migración de perfiles es `supabase/migrations/20261014010000_public_profiles_portfolios.sql`; depende de `20261009010000_company_problem_publishing.sql` y del esquema `storage` de Supabase. El cambio se versiona y no se debe aplicar manualmente en producción por fuera de esa migración.

Para el plan Free, Supabase recomienda exportaciones lógicas periódicas. Una restauración de PostgreSQL no restaura los bytes de Storage; estos requieren una copia separada. Antes de una migración remota, verifica que la copia de la base y de los objetos sea recuperable y ensaya la restauración en un proyecto de prueba. Consulta la [guía oficial de backups](https://supabase.com/docs/guides/platform/backups).

La migración incorpora buckets solo si no existen. Si un bucket con el mismo ID ya existe con configuración distinta, aborta en lugar de cambiar visibilidad o límites sin revisión.

Despliegue remoto verificado el 2026-10-19 en `kcbooheuultksqljujfk`: tras confirmar que la migración empresarial base ya estaba materializada, se registró con `migration repair`; luego se aplicaron `20261014010000`, `20261019010000` y `20261019020000`. El `db push --dry-run` final informa que el remoto está al día. No se borraron ni reconstruyeron tablas o usuarios.

La base remota conserva 2 usuarios Auth y 2 filas `app_users`; el backfill creó 2 perfiles privados y 1 detalle freelancer. No se publicaron perfiles ni se crearon proyectos u objetos Storage. Las 6 tablas de perfil tienen RLS; el catálogo registra 18 políticas públicas y 9 de Storage. `avatars` es público, de 2 MiB; `portfolio-media` es privado, de 5 MiB. El respaldo del 2026-10-19 pasó la verificación SHA-256 y su restauración aislada ya se había ensayado. `db lint --linked --schema public --fail-on error` no encontró errores.

La contraseña temporal de CLI expuesta en la transcripción anterior fue emitida más de ocho horas antes de esta revisión, muy por encima de los cientos de segundos de TTL documentados por Supabase. La CLI re-inicializó el rol temporal durante la revisión; esas contraseñas no se imprimieron y expiran automáticamente. El HTTP REST con la clave pública configurada respondió 200 y solo devolvió perfiles públicos (ninguno). No había un usuario de prueba autorizado para validar una sesión real, carga de archivos o creación de URLs firmadas; no se crearon usuarios ni archivos de prueba persistentes en producción.
