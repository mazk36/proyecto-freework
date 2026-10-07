# Freework

Freework conecta empresas con profesionales independientes mediante un enfoque centrado en problemas: primero se describe la necesidad y después se exploran posibles soluciones.

## Estado actual

La interfaz está en español y usa un tema oscuro con acento morado. La landing pública está separada de la aplicación privada. La app vive bajo `/app` y muestra estados vacíos; no se incluyen problemas, propuestas, empresas, perfiles ni Matches de ejemplo.

El registro y el inicio de sesión son una simulación frontend para desarrollo. Se guardan en `localStorage` únicamente el nombre, correo, rol y la sesión temporal. Las contraseñas no se verifican ni se guardan. La protección funciona en el navegador y no proporciona autenticación ni autorización real. No uses esta versión para proteger datos.

La publicación de problemas todavía no está conectada a un servicio de datos. La pantalla explica ese límite y no conserva ni envía información.

## Desarrollo local

Requisitos: Node.js 22.13 o posterior y pnpm 11.19.0.

```bash
pnpm install
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`. También puedes ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` desde la raíz.

## Rutas

Públicas:

- `/`: landing.
- `/iniciar-sesion`: inicio de sesión temporal.
- `/registro`: registro temporal.

Privadas:

- `/app`: inicio según el tipo de cuenta.
- `/app/descubrir` y `/app/explorar`: oportunidades, actualmente sin problemas disponibles.
- `/app/problemas` y `/app/problemas/nuevo`: problemas de empresa y estado de publicación pendiente.
- `/app/propuestas`, `/app/guardados`, `/app/matches` y `/app/perfil`: secciones vacías o datos de la cuenta temporal.

Las antiguas rutas privadas redirigen al inicio de sesión o a su ruta canónica bajo `/app`. La ruta 404 sigue disponible públicamente.

Consulta [la visión del producto](docs/product/vision.md), la [arquitectura](docs/architecture/README.md) y las decisiones en `docs/decisions/`.
