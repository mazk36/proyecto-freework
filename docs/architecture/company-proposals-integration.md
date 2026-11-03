# Integración de propuestas y Matches

La publicación de problemas y la integración de propuestas del freelancer ya cuentan con persistencia. La migración `20261102040000_company_inbox_matches.sql` añade la bandeja de la empresa, sus interacciones privadas y los Matches. Las migraciones deben aplicarse y probarse en Supabase para que estos contratos estén disponibles; la interfaz de bandeja y Matches queda fuera de esta fase.

## Propuestas del freelancer

- `save_proposal_draft(problem_id, data)` crea un borrador si `data` no contiene `id`; si lo contiene, actualiza solo los campos enviados del borrador propio. Devuelve el UUID. Los campos ausentes se conservan al actualizar; un texto o precio con `null` se limpia. La moneda solo acepta `PEN` o `USD` y por defecto es `PEN`.
- `submit_proposal(proposal_id)` exige diagnóstico, solución, entregables, plazo y precio; costos recurrentes, mantenimiento/garantía y experiencia son opcionales. El plazo es texto libre. `withdraw_proposal(proposal_id)` admite borradores y propuestas enviadas sin Match y conserva el historial; rechaza retirar una propuesta con Match.
- Las operaciones requieren una cuenta freelancer y usan bloqueos transaccionales. Guardar y enviar comprueban que el problema siga abierto; retirar también está permitido si fue pausado o cerrado. El autor puede leer todas sus propuestas; la empresa dueña solo las enviadas. Cada freelancer puede tener una sola propuesta no retirada por problema. No se realiza conversión de moneda. Las propuestas enviadas no se editan como borrador.

## Bandeja y Matches

- `list_problem_proposals(problem_id)` requiere la empresa dueña y devuelve todas las propuestas enviadas, ordenadas por fecha de envío ascendente. Incluye diagnóstico, solución, entregables, plazo, precio y moneda originales, costos recurrentes, mantenimiento/garantía y experiencia relacionada, además del nombre de perfil del autor. El slug y titular solo se incluyen si el perfil es público. También devuelve el estado privado de la empresa o `null` y el UUID del Match, si existe.
- `set_proposal_interaction(proposal_id, next)` requiere una propuesta enviada de la empresa y un problema abierto o pausado. Sin interacción, `saved`, `dismissed` e `interested` guardan el estado; deshacer con `null` elimina `saved` o `dismissed`. Las demás combinaciones, incluida la solicitud de `unseen`, conservan el estado actual. Una propuesta guardada o descartada debe deshacerse antes de elegir otra acción. `interested` es definitivo y crea un Match en la misma transacción; repetirlo conserva el mismo Match. La ausencia de fila se interpreta como `unseen`.
- `list_my_matches()` devuelve únicamente Matches del usuario autenticado, con IDs, título del problema, fecha y nombre de la contraparte cuando está disponible. Para el freelancer se respeta la opción de mostrar u ocultar el nombre de la empresa en el problema. Los favoritos y descartes nunca se devuelven al freelancer.
- El servicio `company-inbox-service.ts` adapta los RPC a tipos de aplicación y valida las respuestas. `toggleCompare` mantiene una selección local de hasta tres propuestas; no almacena comparaciones. La bandeja no ordena por precio ni calcula compatibilidad.

Un Match expresa interés mutuo para continuar conversando; no implica contratación ni pago.

## Capacidades pendientes

- La lista del freelancer cruza sus propuestas con la lectura pública de problemas abiertos. Esa lectura no devuelve problemas pausados, cerrados o en edición: en esos casos se muestra `Problema #<id>` y el borrador puede abrirse para consulta, pero el servidor solo permite guardarlo o enviarlo mientras el problema esté abierto. Obtener sus títulos de forma segura cuando dejen de estar abiertos requeriría ampliar el contrato de datos autorizado.
- Retirar una propuesta sin Match no cambia la interacción `proposal_submitted`; por el contrato actual, el problema no reaparece automáticamente en el mazo después del retiro.
- Una publicación abierta que se edite vuelve a `draft` y deja de aparecer en la función pública hasta su nueva confirmación. Cuando existan propuestas, esa operación debe correr en transacción, conservar el historial y avisar a los desarrolladores afectados de cualquier cambio material de alcance o presupuesto.
