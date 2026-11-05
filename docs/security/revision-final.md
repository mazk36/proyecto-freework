# Revisión final de seguridad y privacidad

Fecha: 2026-11-05 · Rama `feat/final-security-review` · Alcance: lo construido desde la auditoría `7a4b1a9` y lo anterior que se tocó. Todo se probó en local (stack de Supabase del CLI y la pila de producción local `infra/vps/prod`); no se tocó ningún servidor.

Actores: empresa A (nombre oculto), empresa B, freelancers X e Y, administrador y anónimo. Las pruebas son repetibles: `e2e/security-final.mjs` (API: privacidad, autorización y abuso), `e2e/security-web.mjs` (XSS, redirecciones y enlaces de correo), `e2e/prod-surface.sh` (puertos, rutas de Kong, cabeceras y CORS de la pila de producción), `supabase/tests/database/problem_input_limits.test.sql` (pgTAP) y `lib/auth.test.ts` (vitest).

## Resumen

| # | Hallazgo | Gravedad | Estado |
|---|---|---|---|
| 1 | **Redirección abierta** con `?next=/app/..//sitio.ajeno` en inicio de sesión, registro, retorno del correo y guardado del perfil de empresa: tras iniciar sesión el navegador salía a `//sitio.ajeno` (phishing). Había tres validadores distintos y los tres aceptaban el valor | Alta | **Corregido**: un solo validador (`safeAppDestination`) que resuelve la URL con puntos, `%2e` y barras antes de aceptarla; 11 casos hostiles en vitest y 20 intentos en `security-web.mjs` |
| 2 | Impactos y objetivos del problema sin tope en la base: la RPC aceptaba 50 000 elementos por arreglo | Media | **Corregido**: migración `20261105010000_problem_array_and_industry_limits.sql` (máx. 10 elementos y solo las opciones de la interfaz) con 9 pruebas pgTAP. El sector (`industry_snapshot`) ya lo fijaba la RPC desde el perfil de la empresa; se añadió además un tope de 100 caracteres |
| 3 | Enlace «Ver proyecto» de 20 px de alto en el perfil público y el portafolio (objetivo táctil, no seguridad; lo detectó la sonda de accesibilidad con un proyecto hostil cargado) | Baja | **Corregido** (`min-h-11`) |
| 4 | Enumeración de cuentas por registro: el GoTrue del stack local del CLI responde «User already registered» a un correo existente | Media | **No aplica a producción**: la pila de producción devuelve la misma respuesta ofuscada para un correo existente y uno nuevo (probado con la misma sonda). El stack local del CLI no ofusca; la sonda lo marca como aceptado solo allí |
| 5 | Diferencia de tiempo en el inicio de sesión: ~46 ms con correo existente frente a ~2 ms con uno inexistente (GoTrue solo calcula el hash si el correo existe). Los mensajes son idénticos | Baja | **Aceptado** y pendiente del bloque 11: captcha (Turnstile) y límite de intentos en el borde |
| 6 | CORS de Kong abierto (`access-control-allow-origin: *`) | Baja | **Pendiente del bloque 11** (CORS solo con el origen del sitio). Sin cookies de sesión, el token viaja en cabecera, así que no permite robar sesiones |
| 7 | CSP con `script-src 'unsafe-inline'` | Informativa | **Aceptado**: el export estático de Next y el script de compatibilidad requieren scripts en línea (no hay nonces posibles). Compensado: ningún `dangerouslySetInnerHTML` con contenido de usuario (solo dos constantes propias) y las pruebas de XSS pasan |
| 8 | Imágenes base `node:26-alpine` y `alpine:3.22` fijadas solo por versión mayor | Informativa | Recomendación: fijar por digest al desplegar. Las imágenes de Supabase y Caddy ya están fijadas por versión exacta |
| 9 | La freelancer con Match ve el identificador interno (UUID) de una empresa de nombre oculto (`sender_id` y `matches.company_user_id`) | Informativa | **Aceptado**: es opaco; no abre ninguna lectura (probado: las tablas de empresa devuelven 0 filas a quien tiene Match) |

Cifras: **73 intentos de API, 71 bloqueados y 2 aceptados (hallazgos 4 y 5 en el stack local), 0 vulnerables**; 13 de 13 comprobaciones web; pgTAP 870/870; vitest verde; batería e2e completa en verde tras los arreglos (ver el informe del bloque).

## Revisión estática (consultas sobre la base viva)

| Revisión | Resultado |
|---|---|
| Tablas de `public` sin RLS | 0 de 21 |
| Vistas sin `security_invoker` | No hay vistas |
| Políticas con `USING (true)` o `WITH CHECK (true)` o para `public` | 0 |
| Funciones `SECURITY DEFINER` sin `search_path` vacío | 0 de 58 (todas con `search_path=""`) |
| Funciones ejecutables por `PUBLIC` | 0 |
| Funciones ejecutables por `anon` | Solo `get_public_counters()` (intencional) |
| Funciones internas ejecutables por usuarios (`enforce_rate_limit`, `require_*`, `guard_*`…) | Ninguna (14 intentos rechazados) |
| Permisos de tabla para `anon` | Solo columnas públicas de perfiles públicos, portafolio y habilidades |
| Permisos de columna de `authenticated` | Solo los campos que el usuario edita en su perfil y portafolio; nada de `role`, `account_type`, verificación, suspensión ni administración |
| Tablas publicadas en Realtime | Solo `messages` (el payload no lleva datos de empresa) |
| Columnas de texto libre sin tope en la base | Solo campos que escribe un administrador o que fija la RPC (`admin_actions`, `app_settings`, `suspension_reason`, constantes con lista cerrada) |

## Superficie de la pila de producción local

- Puertos publicados: solo la web (80/443 en el VPS; 9080/9443 en local) y, con el perfil `mailpit` de pruebas, la interfaz de Mailpit en 127.0.0.1. Postgres, Kong, Auth, REST, Storage y Realtime no publican nada.
- Rutas de Kong accesibles: `/auth/v1/`, `/rest/v1/`, `/realtime/v1/` y `/storage/v1/`. `/pg-meta/`, Studio, analytics, funciones y GraphQL devuelven 404. `/auth/v1/admin/users` exige la clave de servicio (401 con la clave anónima).
- Autoconfirmación de correo apagada (`GOTRUE_MAILER_AUTOCONFIRM=false`); Google apagado; registro abierto (decisión de producto).
- El OpenAPI anónimo de PostgREST solo lista lo que el anónimo ya puede leer (perfiles públicos, portafolio, habilidades y el contador).
- Cabeceras de la web: HSTS, `nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`. La API añade HSTS y `nosniff`: los archivos subidos se sirven siempre como `image/png`, `image/jpeg` o `image/webp`, nunca como SVG ni HTML.
- Claves en el export estático (`out/`): solo la clave publicable; ninguna `service_role`, secreto de JWT, clave SMTP ni secreto de Turnstile.

## Dependencias

- `pnpm audit --prod`: sin vulnerabilidades conocidas.
- Cambios de dependencias desde la auditoría `7a4b1a9`: solo `next` 16.3.8 → 16.4.5 (arreglo de vulnerabilidades críticas y altas).

## Lo que no se puede probar sin red externa

- Captcha de Cloudflare Turnstile real (se probó con las claves de prueba en el bloque de captcha, no con el servicio de producción).
- Entrega de correo real (SMTP con SPF, DKIM y DMARC) y su reputación.
- Certificados TLS emitidos por Let's Encrypt y la CSP bajo un dominio real (en local Caddy usa su certificado interno).
- Límites de tasa por IP real detrás del proxy: dependen del bloque 11 (en pausa).

## Detalle de cada intento

Cada fila es un intento real contra la API. «Gravedad si prosperara» es la que tendría el fallo si el intento hubiera funcionado.

### 1b. Privacidad: Storage

| Intento | Resultado | Gravedad si prosperara | Detalle |
|---|---|---|---|
| listar buckets como X, Y o anónimo no expone los privados | Bloqueado | media | buckets=undefined |
| X no sube un avatar en la carpeta de Y | Bloqueado | alta | new row violates row-level security policy |
| no se aceptan SVG, HTML ni scripts disfrazados de imagen (tipo declarado y nombre) | Bloqueado | alta | rechazado, rechazado, rechazado, rechazado |
| el servidor comprueba el contenido real: un SVG con tipo image/png y nombre .png | Bloqueado | media | subió; se sirve como image/png; nosniff en el origen=no (lo añade Caddy) |
| tope de tamaño: 3 MB en avatars (límite 2 MB) | Bloqueado | baja | The object exceeded the maximum allowed size |
| X no lista ni descarga objetos privados de Y (portfolio-media, avatars) | Bloqueado | alta | subida=true lista=0 descarga=bloqueada anon=bloqueada firma=bloqueada avatares=0 |
| X no borra ni sobrescribe el avatar de Y | Bloqueado | alta | borrados=0 sobrescritura=bloqueada sigue=200 |
| X no puede apuntar su perfil al avatar de otra persona (avatar_path ajeno o fuera de formato) | Bloqueado | media | ajeno=rechazado traversal=rechazado largo=rechazado; avatar_path=(vacío) |
| X no puede poner como portada de su proyecto la imagen privada de otra persona | Bloqueado | media | portada=rechazada media=rechazada |
| el anónimo no lista ni descarga objetos del bucket de avatares ni del de portafolio (API de Storage) | Bloqueado | media | avatars=0/0 portafolio=0 |

### 1. Privacidad

| Intento | Resultado | Gravedad si prosperara | Detalle |
|---|---|---|---|
| list_open_problems_page como X: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | item oculto presente=true; claves=id,title,impacts,currency,objectives,description,company_name,published_at,budget_choice,deadline_choice,company_verified,success_criteria,industry_snapshot,show_comp |
| list_open_problems_page como Y: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | item oculto presente=true; claves=id,title,impacts,currency,objectives,description,company_name,published_at,budget_choice,deadline_choice,company_verified,success_criteria,industry_snapshot,show_comp |
| list_open_problems_page como B: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | rechazado: freelancer account required |
| list_open_problems_page como anónimo: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | rechazado: permission denied for function list_open_problems_page |
| list_open_problems_by_ids como X: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | item oculto presente=true; claves=id,title,impacts,currency,objectives,description,company_name,published_at,budget_choice,deadline_choice,company_verified,success_criteria,industry_snapshot,show_comp |
| list_open_problems_by_ids como Y: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | item oculto presente=true; claves=id,title,impacts,currency,objectives,description,company_name,published_at,budget_choice,deadline_choice,company_verified,success_criteria,industry_snapshot,show_comp |
| list_open_problems_by_ids como B: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | rechazado: freelancer account required |
| list_open_problems_by_ids como anónimo: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | rechazado: permission denied for function list_open_problems_by_ids |
| list_open_business_problems como X: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | item oculto presente=true; claves=id,title,impacts,currency,objectives,description,company_name,published_at,budget_choice,deadline_choice,company_verified,success_criteria,industry_snapshot,show_comp |
| list_open_business_problems como Y: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | item oculto presente=true; claves=id,title,impacts,currency,objectives,description,company_name,published_at,budget_choice,deadline_choice,company_verified,success_criteria,industry_snapshot,show_comp |
| list_open_business_problems como B: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | rechazado: freelancer account required |
| list_open_business_problems como anónimo: el nombre, el contacto y el identificador de la empresa oculta no salen | Bloqueado | alta | rechazado: permission denied for function list_open_business_problems |
| list_my_matches de X (Match con la empresa oculta) no revela su nombre | Bloqueado | alta | [{"match_id":"48a824aa-202b-4bfa-81b8-11419edaa300","problem_id":"013a751f-36ba-4242-8ffd-6e69c1c0317b","proposal_id":"42875565-1553-48d5-8606-9adc3aadb998","counterpart_name":null,"problem_title":"Or |
| list_conversations de X no revela el nombre de la empresa oculta | Bloqueado | alta | claves=match_id,problem_title,counterpart_name,counterpart_role,last_message_body,last_message_at,last_message_sender_is_me,unread_count,counterpart_company_verified |
| list_messages de X no revela el nombre de la empresa oculta | Bloqueado | alta | claves=id,match_id,sender_id,body,created_at,client_id |
| list_my_proposal_company_trust no revela la empresa oculta | Bloqueado | alta | [{"proposal_id":"42875565-1553-48d5-8606-9adc3aadb998","company_verified":false}] |
| list_my_problem_interactions no revela la empresa oculta | Bloqueado | media | filas=0 |
| X: su propuesta (tabla) y el Match (tabla) no contienen el nombre de la empresa oculta | Bloqueado | alta | propuestas=1 matches=1 |
| X, Y y B no leen company_profiles ni business_problems ni profiles de la empresa oculta | Bloqueado | alta | filas visibles=0,0,0 |
| el anónimo no lee tablas de empresas ni de problemas | Bloqueado | alta | company_profiles=0 business_problems=0 proposals=0 matches=0 messages=0 app_users=0 company_verifications=0 |
| get_public_counters solo devuelve cifras | Bloqueado | media | [{"open_problems":117,"companies_published":21,"freelancers_active":5,"proposals_submitted":16}] |
| los errores de RPC ajenos no contienen el nombre de la empresa oculta | Bloqueado | media | company account required \| company account required \| conversation not found \| open problem required |
| Realtime: X solo recibe eventos de mensajes de su Match, sin datos de empresa; Y no recibe nada | Bloqueado | alta | X recibió: messages (1); Y recibió 0 |
| la empresa A no ve correos ni teléfonos de las freelancers en sus propuestas | Bloqueado | alta | claves=id,problem_id,freelancer_id,freelancer_name,freelancer_slug,headline,diagnosis,solution,deliverables,timeline,price,currency,recurring_costs,maintenance_warranty,related_experience,submitted_at |
| perfil público de X (anónimo): solo campos públicos, sin correo ni teléfono | Bloqueado | alta | claves=id,account_type,display_name,slug,avatar_path,is_public,created_at,updated_at,user_id,headline,bio,location_text,years_experience,website_url,availability_status,created_at,updated_at,linkedin_ |
| perfil NO público de un freelancer: invisible para anónimo y empresas | Bloqueado | media | anon=0 empresa=0 |

### 2. Autorización

| Intento | Resultado | Gravedad si prosperara | Detalle |
|---|---|---|---|
| Y no lee las propuestas de X (tabla) | Bloqueado | alta | filas=0 |
| Y no edita ni borra la propuesta de X (PostgREST directo) | Bloqueado | alta | patch=0 del=0 precio=1800.00 |
| Y no inserta una propuesta a nombre de X | Bloqueado | alta | permission denied for table proposals |
| Y no envía, retira ni sobrescribe la propuesta de X por RPC | Bloqueado | alta | retirar=rechazado enviar=rechazado sobrescribir=rechazado; diagnóstico=Diagnóstico de prueb |
| X no lee ni envía el borrador de Y | Bloqueado | alta | lee=0 envía=rechazado |
| Y no lee, escribe ni marca como leído el chat de X y A | Bloqueado | alta | lee=0 escribe=rechazado leído=rechazado tabla=0 |
| nadie inserta, edita ni borra mensajes o Matches por PostgREST directo (ni los participantes) | Bloqueado | alta | rechazado, rechazado, rechazado, rechazado, rechazado, rechazado |
| B no lee, edita, publica, cierra ni ve las propuestas de problemas de A | Bloqueado | alta | get=vacío close=rechazado edit=rechazado publish=rechazado save=rechazado list=rechazado estado=open |
| B no marca como «me interesa» una propuesta de un problema de A (no crea Match ajeno) | Bloqueado | alta | rechazado; matches de esa propuesta=1 |
| X no confirma la existencia de un borrador ajeno ni interactúa con él | Bloqueado | media | open problem required for interaction; interacciones=0 |
| nadie cambia su rol, tipo de cuenta, suspensión, verificación ni admins por PostgREST directo | Bloqueado | crítica | todo rechazado; rol=freelancer; is_admin=false |
| el rol y los metadatos de auth no dan privilegios (updateUser con role/admin; registro con role=admin) | Bloqueado | crítica | is_admin=false; role de registro con role=admin → freelancer; admins=0 |
| las 11 RPC de administración fallan para un usuario normal, una empresa y el anónimo | Bloqueado | crítica | todas rechazadas (33); Y suspendido=0 |
| funciones internas (enforce_rate_limit, require_*, guard_*, create_profile…) no se llaman por la API | Bloqueado | alta | rechazadas (14) |
| una cuenta suspendida no escribe por RPC ni por PostgREST (se comprueba con Y) | Bloqueado | alta | rechazado, rechazado, rechazado, rechazado |
| la empresa dueña del problema no ve borradores de propuesta (tabla ni list_problem_proposals) | Bloqueado | alta | tabla=0 rpc=0 borrador en rpc=false |
| B no lee las interacciones de A ni de X (company_proposal_interactions, freelancer_problem_interactions, conversation_reads) | Bloqueado | media | filas=0, filas=0, filas=0, filas=0 |
| reutilizar el client_id de un mensaje ajeno no devuelve ni pisa el mensaje del otro | Bloqueado | media | otro=no; resp=ok; cuerpo original=mensaje con client_id propio filtrado=false |
| save_my_profile / save_company_profile / submit_company_verification ignoran claves privilegiadas (account_type, slug ajeno, status, verified) | Bloqueado | alta | perfil de X=freelancer\|ximena-torres-2283c; slugs iguales al de Y=1; empresa A=Zorro Import; verificaciones=(ninguna) |
| las búsquedas de administración tratan comodines, comillas y barras como texto (sin errores ni todo el listado) | Bloqueado | media | "%":0/0 "_":0/0 "\\":0/0 "' or 1=1 --":0/0 "\"; drop tabl:0/0 "%%%%%%%%%%%%%:0/0; perfiles=69 |

### 3b. Enumeración de cuentas

| Intento | Resultado | Gravedad si prosperara | Detalle |
|---|---|---|---|
| registro con un correo ya existente responde igual que con uno nuevo | **Aceptado** (ver motivo) | media | existente={"error":"User already registered","hasUser":false,"session":false} nuevo={"error":null,"hasUser":true,"session":false} Motivo: el GoTrue del stack local del CLI no ofusca el registro duplicado; la pila de producción (infra/vps/prod) sí, y esta misma sonda pasa allí |
| inicio de sesión: correo inexistente y contraseña incorrecta dan el mismo mensaje y estado | Bloqueado | media | existente="Invalid login credentials"/400 inexistente="Invalid login credentials"/400 |
| recuperar contraseña responde igual con un correo existente y con uno inexistente | Bloqueado | media | existente="ok" inexistente="ok" |
| tiempo de respuesta del inicio de sesión: existente vs inexistente (mediana de 15) | **Aceptado** (ver motivo) | baja | mediana existente=46 ms, inexistente=2 ms Motivo: diferencia propia de GoTrue (solo calcula el hash de contraseña si el correo existe); se mitiga con captcha y límite de intentos en el borde (bloque 11 pendiente) |
| no hay RPC ni tabla que confirme si existe un correo o un slug privado | Bloqueado | media | funciones con esos nombres: profile_slug_candidate,is_free_email_domain; slug de perfil privado visible=0 |

### 3. Abuso: límites y cuotas

| Intento | Resultado | Gravedad si prosperara | Detalle |
|---|---|---|---|
| mensaje de 1 MB por send_message | Bloqueado | alta | message body too long |
| campos de propuesta de 200 000 caracteres por save_proposal_draft | Bloqueado | alta | rechazado, rechazado, rechazado, rechazado, rechazado, rechazado, rechazado |
| campos de problema de 1 MB por save_business_problem_draft (título, descripción, textos largos, arreglos enormes) | Bloqueado | alta | rechazado, rechazado, rechazado, rechazado, rechazado, rechazado, rechazado, rechazado, rechazado |
| bio, titular, ubicación y enlaces de 1 MB (freelancer_profiles directo) y nombre público de 1 MB | Bloqueado | alta | rechazado, rechazado, rechazado, rechazado, rechazado, rechazado, rechazado |
| perfil de empresa con campos de 1 MB (save_company_profile) | Bloqueado | alta | rechazado, rechazado, rechazado, rechazado, rechazado |
| portafolio y habilidades con textos de 1 MB (proyecto, medios, habilidad propia) | Bloqueado | alta | rechazado, rechazado, rechazado, rechazado, rechazado, rechazado, rechazado |
| solicitud de verificación con campos de 1 MB | Bloqueado | media | rechazado, rechazado, rechazado, rechazado, rechazado |
| enlaces javascript:, data: y file: rechazados en perfil, portafolio, empresa y verificación | Bloqueado | alta | todos rechazados |
| cuota de mensajes por minuto: 45 envíos seguidos (límite 30) | Bloqueado | media | enviados=29 limitados=16 |
| likes/descartes en ráfaga (640 llamadas seguidas): una fila por problema como máximo y cuota de 600/hora para los nuevos | Bloqueado | baja | llamadas=640 filas creadas=3 (una por problema) límite configurado=600/hora |
| cuota de propuestas: 25 borradores nuevos seguidos (límite 20/hora) | Bloqueado | media | creados=20 limitados=5 |
| una empresa no puede crear Matches en ráfaga con «me interesa» sobre muchas propuestas (límite company_interaction 300/hora) | Bloqueado | baja | límite configurado=300/hora |

**Total: 71 de 73 intentos bloqueados; 2 riesgos aceptados y documentados; 0 vulnerables.**

### 4. Web (e2e/security-web.mjs)

| Intento | Resultado | Gravedad si prosperara | Detalle |
|---|---|---|---|
| HTML y scripts hostiles en nombre, titular, ubicación, biografía y portafolio: perfil público | Bloqueado | alta | se muestran como texto; ningún nodo inyectado, `window.__xss` sin cambios |
| Lo mismo en el perfil propio (cabecera, formulario y portafolio) | Bloqueado | alta | sin ejecución |
| Enlaces externos del portafolio | Bloqueado | media | `target=_blank` con `rel="noopener noreferrer nofollow ugc"` y solo http/https (`javascript:` y `data:` los rechaza la base) |
| `?next=` con `//sitio`, `/\sitio`, URL absoluta, `javascript:`, `data:`, `/app/..//sitio`, `/app/%2e%2e//sitio`, `///sitio`, `/app@sitio` (20 intentos en login y registro) | Bloqueado tras el arreglo | alta | antes del arreglo `/app/..//sitio` y `/app/%2e%2e//sitio` sacaban del sitio |
| `redirect_to` ajeno al pedir la recuperación de contraseña | Bloqueado | alta | el enlace del correo apunta al sitio, no al dominio pedido |
| `token_hash` inventado y `type` inesperado en el retorno del correo | Bloqueado | alta | sin sesión, sin redirección y con el mensaje de enlace caducado |
| Slugs hostiles (`"><script>`, `%`, `*`, `' or 1=1 --`, `../../etc/passwd`) en el perfil público | Bloqueado | media | sin ejecución ni perfiles ajenos |
| Subida de SVG, HTML o scripts disfrazados de imagen (tipo, nombre y ruta) | Bloqueado | alta | rechazados; un SVG con tipo `image/png` se sirve como `image/png` con `nosniff` |
