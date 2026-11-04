# Navegadores soportados

La web usa Tailwind 4, que exige `color-mix()`, `:is()` y `@property`. Matriz soportada:

| Navegador | Versión mínima | Estado |
|---|---|---|
| Safari y todos los navegadores de iPhone/iPad (WebKit) | 16.4 (iOS 16.4) | Probado con WebKit en perfil iPhone 13 (`E2E_ENGINE=webkit`) |
| Chrome / Edge / Opera | 111 | Probado con Chrome actual |
| Firefox | 128 | **No probado**: el Firefox de Playwright no estaba instalado en esta máquina y no se descargó |
| Samsung Internet | 22 | No probado (mismo motor que Chrome) |

Por debajo de esos mínimos la página se vería rota. Un script mínimo en el `<head>` (`lib/browser-support.ts`) detecta la falta de `color-mix()` o `:is()` y muestra una franja «Tu navegador es antiguo…» en lugar de dejarla así.

## Qué se revisó en móvil (iOS)

- Campos de formulario de al menos 16 px (iOS hace zoom si son menores): comprobado en registro, inicio de sesión, recuperación, perfil y chat.
- Alto de página con `100dvh` (el `100vh` de iOS incluye la barra del navegador y recorta el contenido): `body` y las pantallas a pantalla completa usan `min-h-dvh`.
- Áreas seguras: `viewport-fit=cover` en el viewport (sin él `env(safe-area-inset-*)` vale 0) y `env(safe-area-inset-*)` en las barras fijas, el compositor del chat y los márgenes laterales del `body`. La orientación horizontal con muesca no se ha probado en un iPhone real.
- Mazo: `touch-action: pan-y` en la tarjeta (el arrastre horizontal no mueve la página ni dispara «atrás»); `backdrop-filter` lo prefija Tailwind/Lightning CSS.

## Cómo probar otros motores

```bash
E2E_ENGINE=webkit E2E_WEBKIT_PATH=<pw_run.sh de WebKit de Playwright> E2E_PSQL=<psql> node e2e/engines.mjs
```

`engines.mjs`, `email-cycle.mjs` y `mail-storage.mjs` aceptan `E2E_ENGINE=webkit`. El `journey.mjs` usa eventos táctiles CDP y solo corre en Chromium.
