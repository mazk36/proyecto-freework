# Pruebas de extremo a extremo (recorrido completo + accesibilidad)

`journey.mjs` recorre la **app real** (el export estático servido por HTTP) contra un **Supabase local real**, con varios
navegadores a la vez (empresa y freelancer, este último en móvil 390×844 con táctil real por CDP). Cubre el camino
feliz de punta a punta y, al final, una pasada de accesibilidad y responsive (`sweep.mjs`, con axe-core) sobre todas las
pantallas reales y sus estados (vacío, error, éxito, diálogos). No está en CI todavía.

## Qué prueba
1. Empresa: registro → perfil → solicitud de verificación → el admin la verifica desde el panel (alta con `supabase/scripts/grant-admin.sh`).
2. Empresa verificada publica 3 problemas en PEN; una empresa de EE. UU. publica uno en USD.
3. Freelancer: registro y perfil público.
4. Feed: swipe táctil a la derecha e izquierda, botón, teclado (escritorio) y «Deshacer».
5. Hoja de propuesta: errores en línea, límite de caracteres y propuesta enviada.
6. Bandeja de la empresa: ve dos propuestas (PEN y USD), compara y marca «Me interesa» hasta el Match.
7. Chat en tiempo real, aviso suave de contacto (descartable; email, teléfono y enlaces pasan sin tocar) y no leídos.
8. La franja «En vivo» de la landing coincide con los contadores de la base.
9. Cuota anti-spam: baja una política con `UPDATE` y comprueba el mensaje con el tiempo de espera.
10. Cerrar sesión, volver a entrar y recargar (F5) en cada ruta profunda; sin sesión redirige; cuenta suspendida con aviso y sin poder escribir.
- Accesibilidad (`sweep.mjs` + `a11y-lib.mjs`): axe-core (sin violaciones serias/críticas), scroll horizontal y objetivos
  táctiles de 44 px en 360/390/768/1280/1536, texto al 200 %, foco atrapado/Escape/retorno del foco en los diálogos y
  `prefers-reduced-motion`. Las violaciones moderadas/menores se imprimen como notas.

## Cómo correrla
```bash
# 1) Supabase local de MatchWork en puertos alternativos (55421-55429; no toca otro Supabase en 54321)
supabase/scripts/local-stack.sh start      # Realtime necesita ~30 s tras arrancar
supabase/scripts/local-stack.sh reset      # opcional: base limpia (los contadores serán exactos)

# 2) Export estático apuntando a ese Supabase, servido con compresión
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key que imprime `local-stack.sh start`> \
NEXT_PUBLIC_SITE_URL=http://localhost:4173 pnpm build
(cd apps/web && npx serve@14 out -l 4173 --no-clipboard) &

# 3) Recorrido (usa el Chrome del sistema; E2E_CHROMIUM_PATH para otro binario)
cd apps/web
E2E_PSQL=/opt/homebrew/opt/libpq/bin/psql node e2e/journey.mjs
```
Variables: `E2E_BASE_URL` (def. `http://localhost:4173`), `E2E_SUPABASE_URL` (`http://127.0.0.1:55421`),
`E2E_SUPABASE_KEY`, `E2E_DB_URL` (`postgresql://postgres:postgres@127.0.0.1:55422/postgres`), `E2E_PSQL` (ruta de `psql`),
`E2E_SKIP_A11Y=1` para saltar la pasada de accesibilidad. Sale con código distinto de 0 si falla alguna comprobación.

Cada ejecución crea usuarios nuevos (correo con marca de tiempo) y deja sus datos en la base; usa `local-stack.sh reset`
para empezar limpio. Reconstruye el export antes de correr si cambiaste código de la app.

## Después del e2e

El guion deja usuarios y datos de prueba en la base local. Antes de correr pgTAP (`local-stack.sh test`) haz `local-stack.sh reset`; sin reset fallan 2 pruebas que cuentan filas globales (contadores públicos).

## Sonda de seguridad

`E2E_PSQL=<ruta a psql> node e2e/security.mjs` crea cuatro usuarios (dos empresas, un freelancer con Match y un tercero ajeno) y ataca la API real: RPC como anon, escrituras directas por PostgREST, lectura y escritura cruzadas en chat, eventos Realtime de un tercero, topes del perfil, privacidad por rol y cuenta suspendida con sesión abierta. Espera ~30 s tras un `reset` para que Realtime esté listo (si no, S3.6 falla por tiempo).

Con `E2E_IGNORE_HTTPS=1 E2E_BASE_URL=https://localhost:8443` el guion corre contra la imagen de Caddy (`infra/vps`) y comprueba que la CSP no rompe la app (consola sin avisos).

## Captcha (Turnstile)

Apagado salvo que exista `NEXT_PUBLIC_TURNSTILE_SITE_KEY` en el build. Para probarlo: en `supabase/config.toml` pon `[auth.captcha] enabled = true`, exporta `TURNSTILE_SECRET=1x0000000000000000000000000000000AA`, reinicia el stack (`local-stack.sh stop && start`), compila la web con `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` y corre `node e2e/captcha.mjs`. Deja `enabled = false` para el resto del e2e (el journey no resuelve desafíos).

## Rendimiento (CPU x4, red 4G lenta)

`E2E_PSQL=<psql> node e2e/perf.mjs` crea una empresa, un freelancer, 14 problemas abiertos y un Match con 300 mensajes, limita CPU x4 y Slow 4G (150 ms, 1,6 Mbps) y mide: carga del mazo, fotogramas durante un arrastre táctil real, tareas largas, CLS, carga del chat con 300 mensajes, desplazamiento y tiempo por pulsación. Resultado actual: mazo 60 fps (p95 16,7 ms), carga 1,9–2,8 s, CLS 0,037; chat con 300 mensajes en ~2 s, pulsación p95 17 ms.

## Demo (video y hojas de contactos)

`DEMO_OUT=~/Downloads/Matchwork-demo E2E_PSQL=<psql> node e2e/demo.mjs` genera un video de ~1 min del recorrido a 390x844 y dos hojas de contactos (390 y 1280 px) con datos de ejemplo inventados. Pensado para una base recién reseteada (`MATCHWORK_STACK_FULL=1 local-stack.sh reset` y esperar 30 s); los cuadros se capturan con CDP screencast y se unen con el `ffmpeg` del sistema (no necesita el de Playwright).

## Interfaz y accesibilidad en toda la app (`ui-matrix.mjs`, `a11y.mjs`, `lighthouse.mjs`)

Criterios, umbrales y completitud: `docs/frontend/criterios-ui.md`. El inventario de rutas vive en `e2e/routes.json` y `lib/routes-inventory.test.ts` falla si aparece una página fuera de él.

- `node e2e/ui-matrix.mjs`: cada ruta × persona en 360×740, 390×844, 768×1024, 1280×800 y 1536×864 (scroll horizontal, objetivos ≥ 44 px, campos ≥ 16 px, CLS < 0,1, consola y red limpias) y los estados cargando, vacío y error a 390 y 1280. Capturas en `~/Downloads/Matchwork-demo/calidad/` (`CAPTURAS_DIR` para otra carpeta).
- `node e2e/a11y.mjs`: axe-core, semántica (lang es-PE, un h1, landmarks, títulos), solo teclado, errores de formulario, movimiento reducido, reflow a 320 px y texto al 200 %.
- `LIGHTHOUSE_DIR=<carpeta con lighthouse@12> node e2e/lighthouse.mjs`: Lighthouse móvil sobre landing, registro, inicio de sesión y una pantalla autenticada, contra la pila de producción local.
- `e2e/run-all.sh`: corre toda la batería en orden y resume (salta `captcha.mjs`, que necesita configuración especial).

`UI_ONLY="<regex de ruta>"` limita la corrida a unas rutas; `UI_DATA_FRESH=1` recrea las personas de prueba (se guardan en `$TMPDIR/matchwork-ui-data`; `UI_DATA_DIR` para otra carpeta, p. ej. al cambiar de pila).

## Contra la pila de producción local (`infra/vps/prod`)

Con la pila levantada (`infra/vps/prod/scripts/deploy.sh`), estas variables hacen que todos los guiones (journey, correo, cuenta, seguridad, almacenamiento, tiempo real, motores, paginación y rendimiento) corran contra ella con las claves nuevas y la confirmación de correo activa:

```bash
cd infra/vps/prod && set -a && . ./.env && set +a
export E2E_BASE_URL="$SITE_URL" E2E_SUPABASE_URL="$API_URL" E2E_SUPABASE_KEY="$ANON_KEY"
export E2E_MAIL_URL="http://127.0.0.1:$MAILPIT_UI_PORT" E2E_DB_CONTAINER=matchwork-prod-db-1
export NODE_TLS_REJECT_UNAUTHORIZED=0 E2E_IGNORE_HTTPS=1   # certificado interno de Caddy
```

`E2E_DB_CONTAINER` hace que `sql()` entre por `docker exec` (la base de producción no publica puerto). Ver `docs/ops/despliegue-vps.md`.
