# Freework

Freework conecta empresas con freelancers mediante un enfoque centrado en problemas. Las empresas describen una necesidad y los freelancers pueden proponer distintas soluciones.

## Estado

La primera experiencia frontend está en desarrollo con Next.js, TypeScript y Tailwind CSS. El backend y el resto de la arquitectura todavía están por decidir.

## Desarrollo local

Requisitos: Node.js 22.13 o posterior y pnpm 11.19.0.

```bash
pnpm install
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`. También puedes ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` desde la raíz.

La experiencia usa datos de demostración en memoria. No hay backend ni persistencia.

## Estructura

- `apps/`: aplicaciones web y API (la API continúa pendiente).
- `packages/`: espacio previsto para componentes y código compartido.
- `docs/`: visión de producto, arquitectura, decisiones y proceso de desarrollo.
- `infra/`: espacio previsto para infraestructura futura.
- `scripts/`: espacio previsto para herramientas internas.
- `tests/`: espacio previsto para pruebas.

Consulta [la visión del producto](docs/product/vision.md) y las instrucciones en `AGENTS.md` antes de proponer cambios.
