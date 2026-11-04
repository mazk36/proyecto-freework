# Requisitos de Auth para producción (GoTrue autoalojado)

Los valores locales de `supabase/config.toml` son de desarrollo. En producción hay que fijar:

| Ajuste | Valor | Motivo |
|---|---|---|
| `GOTRUE_MAILER_AUTOCONFIRM` | `false` | Con confirmación de correo GoTrue responde igual a un registro nuevo y a uno repetido; con autoconfirm devuelve «User already registered» y permite enumerar correos (probado en local). |
| `GOTRUE_SITE_URL` | URL pública final (https) | Base de los enlaces de los correos. |
| `GOTRUE_URI_ALLOW_LIST` | Solo `https://<dominio>/auth/callback/**` | Evita redirecciones de correo a dominios ajenos. |
| `GOTRUE_PASSWORD_MIN_LENGTH` | `8` o más | El frontend exige 8; el servidor debe exigirlo también. |
| `GOTRUE_DISABLE_SIGNUP` | `false` | El registro es público. |
| `GOTRUE_RATE_LIMIT_EMAIL_SENT` | p. ej. `10`/hora | Limita correos de recuperación y confirmación. |
| `GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED` | `true` | Rotación de tokens. |
| `GOTRUE_JWT_EXP` | `3600` | Vida corta del token de acceso. |
| `GOTRUE_EXTERNAL_GOOGLE_*` | solo si se mantiene el botón de Google | Redirección autorizada solo al dominio final. |

El frontend ya valida `next` con `safeAppDestination` (solo rutas `/app/...`, sin `//` ni `\`), de modo que no hay redirección abierta desde el inicio de sesión.

Notas:
- Una cuenta suspendida con sesión abierta sigue pudiendo leer (la app le muestra el aviso) pero no escribir: el trigger `guard_suspended_write` y `require_active_account` rechazan RPC y escrituras directas (probado en `e2e/security.mjs`).
- No hay comprobación de contraseñas filtradas en el GoTrue autoalojado; decisión de producto: subir el mínimo a 10 y/o exigir mezcla de caracteres.
