# Freework

Freework conecta empresas con freelancers mediante un enfoque centrado en problemas. Las empresas describen una necesidad y los freelancers pueden proponer distintas soluciones.

## Estado

La demo frontend incluye un flujo **Discovery-first** para descubrir problemas, enviar soluciones y hacer Match cuando ambas partes quieren continuar. El modo `Explore` (`/problems`) conserva la búsqueda, los filtros y el mosaico para investigar oportunidades manualmente. La experiencia de empresa revisa propuestas privadas asociadas a sus problemas.

No hay autenticación ni backend. El selector de rol simula `Freelancer` y `Empresa`; las interacciones de demo se guardan en `localStorage` en el navegador actual y se pueden reiniciar desde `Profile`.

## Desarrollo local

Requisitos: Node.js 22.13 o posterior y pnpm 11.19.0.

```bash
pnpm install
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`. También puedes ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` desde la raíz.

La experiencia utiliza datos de demostración. No se envían datos a un servidor. La privacidad de propuestas se aplica mediante selectores y vistas de la interfaz; no es autorización real. Antes de incorporar datos de usuarios, se deberá aplicar autorización en el servidor.

## Rutas principales

- `/discover`: feed secuencial para freelancers o selector de problemas para empresas, según el rol de demo.
- `/discover/dismissed`, `/discover/preferences`: problemas o propuestas descartados y preferencias de ranking.
- `/problems`: exploración manual con mosaico, búsqueda, filtros y ordenamiento.
- `/problems/[id]`: contexto público del problema, sin listar propuestas.
- `/company/problems`: problemas de la empresa demo y acceso a sus soluciones.
- `/company/problems/[id]/solutions/discover`: feed privado de propuestas para un problema de la empresa demo.
- `/saved`, `/proposals`, `/matches`, `/matches/detail?match=...`: guardados, propuestas propias y Matches.
- `/profile`: perfil placeholder y reinicio del estado de demo.

Un Match representa interés mutuo entre la empresa responsable y quien envió una solución. No representa contratación, pago ni contrato. La negociación y el chat están pendientes.

## Estructura

- `apps/`: aplicaciones web y API (la API continúa pendiente).
- `packages/`: espacio previsto para componentes y código compartido.
- `docs/`: visión de producto, arquitectura, decisiones y proceso de desarrollo.
- `infra/`: espacio previsto para infraestructura futura.
- `scripts/`: espacio previsto para herramientas internas.
- `tests/`: espacio previsto para pruebas.

Consulta [la visión del producto](docs/product/vision.md) y las instrucciones en `AGENTS.md` antes de proponer cambios.
