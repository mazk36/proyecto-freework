# Integración de propuestas y Matches

La publicación de problemas y la integración de propuestas del freelancer ya cuentan con persistencia. La migración `20261102040000_company_inbox_matches.sql` añade la bandeja de la empresa, sus interacciones privadas y los Matches. Las migraciones deben aplicarse y probarse en Supabase para que estos contratos estén disponibles. La fase de chat añade persistencia y servicios, sin implementar su interfaz.

## Propuestas del freelancer

- `save_proposal_draft(problem_id, data)` crea un borrador si `data` no contiene `id`; si lo contiene, actualiza solo los campos enviados del borrador propio. Devuelve el UUID. Los campos ausentes se conservan al actualizar; un texto o precio con `null` se limpia. La moneda solo acepta `PEN` o `USD` y por defecto es `PEN`.
- `submit_proposal(proposal_id)` exige diagnóstico, solución, entregables, plazo y precio; costos recurrentes, mantenimiento/garantía y experiencia son opcionales. El plazo es texto libre. `withdraw_proposal(proposal_id)` admite borradores y propuestas enviadas sin Match y conserva el historial; rechaza retirar una propuesta con Match.
- Las operaciones requieren una cuenta freelancer y usan bloqueos transaccionales. Guardar y enviar comprueban que el problema siga abierto; retirar también está permitido si fue pausado o cerrado. El autor puede leer todas sus propuestas; la empresa dueña solo las enviadas. Cada freelancer puede tener una sola propuesta no retirada por problema. No se realiza conversión de moneda. Las propuestas enviadas no se editan como borrador.

Al crear cada borrador se conserva una copia inmutable del título del problema abierto, utilizada en «Mis propuestas» aunque el problema cambie de título o deje de estar disponible. Para propuestas anteriores, la migración toma el título existente en ese momento. Al retirar una propuesta sin Match, la interacción vuelve de `proposal_submitted` a `saved` si no queda otra propuesta activa del mismo freelancer para el problema; así reaparece en «Me interesan» mientras esté abierto. Los demás estados permanecen iguales y el RPC general de interacción no permite realizar esa transición.

## Bandeja y Matches

- `list_problem_proposals(problem_id)` requiere la empresa dueña y devuelve todas las propuestas enviadas, ordenadas por fecha de envío ascendente. Incluye diagnóstico, solución, entregables, plazo, precio y moneda originales, costos recurrentes, mantenimiento/garantía y experiencia relacionada, además del nombre de perfil del autor. El slug y titular solo se incluyen si el perfil es público. También devuelve el estado privado de la empresa o `null` y el UUID del Match, si existe.
- `set_proposal_interaction(proposal_id, next)` requiere una propuesta enviada de la empresa y un problema abierto o pausado. Sin interacción, `saved`, `dismissed` e `interested` guardan el estado; deshacer con `null` elimina `saved` o `dismissed`. Las demás combinaciones, incluida la solicitud de `unseen`, conservan el estado actual. Una propuesta guardada o descartada debe deshacerse antes de elegir otra acción. `interested` es definitivo y crea un Match en la misma transacción; repetirlo conserva el mismo Match. La ausencia de fila se interpreta como `unseen`.
- `list_my_matches()` devuelve únicamente Matches del usuario autenticado, con IDs, título del problema, fecha y nombre de la contraparte cuando está disponible. Para el freelancer se respeta la opción de mostrar u ocultar el nombre de la empresa en el problema. Los favoritos y descartes nunca se devuelven al freelancer.
- El servicio `company-inbox-service.ts` adapta los RPC a tipos de aplicación y valida las respuestas. `toggleCompare` mantiene una selección local de hasta tres propuestas; no almacena comparaciones. La bandeja no ordena por precio ni calcula compatibilidad.

Un Match expresa interés mutuo para continuar conversando; no implica contratación ni pago.

## Chat interno

- Cada Match identifica una conversación entre la empresa y el freelancer. `send_message(match_id, body, client_id)` acepta únicamente texto de 1 a 2000 caracteres tras recortarlo. Un `client_id` estable por intento permite reintentar sin duplicados; los envíos se limitan a 30 por minuto, remitente y conversación. El Match sigue habilitando la conversación cuando se cierra el problema.
- `list_conversations()` devuelve los Matches propios con el título inmutable de la propuesta, el nombre de contraparte permitido, el último mensaje resumido y el número de mensajes no leídos. Para el freelancer, el nombre de empresa respeta `show_company_name`. `unread_total()` suma mensajes recibidos que todavía no se han marcado como leídos.
- `list_messages(match_id, before, limit)` devuelve hasta 100 mensajes en orden cronológico, con 50 por defecto. Para cargar la página anterior, usa el `createdAt` original del primer mensaje recibido como `before`, sin convertirlo a `Date` ni perder su precisión. Los envíos de la aplicación generan tiempos estrictamente crecientes por conversación, incluso con solicitudes concurrentes.
- `mark_conversation_read(match_id)` marca como leídos todos los mensajes existentes hasta el momento de la llamada, no solo los visibles en pantalla. Los mensajes posteriores de la contraparte vuelven a contar como no leídos. `subscribeToMessages` escucha inserciones por Match mediante Supabase Realtime y devuelve una función para cancelar la suscripción; tras reconectar, el cliente debe volver a consultar el historial y los no leídos para recuperar eventos perdidos.
- `chat-service.ts` valida las respuestas y adapta los RPC a tipos de aplicación. `chat.ts` agrupa por día y remitente, mantiene estados de envío y reconcilia las confirmaciones por `client_id`. La fase no incorpora UI, adjuntos ni campos o integraciones de contacto externo.

## Capacidades pendientes

- Una publicación abierta que se edite vuelve a `draft` y deja de aparecer en la función pública hasta su nueva confirmación. Cuando existan propuestas, esa operación debe correr en transacción, conservar el historial y avisar a los desarrolladores afectados de cualquier cambio material de alcance o presupuesto.
