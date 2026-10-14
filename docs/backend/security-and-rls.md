# Seguridad y RLS de perfiles

Todas las tablas nuevas con datos de usuario tienen RLS. Los roles `anon` y `authenticated` reciben solo los privilegios de columnas que necesitan; una política de fila no autoriza columnas que no estén concedidas.

## Matriz de acceso

| Recurso | Visitante | Usuario autenticado |
| --- | --- | --- |
| `profiles` | Filas publicadas, columnas públicas | Filas publicadas y borrador propio |
| `freelancer_profiles` | Detalles de perfiles publicados | Además, sus propios detalles |
| `skills` | Habilidades activas usadas en perfiles publicados | Catálogo activo para seleccionar habilidades |
| `freelancer_skills` | Relaciones de perfiles publicados | Además, relaciones propias |
| `portfolio_projects` / `portfolio_media` | Publicados cuando el perfil también es público | Además, borradores propios |
| `app_users` / `company_profiles` | Sin acceso directo | `app_users` propio; empresa mediante RPC existente |
| `auth.users` | Sin acceso por API pública | Administrado por Supabase Auth, no por tablas públicas |

No hay acceso de escritura directo a `profiles`. `save_my_profile(jsonb)` usa `auth.uid()`, verifica una lista cerrada de campos y nunca acepta el propietario ni el tipo de cuenta. Las tablas hijas conceden escrituras solo a columnas editables: el UUID propietario, IDs y timestamps no se pueden cambiar. Las políticas verifican que la fila pertenezca a la sesión y que el perfil base sea freelancer. La FK compuesta fija `profiles.account_type` al rol de `app_users`.

El catálogo `skills` no concede `INSERT`, `UPDATE` ni `DELETE` a clientes. Los nombres fuera del catálogo se almacenan como etiquetas de la relación propia, sin afectar a otros perfiles. Habilidades de freelancers no son requisitos para publicar problemas.

## Funciones elevadas

`create_profile_for_app_user`, `ensure_my_profile`, `save_my_profile` y el trigger de Auth usan `SECURITY DEFINER` con `search_path = ''`. El helper de creación no es ejecutable por roles de cliente; el RPC público autenticado valida `auth.uid()` y consulta el `app_users` de ese usuario. La escritura del perfil base ocurre solo después de esa verificación. La función existente `save_company_profile` conserva el chequeo `require_company_user` y agrega campos opcionales sin alterar la forma requerida por el cliente actual.

El trigger de registro comparte la transacción del alta de Auth y, por eso, un error SQL puede rechazar un registro. Se conserva como mecanismo atómico ya usado por `app_users`; `ensure_my_profile()` permite completar de forma idempotente perfiles de cuentas existentes sin confiar en metadata de Auth. La prueba de trigger debe correrse en Supabase local antes del despliegue.

## Storage

`avatars` es público: cualquier persona con la URL puede recuperar el archivo incluso si el perfil es borrador. Los controles de Storage siguen exigiendo autenticación para subir, reemplazar o borrar y limitan la ruta a la carpeta del usuario.

`portfolio-media` es privado. Las lecturas con enlace temporal requieren RLS que confirme la referencia de la imagen, que el proyecto esté publicado y que su perfil propietario también sea público; el dueño autenticado puede leer y gestionar sus propios objetos. La política de escritura requiere que la carpeta del proyecto pertenezca al mismo usuario. Las carpetas no autorizadas, nombres no imagen y cargas anónimas no pasan las políticas. La configuración de bucket limita tamaño y MIME a JPEG, PNG y WebP.

El permiso MIME de Storage valida el tipo declarado por la solicitud y no sustituye un proceso de inspección/optimización de contenido. No se aceptan documentos, vídeo ni archivos privados en esos buckets. `service_role` no debe usarse en el cliente.

Las políticas se diseñaron para la API Storage. SQL no debe crear o borrar filas de `storage.objects`: el catálogo de Storage es metadato administrado por el servicio y borrar metadatos no elimina los bytes del proveedor.

## Pruebas

`supabase/tests/database/profiles_portfolio_rls.test.sql` comprueba lectura anónima, propiedad, publicación, columnas protegidas, unicidad, buckets y políticas de Storage con roles `anon` y `authenticated`. Las filas de metadata de objetos de prueba se insertan dentro de la transacción de prueba y se revierten; no suben archivos binarios. La validación de cargas HTTP reales requiere Supabase local y queda pendiente cuando no esté disponible el CLI/entorno local.
