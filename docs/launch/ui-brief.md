# Brief de UI/UX para el lanzamiento

Estado: propuesto con las decisiones de Frank del 2026-11-02. Lo marcado **[pendiente]** necesita su confirmación. Complementa `docs/brand/matchwork-core-identity.md` y los `AGENTS.md`; si hay contradicción gana la identidad de marca (detente y pregunta). Objetivo: app hermosa, animada, profesional y totalmente responsive, pensada primero para móvil (el swipe es el corazón) y cuidada en tablet y escritorio.

## 0. Reglas para quien implemente

1. Lee `AGENTS.md` (raíz y `apps/web`). Next.js es la 16: lee `node_modules/next/dist/docs/` antes de escribir código.
2. Server Components por defecto; `"use client"` solo para estado, gestos y APIs del navegador.
3. Una pieza de UI por PR, con capturas en los cinco tamaños de la sección 9.
4. No inventes cifras, perfiles ni datos de ejemplo visibles. Estados vacíos honestos y accionables.
5. No toques `public/brand/`. Logos con `MatchWorkLogoLockup`.
6. Texto en español neutro tuteando. Sin jerga técnica.
7. Lógica de negocio en `lib/` (con tests); los componentes solo presentan.

## 1. Sistema visual (usar lo existente)

- Tokens de `app/globals.css`: `--background`, `--surface`, `--surface-raised`, `--border`, `--accent` (#8A4DFF), `--accent-soft`, `--muted`. Nunca hex hardcodeado en componentes.
- Tipografía: Sora (títulos), Inter (interfaz), JetBrains Mono (montos, contadores, etiquetas compactas).
- Morado solo para acciones principales y momentos de Match.
- `rounded-2xl` en tarjetas, `rounded-xl` en controles, mucho aire. Motivo de nodos conectados usado con moderación como fondo sutil.
- Semánticos extra: éxito (esmeralda), aviso (ámbar), error (rosa/rojo), siempre con ícono o texto.
- Íconos `lucide-react`, trazo 1.8. Modo oscuro (GitHub Night) en landing y shell; no agregar modo claro.
- Tarjetas: `bg-surface`, borde 1px `--border`; sombra suave solo en elementos flotantes (hoja de propuesta, toasts, mazo). `ring-1 ring-white/5` interior da acabado premium.

## 2. Movimiento

El movimiento explica qué pasó; nunca retrasa al usuario.

- Duraciones: micro 150–200 ms; paneles 250–350 ms; entradas de sección 400–600 ms. Easing `cubic-bezier(0.22,1,0.36,1)` para entradas, ease-out para salidas.
- Gestos y física con resortes (stiffness 300, damping 30), no curvas fijas.
- Landing: al hacer scroll, fade + 16 px de desplazamiento, una sola vez, escalonado 60–80 ms.
- Cargas: skeletons con shimmer suave, no "Cargando…" solitario.
- `prefers-reduced-motion`: sin desplazamientos ni rotaciones, solo fundidos cortos (`MotionConfig reducedMotion="user"`).
- Animar solo `transform` y `opacity`.
- Dependencia propuesta: `motion` (sucesor de Framer Motion) para arrastre con velocidad, resortes y `AnimatePresence`; versión exacta fijada, solo en Client Components; CSS puro para hovers. Alternativa: Pointer Events + `requestAnimationFrame`. **[pendiente: OK de Frank/revisor]**

## 3. SwipeDeck (freelancer, `/app/descubrir`)

Gesto→estado (`FreelancerProblemInteraction` en `types/domain.ts`): derecha = "Me interesa" → `saved` (aparece en Likes); izquierda = "No me interesa" → `dismissed`; botón "Proponer ahora" abre la hoja y termina en `proposal_submitted`; Deshacer (6 s) vuelve a `unseen`. El orden viene de `rankProblemsForFreelancer` (`lib/discovery.ts`); no reordenar en la UI.

Tarjeta: pila de 3; la superior a tamaño completo, las de atrás a escala 0.96 y 0.92 desplazadas 10 y 20 px con menos opacidad. Contenido: sector y empresa (o "Empresa reservada"; chip "Empresa verificada" con escudo si aplica), título Sora máx. 3 líneas, resumen máx. 5 líneas con degradado y "Ver más", chips de objetivos (máx. 3 + "+N"), pie con presupuesto (mono, moneda correcta) y plazo. Tocar sin arrastrar abre el detalle completo (hoja inferior en móvil, panel lateral en escritorio) con descripción, impactos, criterios de éxito y "Proponer ahora".

Gesto: arrastre horizontal con ligera inclinación; rotación = dx/20°, tope ±12°. Desde 40 px aparece una etiqueta: derecha "ME INTERESA" (lavanda/morado, rotada −8°), izquierda "NO POR AHORA" (gris pizarra, rotada +8°); opacidad de 0 a 1 entre 40 y 120 px. Umbral: |dx| > 120 px o velocidad > 500 px/s; si no, vuelve al centro con resorte. Al decidir: sale volando (x ± 1.2 × ancho, rot 18°, opacidad 0) en ~280 ms y la siguiente sube con resorte; vibración opcional `navigator.vibrate?.(8)`. Toast tras "Me interesa": "Guardado en tus Likes" con **Proponer ahora** y **Deshacer**; tras descartar: "Descartado" con **Deshacer**. `touch-action: pan-y`.

Accesibilidad obligatoria: botones grandes (≥56 px) siempre visibles: ✕ descartar, corazón me interesa, "Proponer ahora" como principal. Atajos en escritorio: ← descartar, → me interesa, Enter detalle, P proponer, Z deshacer, con pista discreta. La tarjeta superior es un `article` con `aria-label`; cambios anunciados en `aria-live="polite"`; tras decidir el foco pasa a la tarjeta siguiente.

Estados: cargando = 3 tarjetas esqueleto; sin más = ilustración de nodos + "Ya viste todo por ahora" + **Ver mis Likes** y **Volver a revisar descartados**; error = tarjeta con **Reintentar**; primera vez = tutorial de 2 pasos sobre la tarjeta, cerrable, recordado en `localStorage` con try/catch.

Responsive: móvil ≥360 px mazo de ancho `min(100%,28rem)` y alto `min(70dvh,40rem)` con botones fijos sobre la barra inferior (`env(safe-area-inset-bottom)`); tablet ≥768 px mazo centrado junto a la riel; escritorio ≥1024 px dos columnas: mazo (28 rem) + panel con el detalle completo del problema de la tarjeta superior, con fundido corto en cada cambio.

## 4. ProposalSheet

Móvil: hoja inferior con resorte, agarre arrastrable, hasta 92 dvh, se cierra arrastrando. Escritorio: panel lateral de 32–40 rem. Campos (según `docs/architecture/company-proposals-integration.md`): diagnóstico, solución, entregables, plazo, precio y moneda (PEN o USD), costos recurrentes, mantenimiento/garantía, experiencia relacionada. Acciones: **Enviar propuesta** (primaria) y **Guardar borrador para después** con autoguardado y "Guardado hace un momento". Validación en línea con mensajes específicos; nunca un botón deshabilitado sin explicar qué falta. Al enviar: check animado y "Tu propuesta fue enviada a <empresa>"; si falla, conservar todo lo escrito.

## 5. Panel de empresa (`/app/propuestas` y detalle del problema)

Bandeja por problema: freelancer, precio, plazo, resumen en 2 líneas; acciones **Me interesa**, **Guardar**, **Descartar**. Sin orden automático por precio ni "compatibilidad" fabricada. Comparar hasta 3: casillas y barra flotante "Comparar (2/3)"; tabla lado a lado en escritorio y carrusel con scroll horizontal anclado en móvil. **Me interesa** crea el Match (`createMatchForInterestedProposal`): modal breve con animación (nodos que se unen y chispa morada), "Hicieron Match" y **Abrir chat**. Match no es contratación ni pago: sin lenguaje de contrato.

## 6. Likes, Guardados, Matches

`/app/likes` (freelancer): pestañas segmentadas "Me interesan · Propuestas enviadas · Matches"; filas-tarjeta con estado como chip y siguiente acción ("Proponer", "Ver chat"); quitar con deshacer. Estados vacíos con ícono, frase útil y botón de acción.

## 7. Mensajería (`/app/chats`)

Móvil: lista a pantalla completa y hilo a pantalla completa con botón atrás. Escritorio: lista a la izquierda (20 rem) e hilo a la derecha. Burbujas propias a la derecha (morado suave), ajenas a la izquierda (`surface-raised`); agrupar por remitente y separar por día ("Hoy", "Ayer"). Campo fijo abajo, crece hasta 5 líneas, Enter envía y Shift+Enter salta línea; usa 100dvh y `visualViewport` para que el teclado móvil no tape el campo. Envío optimista con estados enviando/enviado/error con reintentar. No leídos en el ícono Chats y en cada conversación. Alcance inicial: solo texto; adjuntos y contacto externo **[pendiente: Frank]**. Cabecera: nombre, rol, chip del problema asociado.

## 8. Landing viva, SEO y confianza

Franja "En vivo" bajo el hero con tres cifras reales (problemas abiertos, empresas que publicaron, freelancers activos) con conteo animado (~1.2 s) al entrar en pantalla, una sola vez, y punto pulsante "En vivo" (CSS); actualización con caché ~60 s o Realtime. Nunca cifras inventadas; si un valor es 0 mostrar "Sé de los primeros" en vez de "0" **[pendiente: ¿umbral mínimo?]**. Secciones con entrada animada al scroll; CTA doble: "Soy empresa, tengo un problema" y "Soy freelancer, quiero resolver problemas". SEO: `sitemap.xml`, `robots.txt`, Open Graph/Twitter con imagen, title y description por página, JSON-LD de organización; LCP < 2.5 s en móvil, imágenes con dimensiones explícitas. Chip "Empresa verificada" (escudo + check) en tarjetas y perfil de empresa.

## 9. Criterios de aceptación de todo PR de UI

Capturas en 360×740, 390×844, 768×1024, 1280×800 y 1536×864. Sin scroll horizontal. Objetivos táctiles ≥44 px; texto de campos ≥16 px. Contraste AA, foco visible, navegación completa con teclado, etiquetas en campos y `aria-label` en ícono-botones. CLS < 0.1 (reservar espacio). Estados completos: cargando, vacío, error, éxito. lint, typecheck y test en verde, con tests unitarios para lógica nueva (p. ej. la decisión del umbral de swipe como función pura). Moneda con `Intl.NumberFormat` (es-PE; PEN por defecto con S/, USD con US$); nunca convertir en silencio.

## 10. Orden de trabajo de UI

1. Base: tokens de movimiento, Skeleton, Toast, BottomSheet, EmptyState mejorado, Badge de estado.
2. SwipeDeck + detalle con datos reales de `listOpenBusinessProblems`.
3. ProposalSheet y "Mis propuestas".
4. Bandeja y comparación para empresas y celebración de Match.
5. Likes/Guardados.
6. Chat.
7. Landing viva, SEO y pulido.
8. Admin mínimo: tabla responsive de empresas por verificar con **Verificar / Rechazar**, lista de usuarios y problemas con opción de suspender; claridad y rapidez sobre adornos.
