# Requisitos de Auth para producción (GoTrue autoalojado)

Los valores locales de `supabase/config.toml` son de desarrollo. En producción hay que fijar:

| Ajuste | Valor | Motivo |
|---|---|---|
| `GOTRUE_MAILER_AUTOCONFIRM` | `false` | Sin confirmación de correo el registro entra directo (sin verificar que el correo es del usuario). Ojo: aun con confirmación, esta versión de GoTrue responde «User already registered» a un correo con cuenta; por eso el cliente trata ese error y el de «espera 60 s» como éxito y muestra siempre la misma pantalla «Revisa tu correo» (probado en e2e/email-cycle.mjs). |
| `GOTRUE_SITE_URL` | URL pública final (https) | Base de los enlaces de los correos. |
| `GOTRUE_URI_ALLOW_LIST` | Solo `https://<dominio>/auth/callback/**` | Evita redirecciones de correo a dominios ajenos. |
| `GOTRUE_PASSWORD_MIN_LENGTH` | `10` | El frontend exige 10 (decisión de producto, sin reglas de composición); el servidor debe exigirlo también. |
| `GOTRUE_DISABLE_SIGNUP` | `false` | El registro es público. |
| `GOTRUE_RATE_LIMIT_EMAIL_SENT` | p. ej. `10`/hora | Limita correos de recuperación y confirmación. |
| `GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED` | `true` | Rotación de tokens. |
| `GOTRUE_JWT_EXP` | `3600` | Vida corta del token de acceso. |
| `GOTRUE_EXTERNAL_GOOGLE_*` | solo si se mantiene el botón de Google | Redirección autorizada solo al dominio final. |

El frontend ya valida `next` con `safeAppDestination` (solo rutas `/app/...`, sin `//` ni `\`), de modo que no hay redirección abierta desde el inicio de sesión.

Notas:
- Una cuenta suspendida con sesión abierta sigue pudiendo leer (la app le muestra el aviso) pero no escribir: el trigger `guard_suspended_write` y `require_active_account` rechazan RPC y escrituras directas (probado en `e2e/security.mjs`).
- No hay comprobación de contraseñas filtradas en el GoTrue autoalojado. Decisión de producto: mínimo 10 caracteres, sin reglas de composición.
- Avatares públicos (decisión conocida): el bucket `avatars` es público y se accede por una ruta `uuid/uuid` no adivinable y sin listado. Quien conozca la ruta puede ver el avatar aunque el perfil no sea público; se acepta porque la ruta no se expone fuera del perfil público.

## Correos en español y enlaces con `token_hash`

Las plantillas están en `supabase/templates/confirmation.html` y `supabase/templates/recovery.html` (se cargan en local con `[auth.email.template.*]` de `config.toml`). En producción hay que cargar las mismas plantillas y asuntos con las variables de GoTrue:

| Variable | Valor |
|---|---|
| `GOTRUE_MAILER_TEMPLATES_CONFIRMATION` | URL o ruta de `confirmation.html` (servida por el propio servidor) |
| `GOTRUE_MAILER_TEMPLATES_RECOVERY` | URL o ruta de `recovery.html` |
| `GOTRUE_MAILER_SUBJECTS_CONFIRMATION` | `Confirma tu cuenta en Matchwork` |
| `GOTRUE_MAILER_SUBJECTS_RECOVERY` | `Crea una contraseña nueva en Matchwork` |
| `GOTRUE_SMTP_MAX_FREQUENCY` | `1m0s` (la web usa un cooldown de 60 s) |
| `GOTRUE_RATE_LIMIT_EMAIL_SENT` | por ejemplo `30` por hora |

Los enlaces del correo son `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup|recovery` y la web los canjea con `verifyOtp`. Así funcionan abriendo el correo en otro navegador o dispositivo (no dependen de un `code_verifier` guardado en el navegador de origen) y los escáneres de enlaces de los proveedores de correo no gastan el token. `redirect_to` siempre incluye una consulta (`?flow=signup` o `?flow=recovery`), por lo que la lista de redirecciones permitidas debe admitir comodín: `https://<dominio>/auth/callback/**`.

GoTrue envía solo la parte HTML de la plantilla (no admite una versión de texto plano aparte). El enlace va también escrito en texto debajo del botón.

## Limpieza de cuentas sin confirmar

Ver `docs/ops/limpieza-cuentas-sin-confirmar.md`.

## Acceso con Google (apagado por defecto)

El botón «Continuar con Google» solo aparece con `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` en el build de la web. El flujo está implementado (`signInWithOAuth`, vuelta a `/auth/callback/?flow=oauth` y continuación en `next`), pero **no se ha probado contra Google real**. Para activarlo falta:

1. En Google Cloud Console: crear un cliente OAuth «Aplicación web», con el origen de la web y como URI de redirección autorizada `https://<dominio-de-la-api>/auth/v1/callback`. Pantalla de consentimiento publicada con el dominio y el correo de soporte.
2. En GoTrue: `GOTRUE_EXTERNAL_GOOGLE_ENABLED=true`, `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`, `GOTRUE_EXTERNAL_GOOGLE_SECRET` y `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` (la misma URI del punto 1). La lista de redirecciones debe admitir `https://<dominio>/auth/callback/**`.
3. Decisión de producto pendiente: una cuenta nueva creada con Google no elige su tipo y el disparador de la base le asigna `freelancer`. Antes de activarlo hay que añadir una pantalla de primer ingreso que pregunte «Empresa o freelancer» (o limitar Google a cuentas existentes).
4. Probar: primer ingreso, reingreso, cuenta existente con el mismo correo (enlace de identidades) y cuenta suspendida.
