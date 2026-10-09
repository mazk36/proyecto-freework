# Integración pendiente: propuestas y adjudicación

La publicación de problemas y la lectura limitada de problemas abiertos ya tienen persistencia. El repositorio todavía no contiene entidades, tablas, endpoints ni experiencia real para propuestas, perfiles profesionales asociados a propuestas, comparación, adjudicación o proyectos. Por eso el dashboard informa la dependencia sin mostrar resultados o métricas inventadas.

## Contratos que necesita la siguiente fase

- Cada propuesta debe pertenecer a un freelancer y a un problema abierto. El freelancer autor puede leer y actualizar su propuesta; la empresa responsable puede leerla; otros freelancers y empresas no.
- La creación debe ejecutarse en una función transaccional que vuelva a comprobar rol, propiedad y estado `open`. Las publicaciones pausadas, cerradas o en edición (`draft`) rechazan propuestas nuevas.
- Los datos para comparar deben incluir diagnóstico, solución, entregables, precio y moneda, plazo, costos recurrentes, mantenimiento, garantía y experiencia relacionada. La UI debe permitir comparar hasta tres, sin ordenar automáticamente por precio ni fabricar compatibilidad.
- Los favoritos son privados de la empresa. Seleccionar una propuesta debe validar que aún está disponible y abrir el proceso de Match existente cuando esté implementado. Un Match expresa interés mutuo; no es un contrato, pago ni contratación.
- Una publicación abierta que se edite vuelve a `draft` y deja de aparecer en la función pública hasta su nueva confirmación. Cuando existan propuestas, esa operación debe correr en transacción, conservar el historial y avisar a los desarrolladores afectados de cualquier cambio material de alcance o presupuesto.

No se creó un estado `assigned` ni se presenta una selección como contratación porque esas dependencias aún no existen.
