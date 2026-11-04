# Especificación: ciclo de correo (confirmación y recuperación)

Texto de la especificación entregada por coordinación, guardado tal cual. Sirve de referencia para la implementación y las pruebas.

## 0) Primero comprueba cómo funciona el enlace

Es muy común registrarse en el ordenador y abrir el correo en el móvil. Si hoy el callback depende de un `code_verifier` guardado en el navegador de origen (PKCE), fallará en otro dispositivo. Haz que confirmación y recuperación funcionen abriendo el enlace en OTRO navegador o dispositivo: plantillas de correo propias con enlace `{{ .SiteURL }}/<ruta del callback>?token_hash={{ .TokenHash }}&type=email` (o `recovery`; usa el `type` que corresponda a tu versión de GoTrue) y `verifyOtp` en el cliente, o flujo implícito si ya lo es. Con `token_hash` además los escáneres de enlaces de los proveedores de correo no gastan el token. Pruébalo con dos contextos de navegador distintos.

## 1) Componente compartido `ResendEmail` y `useCooldown`

- Cooldown de 60 s guardado en `sessionStorage` con la hora de fin (sobrevive a recargas; claves separadas para confirmación y recuperación). Lógica pura con tests (segundos restantes y formato m:ss).
- Botón secundario, ancho completo en móvil, al menos 44 px. Con cuenta atrás: «Reenviar en 0:45» deshabilitado (`tabular-nums`). Cumplido el tiempo: «Reenviar correo». Al enviar: estado cargando, luego «Te enviamos otro correo.» y nuevo cooldown.
- Confirmación: `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo, captchaToken } })`. Recuperación: `resetPasswordForEmail` con captcha. Si Turnstile está activo, el botón espera el token y lo reinicia tras cada envío (es de un solo uso).
- Errores por código, sin revelar si la cuenta existe: `over_email_send_rate_limit` o 429 → «Hiciste muchos intentos. Espera unos minutos e inténtalo de nuevo.»; `captcha_failed` → «No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.»; red u otros → «No pudimos enviar el correo. Inténtalo de nuevo.» Mapa de errores puro, con tests.
- Accesibilidad: el estado va en un `aria-live` polite; la cuenta atrás NO se anuncia cada segundo (solo al empezar y al terminar).

## 2) Pantalla «Revisa tu correo» (reemplaza la línea verde que hoy sale tras registrarse)

- Tras `signUp` con confirmación activa (session null) navega a una pantalla propia. El correo se guarda en `sessionStorage`, NO en la URL (para no filtrarlo en logs). Si se recarga sin correo guardado, muestra un campo para escribirlo y poder reenviar.
- Contenido: icono sobre (Mail) en un círculo de 72 px con fondo primario suave; título «Revisa tu correo»; texto «Te enviamos un enlace de confirmación a **{correo}**. Ábrelo para activar tu cuenta.» (el correo en `font-medium` con `break-all`, sin desbordar con correos largos); ayuda «Puede tardar un par de minutos. Mira también en spam o correo no deseado.»; `ResendEmail`; enlaces «Usar otro correo» (vuelve al registro con el campo vacío y enfocado) y «¿Ya confirmaste? Inicia sesión».
- Para no revelar cuentas existentes, la pantalla es idéntica aunque el correo ya esté registrado; añade «¿Ya tenías cuenta con este correo? Inicia sesión.»
- Si en otra pestaña del mismo navegador se confirma (`onAuthStateChange` SIGNED_IN), esta pestaña avanza sola al siguiente paso.
- Animación: entrada con fundido y subida de 8 px (200 a 300 ms) y un pequeño resorte en el icono; con `prefers-reduced-motion` solo opacidad.

## 3) Callback de confirmación

- Verificando: esqueleto o spinner con «Confirmando tu cuenta…».
- Éxito: check que se dibuja (400 ms), «¡Cuenta confirmada!», «Ya puedes completar tu perfil.», botón «Continuar» y redirección automática a los 2 s al siguiente paso (wizard o /app según el rol).
- Enlace vencido o ya usado (`otp_expired` o enlace inválido): título «Este enlace ya no es válido»; texto «Los enlaces caducan y solo se pueden usar una vez. Si pediste un correo nuevo, usa el más reciente. Si ya confirmaste tu cuenta, inicia sesión.»; campo de correo (precargado desde `sessionStorage` si existe); botón «Enviar nuevo enlace» (`ResendEmail`) y botón secundario «Iniciar sesión».
- Otros errores (red): «No pudimos confirmar tu cuenta. Revisa tu conexión e inténtalo de nuevo.» con «Reintentar».
- Si venía de recuperación y el enlace falló: «Este enlace de recuperación ya no es válido» con botón «Pedir otro enlace» hacia recuperación con el correo precargado.

## 4) Inicio de sesión sin confirmar (`email_not_confirmed`)

- Alerta en línea sobre el formulario (`role=alert`, tono de aviso, no rojo de error): «Aún no confirmaste tu correo. Abre el enlace que te enviamos o pide uno nuevo.», con `ResendEmail` usando el correo ya escrito. No navega. El resto de errores de credenciales siguen siendo genéricos.

## 5) Recuperación

- Tras enviar, mensaje neutro siempre: «Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva.» + `ResendEmail` (cooldown 60 s) + «Volver a iniciar sesión». Misma estética que «Revisa tu correo».

## 6) Correos en español (hoy salen las plantillas de GoTrue en inglés)

- Confirmación y recuperación, y las demás que estén activas, en `supabase/templates/*.html` con `content_path` en `config.toml`. Diseño simple y responsive (ancho máximo 560 px, tablas y estilos en línea), nombre MatchWork, un único botón grande con el color de marca, el enlace en texto debajo por si el botón falla, «Si no fuiste tú, ignora este correo», sin imágenes remotas ni seguimiento y con versión de texto plano. Asuntos: «Confirma tu cuenta en MatchWork» y «Crea una contraseña nueva en MatchWork». Revísalos en Mailpit (HTML y texto) y documenta en `docs/security/auth-produccion.md` que en producción hay que cargar las mismas plantillas (`GOTRUE_MAILER_TEMPLATES_*`).

## 7) Pruebas (e2e con Mailpit, a 390 px)

Registro con confirmación; correo recibido en español; el enlace abre y confirma, también en otro contexto de navegador; reenvío (llega un segundo correo, el enlace del primero queda inválido y esa pantalla ofrece reenviar); cooldown visible y persistente tras recargar; límite de envíos con mensaje amable; login sin confirmar con alerta y reenvío; recuperación completa; y registrar un correo que ya existe muestra la misma pantalla. axe sin violaciones serias, foco al título en cada pantalla nueva, objetivos de al menos 44 px, sin desborde a 360 px, texto al 200 %, consola limpia.

## 8) Criterios

Ninguna pantalla revela si un correo existe; ningún correo en la URL; textos exactos como arriba (si se cambia algo, avisar); todo con los tokens del sistema de diseño; lint, typecheck, vitest, pgTAP (con reset) y e2e en verde. Anotar en el manual de operación (`docs/ops`) la limpieza periódica de cuentas sin confirmar (proponer el SQL sobre `auth.users`, por ejemplo más de 7 días sin confirmar).

Informe breve al terminar, con lo que no se pudo verificar.
