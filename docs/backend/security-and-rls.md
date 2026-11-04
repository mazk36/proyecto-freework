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

## Propuestas

La migración de `proposals` activa RLS y deniega todo acceso a `anon`. Un freelancer autenticado lee sus propias propuestas, incluidas las retiradas; la empresa dueña del problema solo lee las enviadas. Ningún cliente puede insertar, actualizar ni eliminar filas directamente. Una función `SECURITY DEFINER` de solo lectura comprueba la propiedad del problema para la política de la empresa, sin conceder acceso a `business_problems`.

Las escrituras pasan por `save_proposal_draft(uuid, jsonb)`, `submit_proposal(uuid)` y `withdraw_proposal(uuid)`, todas con `search_path` fijo y comprobación del rol persistido. Guardar y enviar requieren un problema abierto. Al crear el borrador se copia el título del problema; el campo es obligatorio, admite hasta 200 caracteres y un trigger impide modificarlo posteriormente. Las filas anteriores reciben el título existente en la migración. En la edición se comprueba además que la propuesta sea del autor y siga en borrador; el envío y retiro comprueban propiedad y transición de estado. El retiro también está permitido si el problema está pausado o cerrado, pero no si existe un Match. El índice único parcial impide más de una propuesta no retirada por freelancer y problema; retirar conserva el historial y permite crear otra.

Las pruebas `supabase/tests/database/proposals_rls.test.sql`, `supabase/tests/database/proposal_input_limits.test.sql` y `supabase/tests/database/proposal_withdraw_and_snapshot.test.sql` cubren permisos, aislamiento por propietario, validaciones, límites, snapshot y transiciones. Deben ejecutarse contra Supabase local antes de aplicar la migración en otro entorno.

Las cuotas de creación, guardado, envío y retiro se describen en la sección de límites de frecuencia.

## Interacciones del freelancer con problemas

`freelancer_problem_interactions` tiene RLS: solo un freelancer autenticado puede leer sus propias filas. `anon` no tiene acceso y los clientes autenticados no tienen escrituras directas. Los RPC `set_problem_interaction(uuid, text)` y `list_my_problem_interactions()` verifican el rol persistido con `require_freelancer_user`, usan `SECURITY DEFINER` con `search_path = ''` y no aceptan un propietario indicado por el cliente.

La ausencia de fila representa `unseen`. Solo se guardan `saved`, `dismissed` y `proposal_submitted`; deshacer elimina `saved` o `dismissed`, incluso si el problema dejó de estar abierto. Las demás transiciones no permitidas conservan el estado. Para las acciones distintas de deshacer, el problema debe estar abierto. Se bloquean el problema, la cuenta del freelancer y la fila existente para serializar también las primeras interacciones. Enviar una propuesta aplica la transición a `proposal_submitted` en la misma transacción si estaba sin interacción o guardada; respeta `dismissed`. Al retirar una propuesta, la interacción vuelve a `saved` únicamente si estaba en `proposal_submitted` y no queda otra propuesta activa del mismo freelancer para el problema. El RPC general de interacción no admite esa transición.

`supabase/tests/database/freelancer_problem_interactions.test.sql` contiene las matrices compartidas con Vitest de 16 transiciones generales y 8 casos de retiro; también comprueba permisos, aislamiento y envío. Debe ejecutarse contra Supabase local antes de aplicar la migración en otro entorno.

## Bandeja de empresa y Matches

`company_proposal_interactions` concede lectura únicamente a la empresa de la fila; los freelancers no pueden consultar sus favoritos ni descartes. `matches` concede lectura solo a sus dos participantes. Ambas tablas tienen RLS, deniegan acceso a `anon` y no permiten escrituras directas a clientes autenticados.

Los RPC de bandeja, interacción y Matches usan `SECURITY DEFINER`, `search_path = ''`, permisos explícitos y comprobación del rol y propietario. La bandeja incluye solo propuestas enviadas: expone el nombre de perfil del autor, pero el slug y titular únicamente cuando el perfil es público. En la lista de Matches del freelancer, el nombre de empresa respeta `show_company_name`. Ningún RPC expone el estado privado de la empresa al freelancer.

La transición valida que el problema esté abierto o pausado y la propuesta siga enviada. Bloquea primero el problema y luego la propuesta, igual que el retiro y el envío. Marcar interés inserta el Match en la misma transacción; la unicidad por propuesta evita duplicados y el retiro posterior se rechaza. La ausencia de interacción significa `unseen`; deshacer elimina guardados o descartados. `supabase/tests/database/company_inbox_matches.test.sql` comprueba permisos, transiciones, privacidad y atomicidad; debe ejecutarse en Supabase local antes de aplicar la migración en otro entorno.

## Chat por Match

`messages` permite `SELECT` solo a los dos participantes del Match y `conversation_reads` solo al propietario del marcador. `anon` no tiene acceso; los clientes autenticados no tienen `INSERT`, `UPDATE` ni `DELETE` directos. Los RPC autorizan el rol persistido y la participación, usan `SECURITY DEFINER` con `search_path = ''` y devuelven el mismo error para una conversación ajena o inexistente. El historial sigue disponible si el problema se cierra. La publicación de Realtime incluye `messages` cuando `supabase_realtime` existe; el filtrado de eventos respeta RLS.

`send_message` recorta y valida texto de 1 a 2000 caracteres, deduplica por Match, remitente y `client_id`, y usa la cuota común de 30 envíos por minuto y conversación para cada remitente. El bloqueo del Match serializa los envíos y los marcadores de lectura. Un reintento que devuelve un mensaje existente no consume cuota. `mark_conversation_read` registra el último mensaje existente en ese momento; los no leídos solo cuentan mensajes de la otra parte posteriores al marcador. La cuota es una medida mínima y no sustituye otras medidas de prevención de abuso. El contrato no incorpora adjuntos ni campos de contacto externo y no inspecciona el texto libre en busca de datos de contacto.

Está permitido compartir contacto externo en el texto del chat. Un aviso suave y descartable sugiere mantener la conversación en MatchWork; el descarte se recuerda en el navegador por Match. No se filtran ni se enmascaran datos de contacto. Esta decisión se revisará cuando exista moderación.

`supabase/tests/database/match_chat.test.sql` cubre permisos, privacidad, validación, paginación, idempotencia, no leídos y cuota. Debe ejecutarse contra Supabase local antes de aplicar la migración en otro entorno.

## Límites de frecuencia

Las escrituras pasan por `enforce_rate_limit`, un helper interno `SECURITY DEFINER` que identifica al usuario con `auth.uid()` y usa bloqueos de transacción para serializar las comprobaciones. Las tablas `rate_limit_policies` y `rate_limit_events` tienen RLS y no conceden acceso directo a `anon` ni a `authenticated`; tampoco pueden ejecutar el helper. Cada evento se confirma o revierte con la operación. Las validaciones y comprobaciones de propiedad preceden a la cuota; las interacciones sin cambio y las publicaciones o mensajes repetidos de forma idempotente no consumen eventos. El envío de una propuesta también actualiza la interacción del problema: si esa transición necesita escribir, debe disponer de cuota de interacción y toda la operación es atómica.

Los valores iniciales por usuario son:

| Acción | Máximo | Ventana |
| --- | ---: | --- |
| `proposal_draft_create` | 20 | 1 hora |
| `proposal_draft_save` | 200 | 1 hora |
| `proposal_submit` | 20 | 1 hora |
| `proposal_withdraw` | 20 | 1 hora |
| `problem_interaction` | 600 | 1 hora |
| `company_interaction` | 300 | 1 hora |
| `problem_draft_create` | 20 | 1 día |
| `problem_draft_save` | 300 | 1 hora |
| `problem_publish` | 20 | 1 día |
| `chat_send` | 30 | 1 minuto por Match |

Un administrador puede ajustar ambos valores positivos sin cambiar las funciones, por ejemplo:

```sql
update public.rate_limit_policies
set max_events = 40, window_seconds = 3600
where action = 'proposal_draft_create';
```

La ventana es móvil. La mayoría de los RPC informa `rate limit exceeded` con código `54000` y un `HINT` con los segundos de espera. Para conservar el contrato del chat, con su política inicial se mantiene el error anterior `message rate limit: maximum 30 messages per minute` y el código `P0001`; si se cambia esa política, utiliza el error común. Cada llamada exitosa puede eliminar hasta 25 eventos del usuario con más de siete días que estén fuera de la ventana de su propia política y hasta 25 más de la acción actual fuera del doble de su ventana. Al ampliar una ventana solo puede contarse el historial que todavía exista.

La migración incorpora los mensajes del último minuto al registro de eventos para conservar la cuota existente durante el cambio. Debe aplicarse en una transacción y con una breve pausa de escrituras de chat para evitar envíos en curso durante el cambio de función. `supabase/tests/database/rate_limits.test.sql` cubre políticas, permisos, ventanas, aislamiento, transiciones, reintentos y cuota del chat.

Quedan pendientes el CAPTCHA de registro con Turnstile y los límites en el borde o la API. No están implementados por esta migración.

## Storage

`avatars` es público: cualquier persona con la URL puede recuperar el archivo incluso si el perfil es borrador. Los controles de Storage siguen exigiendo autenticación para subir, reemplazar o borrar y limitan la ruta a la carpeta del usuario.

`portfolio-media` es privado. Las lecturas con enlace temporal requieren RLS que confirme la referencia de la imagen, que el proyecto esté publicado y que su perfil propietario también sea público; el dueño autenticado puede leer y gestionar sus propios objetos. La política de escritura requiere que la carpeta del proyecto pertenezca al mismo usuario. Las carpetas no autorizadas, nombres no imagen y cargas anónimas no pasan las políticas. La configuración de bucket limita tamaño y MIME a JPEG, PNG y WebP.

El permiso MIME de Storage valida el tipo declarado por la solicitud y no sustituye un proceso de inspección/optimización de contenido. No se aceptan documentos, vídeo ni archivos privados en esos buckets. `service_role` no debe usarse en el cliente.

Las políticas se diseñaron para la API Storage. SQL no debe crear o borrar filas de `storage.objects`: el catálogo de Storage es metadato administrado por el servicio y borrar metadatos no elimina los bytes del proveedor.

## Pruebas

`supabase/tests/database/profiles_portfolio_rls.test.sql` comprueba lectura anónima, propiedad, publicación, columnas protegidas, unicidad, buckets y políticas de Storage con roles `anon` y `authenticated`. Las filas de metadata de objetos de prueba se insertan dentro de la transacción de prueba y se revierten; no suben archivos binarios. La validación de cargas HTTP reales requiere Supabase local y queda pendiente cuando no esté disponible el CLI/entorno local.

## Verificación de empresa y administración (fase 5a)

Aplica y valida esta migración antes de desplegar los servicios TypeScript: los contratos de feed, Matches y chat añaden campos obligatorios. La migración de esta fase crea `company_verifications`, `admins`, `admin_actions` y `app_settings` con RLS y sin privilegios directos para `anon` ni `authenticated`. La razón social, la identificación fiscal y los contactos de la solicitud se entregan únicamente a la empresa propietaria y a los administradores mediante sus RPC autorizadas. `is_admin()` devuelve solo un booleano y está disponible exclusivamente para `authenticated`; las demás RPC administrativas verifican `require_admin()` en el servidor. Las búsquedas son parametrizadas y tratan `%`, `_` y `\` como caracteres literales; las listas usan cursores de fecha y UUID y un máximo de 100 resultados por página.

La ausencia de solicitud significa `not_requested`; enviar o corregir pasa a `pending`, y un administrador puede aprobar o rechazar la solicitud pendiente. La empresa verificada no puede reenviar. El rechazo requiere un motivo de 5 a 200 caracteres y reenviar lo elimina. La aprobación repetida es idempotente. `admin_undo_company_verification` permite al mismo administrador deshacer su aprobación más reciente durante ocho segundos y deja otra fila de auditoría. El RUC peruano se valida por formato de 11 dígitos, sin comprobar dígito verificador. Otros países admiten entre 4 y 30 caracteres. Hay que indicar una URL HTTPS o un correo corporativo; no se admiten credenciales en URLs ni proveedores gratuitos de la lista compartida por SQL y TypeScript. LinkedIn es opcional y limitado a `linkedin.com` y sus subdominios.

El feed incluye `company_verified`; Matches y conversaciones incluyen `counterpart_company_verified`, con `null` cuando la contraparte es freelancer. `list_my_proposal_company_trust()` permite conocer únicamente ese booleano para propuestas propias, incluso cuando el problema no está en el feed. Ninguna de estas respuestas divulga datos fiscales. La verificación no altera el orden del feed.

La suspensión se registra con fecha y motivo en `app_users` o `business_problems`, sin alterar el enum de estado. El control central de cuota rechaza escrituras de cuentas suspendidas con `P0001` / `account suspended`; los triggers también cubren las escrituras directas de perfil y portafolio, y políticas restrictivas protegen las cargas de sus buckets. `get_my_account_status()` permite leer el motivo propio. Las lecturas propias siguen disponibles. Los problemas suspendidos se excluyen del feed y de los agregados y rechazan nuevos borradores de propuesta, envíos e interacciones nuevas de freelancers o empresas con `P0001` / `problem suspended`; las propuestas previas siguen siendo legibles. Los agregados también excluyen empresas y freelancers suspendidos, incluidas sus propuestas. El criterio de freelancer activo sigue siendo perfil público con titular.

`require_company_verification_to_publish` vive en `app_settings` y comienza en `false`. Activarlo no afecta problemas ya publicados ni cambia el ranking. Una publicación nueva sin verificar falla con `P0001` y el mensaje exacto `company verification required to publish`; el servicio devuelve el código `company_verification_required` y lo traduce a «Para publicar necesitas verificar tu empresa». La RPC `admin_set_setting` valida el booleano y audita el cambio. Los cambios de suspensión requieren motivo; no se permite suspender a un administrador. Cada mutación administrativa efectiva registra actor, acción, objetivo, motivo cuando corresponde, fecha y metadatos; los reintentos sin cambios no crean ruido.

La cuota provisional `company_verification_submit` permite cinco envíos por usuario en una ventana móvil de un día y se ajusta en `rate_limit_policies`. Además de la purga anterior, cada llamada exitosa elimina hasta 25 eventos antiguos del mismo usuario y acción anteriores al doble de la ventana actual; se conserva al menos una ventana extra de margen. Aumentar una ventana solo puede recuperar eventos que aún no se hayan purgado.

### Alta inicial de administración

Usa una conexión `psql` con el rol dueño de la base y el UUID de un usuario existente de `public.app_users`. El siguiente comando de una línea pasa el UUID como variable de `psql` (el ejemplo es un marcador, no un usuario real):

```sh
printf '%s\n' "insert into public.admins (user_id) values (:'uid'::uuid) on conflict (user_id) do nothing;" | psql "$DB_URL" -X -v ON_ERROR_STOP=1 -v uid=00000000-0000-4000-8000-000000000000
```

También puede ejecutarse `DB_URL=... supabase/scripts/grant-admin.sh <uuid>`. El script valida el UUID y obtiene la conexión únicamente de `DB_URL`; no contiene credenciales. Este alta es una operación privilegiada fuera de las RPC y debe ejecutarse explícitamente en el entorno correcto. Las pruebas pgTAP nuevas están en `company_verification.test.sql`, `admin_moderation.test.sql`, `suspension_and_strict_mode.test.sql` y `verification_quota_cleanup.test.sql`.
