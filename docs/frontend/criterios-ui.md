# Criterios de interfaz (brief §9) y completitud

Qué se comprueba en toda la app, con qué pruebas automáticas, cómo correrlas y qué queda fuera. Las pruebas viven en `apps/web/e2e/` y necesitan el stack local de Supabase y el export estático servido (ver `apps/web/e2e/README.md`).

## 1. Qué se comprueba y con qué

| Criterio | Prueba | Umbral |
|---|---|---|
| Inventario de rutas | `lib/routes-inventory.test.ts` (vitest) lee `app/` y `e2e/routes.json`; falla si aparece una ruta que no está en el inventario o hay una huérfana en el JSON | 0 rutas fuera del inventario |
| Sin scroll horizontal, objetivos táctiles, campos, CLS, consola, red | `e2e/ui-matrix.mjs`: cada ruta × persona (visitante, empresa con/sin datos, freelancer con/sin datos, admin) en 360×740, 390×844, 768×1024, 1280×800 y 1536×864 | scroll horizontal: ninguno; objetivos ≥ 44 px hasta 768 px; campos ≥ 16 px; CLS < 0,1; consola sin errores ni avisos; ningún recurso 4xx/5xx |
| Texto sospechoso | misma matriz | ni `undefined`, `NaN`, `[object`, «Lorem ipsum», `TODO` ni «Próximamente» |
| Estados cargando, vacío, error, éxito | misma matriz a 390 y 1280 px, interceptando las lecturas de `/rest/v1/…`; capturas en `~/Downloads/Matchwork-demo/calidad/` | cargando: esqueleto o `role=status`; vacío: sin texto roto; error: mensaje y botón/enlace de salida |
| Accesibilidad automática | `e2e/a11y.mjs` (axe-core) en 320, 360, 390, 768, 1280 y 1536 px por ruta y persona | 0 violaciones serias o críticas (a 390 y 1280) |
| Semántica | `e2e/a11y.mjs` | `lang="es-PE"`; un `h1`; un `main`; título no vacío y distinto entre rutas (las que redirigen comparten el del destino); «Saltar al contenido» en la app; el título cambia en navegación cliente |
| Solo teclado | `e2e/a11y.mjs`: registro/inicio de sesión, SwipeDeck (← descarta, Z deshace, aria-live), hoja de propuesta (foco atrapado, Esc, retorno del foco), asistente de 5 pasos, chat (Enter envía, Shift+Enter salta línea), administración | orden de foco lógico y sin trampas |
| Errores de formulario | `e2e/a11y.mjs`: registro y asistente | error asociado (`aria-invalid` + `aria-describedby`) y foco en el primer campo con error |
| Movimiento reducido | `e2e/a11y.mjs` con `prefers-reduced-motion` | mazo sin vuelo de tarjeta; contador de la landing sin animar |
| Reflow y zoom | `e2e/a11y.mjs`: 320 px y texto al 200 % | sin scroll horizontal ni texto cortado |
| Dinero | `lib/money.ts` es el único formateador es-PE (`S/ 1,800`, `US$ 3,200`); `lib/money.test.ts` | ninguna pantalla compone importes a mano |
| Rendimiento, accesibilidad, buenas prácticas y SEO | `e2e/lighthouse.mjs` (Lighthouse 12, móvil) servido por el Caddy de producción local | metas: 90 / 100 / 95 / 100 (ver §3) |
| Release | `lib/release-guard.ts`: con `MATCHWORK_RELEASE=1` el build falla si `NEXT_PUBLIC_SITE_URL` falta o apunta a localhost | `canonical`, `og:url` y sitemap nunca salen hacia localhost |

Cómo correrlas (desde `apps/web`, con el stack y el export servido):

```bash
E2E_PSQL=/opt/homebrew/opt/libpq/bin/psql node e2e/ui-matrix.mjs   # matriz de interfaz y estados
E2E_PSQL=/opt/homebrew/opt/libpq/bin/psql node e2e/a11y.mjs        # accesibilidad
pnpm test                                                          # incluye el inventario de rutas
```

`UI_ONLY="<regex de ruta>"` limita la corrida a unas rutas; `UI_DATA_FRESH=1` recrea las personas de prueba.

## 2. Excepciones y decisiones

- **Rutas `/ui-kit/*`**: son vistas previas de diseño. Se excluyen del inventario porque el build de producción las elimina (`scripts/remove-ui-kit-previews.mjs`); además llevan `noindex` y `robots.txt` las bloquea.
- **Estado «error» de las pantallas sin lecturas**: `/app/likes/` para empresa es una pantalla de enlaces sin consultas; el inventario marca `"reads": ["freelancer"]` y la matriz no le exige estado de error.
- **Reintentos de lectura**: supabase-js reintenta las lecturas caídas (~8 s con espera creciente) antes de fallar; el estado de error de perfiles y listados aparece tras ese tiempo y la matriz lo espera hasta 15 s.
- **Redirecciones por rol**: `/app/guardados` y `/app/propuestas` del freelancer terminan en Likes; `/app/explorar` de la empresa termina en Propuestas. Comparten el título de su destino.
- **Firefox**: no se instala en este equipo; WebKit se prueba con `e2e/engines.mjs`.

## 3. Lighthouse móvil

Corrida del 2026-11-04 contra la pila de producción local (`infra/vps/prod`, Caddy con brotli), Lighthouse 12 con la simulación móvil por defecto (CPU ×4, 4G lenta). Las pantallas públicas se miden sin sesión.

| Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Landing `/` | 98 | 100 | 100 | 100 | 2,2 s | 0 |
| `/registro/` | 99 | 100 | 100 | 100 | 2,1 s | 0 |
| `/iniciar-sesion/` | 99 | 100 | 100 | 100 | 1,8 s | 0 |
| `/app/descubrir/` (autenticada) | 86 | 100 | 100 | 58 | 4,2 s | 0 |

Metas: Rendimiento 90, Accesibilidad 100, Buenas prácticas 95, SEO 100. Se cumplen en las tres pantallas públicas. Excepciones de la pantalla autenticada:

- **SEO 58**: la app lleva `noindex` a propósito (`app/app/layout.tsx`) y `robots.txt` la bloquea; las auditorías `is-crawlable` y `canonical` fallan por diseño. No se arregla.
- **Rendimiento 86**: el elemento LCP es el resumen de la primera tarjeta, que espera a la sesión, el estado de la cuenta y la lectura de problemas (retraso de render ~3,6 s bajo CPU ×4; TTFB 0,6 s). Es una cascada de datos, no un recurso pesado; arreglarla exige precargar o rediseñar la carga, que no es un arreglo barato. Queda como pendiente posterior al lanzamiento.

Lo que sí se corrigió con esta corrida: el guion medía las pantallas públicas ya con sesión abierta (redirigían a `/app/` y daban SEO falso de 58); ahora las mide antes de iniciar sesión y avisa si Lighthouse termina en otra ruta.

## 4. Completitud frente al brief (§3–8) y al plan (fases 0–7)

Hecho = implementado y cubierto por alguna prueba. Parcial = existe pero con una parte del brief sin hacer. Falta = no existe.

### Brief

| Sección | Estado | Notas |
|---|---|---|
| §3 SwipeDeck: gesto, umbrales, etiquetas ME INTERESA / NO POR AHORA, vuelo de salida (~280 ms), `touch-action: pan-y`, vibración opcional | Hecho | `components/swipe/swipe-card.tsx`, `swipe-deck.tsx` |
| §3 Botones ≥ 56 px, atajos de teclado (← → Enter P Z), `aria-live`, foco a la tarjeta siguiente | Hecho | cubierto por `e2e/a11y.mjs` |
| §3 Toast con Proponer ahora / Deshacer | Hecho | |
| §3 Estados: cargando, vacío («Ya viste todo por ahora»), error con Reintentar, tutorial de 2 pasos recordado en `localStorage` | Hecho | `deck-tutorial.tsx` |
| §3 Escritorio en dos columnas con el detalle de la tarjeta superior | Hecho | `deck-detail.tsx` |
| §4 ProposalSheet: hoja inferior en móvil y panel lateral en escritorio, campos, validación en línea, autoguardado, «Guardar borrador para después», conservar lo escrito si falla | Hecho | `components/proposals/` |
| §5 Bandeja de empresa: acciones Me interesa / Guardar / Descartar, comparar hasta 3 con barra «Comparar (n/3)», modal de Match con «Abrir chat», sin orden por precio ni «compatibilidad» | Hecho | `components/inbox/` |
| §6 Likes del freelancer (pestañas Me interesan · Propuestas enviadas · Matches), estados vacíos con ícono, frase útil y botón | Hecho | `likes-overview.tsx` |
| §6 Quitar con deshacer | Hecho | en «Me interesan» (toast «Quitado de tus Likes» con Deshacer); «Propuestas enviadas» y «Matches» no tienen acción de quitar |
| §7 Chat: lista/hilo, burbujas y separadores por día, Enter/Shift+Enter, `visualViewport`, envío optimista con reintento, no leídos | Hecho | `components/chat/` |
| §7 Contacto externo | Hecho | decisión de Frank (3-nov): permitir con aviso suave. Aviso «Mantén la conversación en MatchWork» en `lib/chat-notice.ts`, cubierto por el journey |
| §7 Adjuntos | Decidido | el chat es solo de texto en el lanzamiento; fuera del alcance de lanzamiento |
| §8 Landing: franja «En vivo» con cifras reales y «Sé de los primeros» en 0, CTA doble, sitemap, robots, Open Graph, JSON-LD, chip «Empresa verificada» | Hecho | `components/landing/live-counters.tsx`, `app/sitemap.ts`, `app/robots.ts` |
| §8 Umbral mínimo para mostrar cifras | Decidido | sin umbral: cifras reales siempre y «Sé de los primeros» con 0 |

### Plan por fases

| Fase | Estado | Notas |
|---|---|---|
| 0 Cimientos (CI, typecheck, `.env.example`) | Hecho | |
| 1 Infra propia (Supabase autoalojado, Caddy, backups, Dockerfile) | Hecho | `infra/vps/`; el despliegue en el VPS real está pospuesto por decisión de Frank |
| 2 Propuestas (BD, RPC, «Mis propuestas», bandeja, comparación, tests RLS) | Hecho | |
| 3 Swipe + intereses + Likes | Hecho | |
| 4 Match + chat (Realtime, no leídos) | Hecho | |
| 5 Confianza: verificación de empresa, rate limits, Turnstile, admin mínimo | Hecho | Turnstile apagado salvo que exista la clave del sitio |
| 6 Landing viva + SEO | Hecho | |
| 7 Beta: sembrar problemas reales, QA móvil, monitoreo | Parcial | QA móvil y monitoreo base hechos; faltan problemas reales de beta y el monitoreo en el VPS (bloque 11, en pausa) |

### Funciones que no existen y se reportan sin construir

| Función | Estado |
|---|---|
| Explorar talento para empresas (hoy `/app/explorar` es solo del freelancer) | Fuera del alcance de lanzamiento |
| Eliminar cuenta | Espera decisión de Frank, junto con privacidad y términos |
| Pantalla de rol para quien entre con Google | Google está apagado |
| Pedir el nombre de empresa después del Match | Tarjeta pendiente con Frank |
| Analítica de producto | No decidida |

### Barrido de pantallas vacías y huérfanas

- Textos «Próximamente», `TODO`, lorem ipsum: ninguno fuera de `/ui-kit` (las coincidencias de «todo» son la palabra normal).
- Ítems de navegación: cada uno lleva a una pantalla funcional. La navegación de empresa es Propuestas, Likes, Chats y Perfil; la del freelancer, Swipe, Explorar, Likes, Chats y Perfil. «Explorar talento» no aparece para empresas.
- Rutas huérfanas: `lib/routes-inventory.test.ts` falla si hay una página sin entrada en el inventario o una entrada sin página.
