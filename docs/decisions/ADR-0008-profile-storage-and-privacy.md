# ADR-0008: Perfiles públicos y almacenamiento de portafolio

## Estado

Aceptado para la fase de base de datos, sujeto a validar la migración local y el proyecto remoto antes de desplegar.

## Contexto

MatchWork ya usa `app_users` para conservar un rol de cuenta controlado por la base de datos. Los perfiles profesionales requieren datos públicos consultables, borradores privados, habilidades extensibles y portafolios sin exponer Auth ni archivos de proyectos no publicados.

## Decisión

- Mantener `app_users` como origen confiable del UUID y tipo de cuenta; usar `profiles` para campos de presentación seguros y `freelancer_profiles` para datos profesionales.
- Inicializar nuevos registros mediante el trigger de Auth existente y ofrecer `ensure_my_profile()` idempotente para cuentas que ya tengan `app_users`. Todo perfil nuevo y migrado comienza sin publicar.
- Permitir lectura anónima de campos de perfil solo con `is_public`; aplicar la misma condición a habilidades y proyectos relacionados. Borradores propios quedan disponibles a su usuario autenticado.
- Mantener un catálogo `skills` que solo puede modificar el backend; guardar capacidades no catalogadas en la relación propiedad del freelancer.
- Reutilizar y ampliar `company_profiles`; los datos de empresas siguen privados y sus escrituras continúan pasando por RPC autenticado.
- Usar `avatars` público con formatos de imagen y límite de 2 MiB, y `portfolio-media` privado con límite de 5 MiB. Los datos del portafolio requieren firma temporal después de comprobar publicación.
- Mantener migraciones SQL, pruebas pgTAP y tipos en el repositorio. No ejecutar cambios remotos sin previsualización, respaldo comprobado y aprobación.

## Alternativas consideradas

- Reemplazar `app_users`: descartado porque rompería el flujo de autenticación y permisos existente.
- Confiar en `raw_user_meta_data` para roles públicos: descartado porque no es fuente de autorización estable.
- Hacer público el bucket de portafolio: descartado porque los borradores quedarían recuperables por URL aunque RLS ocultara sus filas.
- Permitir cambios de clientes al catálogo global de habilidades: descartado para que una cuenta no cambie etiquetas compartidas.

## Consecuencias

- El disparador de Auth puede cancelar un alta si la escritura de perfil falla; el helper idempotente facilita la reparación posterior de cuentas con `app_users` existente.
- Las URL de avatar son públicas desde su carga, incluso antes de publicar. Solo se deben subir imágenes que el usuario acepte hacer públicas.
- La app futura debe guardar rutas de Storage y firmar medios de proyectos publicados. La eliminación debe retirar objetos mediante Storage, no con SQL.
- No se fija una lista cerrada de estados de disponibilidad ni categorías de habilidades; esos catálogos requieren una decisión funcional posterior.

## Fecha

2026-10-14
