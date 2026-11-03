# Integración de propuestas y dependencias pendientes

La publicación de problemas y la lectura limitada de problemas abiertos ya tienen persistencia. La migración `20261102010000_solution_proposals.sql` añade la tabla `proposals`, sus políticas RLS y funciones SQL para guardar borradores, enviarlos y retirarlos. Las migraciones deben aplicarse y probarse en Supabase para que la integración de propuestas del freelancer esté disponible. Aún no existen comparación, adjudicación ni proyectos.

## Contrato implementado en la migración

- `save_proposal_draft(problem_id, data)` crea un borrador si `data` no contiene `id`; si lo contiene, actualiza solo los campos enviados del borrador propio. Devuelve el UUID. Los campos ausentes se conservan al actualizar; un texto o precio con `null` se limpia. La moneda solo acepta `PEN` o `USD` y por defecto es `PEN`.
- Como criterio de esta fase, `submit_proposal(proposal_id)` exige diagnóstico, solución, entregables, plazo y precio; costos recurrentes, mantenimiento/garantía y experiencia son opcionales. El plazo es texto libre para no imponer unidades o etapas no definidas. `withdraw_proposal(proposal_id)` admite borradores y propuestas enviadas y conserva el historial.
- Las tres operaciones requieren una cuenta freelancer y usan bloqueos transaccionales. Guardar y enviar comprueban que el problema siga abierto; retirar también está permitido si fue pausado o cerrado. El autor puede leer todas sus propuestas; la empresa dueña solo las enviadas. Cada freelancer puede tener una sola propuesta no retirada por problema. No se realiza conversión de moneda. Las propuestas enviadas no se editan como borrador.

## Integración y capacidades pendientes

- La lista del freelancer cruza sus propuestas con la lectura pública de problemas abiertos. Esa lectura no devuelve problemas pausados, cerrados o en edición: en esos casos se muestra `Problema #<id>` y el borrador puede abrirse para consulta, pero el servidor solo permite guardarlo o enviarlo mientras el problema esté abierto. Obtener sus títulos de forma segura cuando dejen de estar abiertos requeriría ampliar el contrato de datos autorizado; no se ha cambiado la base para esta pantalla.
- Retirar una propuesta no cambia la interacción `proposal_submitted`; por el contrato actual, el problema no reaparece automáticamente en el mazo después del retiro.
- Los datos para comparar deben incluir diagnóstico, solución, entregables, precio y moneda, plazo, costos recurrentes, mantenimiento, garantía y experiencia relacionada. La UI debe permitir comparar hasta tres, sin ordenar automáticamente por precio ni fabricar compatibilidad.
- Los favoritos son privados de la empresa. Seleccionar una propuesta debe validar que aún está disponible y abrir el proceso de Match existente cuando esté implementado. Un Match expresa interés mutuo; no es un contrato, pago ni contratación.
- Una publicación abierta que se edite vuelve a `draft` y deja de aparecer en la función pública hasta su nueva confirmación. Cuando existan propuestas, esa operación debe correr en transacción, conservar el historial y avisar a los desarrolladores afectados de cualquier cambio material de alcance o presupuesto.

No se creó un estado `assigned` ni se presenta una selección como contratación porque esas dependencias aún no existen.
