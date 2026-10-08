# Apps / Web

Esta área contiene la aplicación web de MatchWork, construida con Next.js App Router, TypeScript y Tailwind CSS según `/docs/decisions/ADR-0001-frontend-stack.md`. Su responsabilidad principal es la presentación, interacción, experiencia de usuario, accesibilidad y estado específico de interfaz. Sigue el sistema visual aprobado en `/docs/brand/matchwork-core-identity.md`.

- Mantén la lógica central de negocio fuera de los componentes visuales.
- Prefiere componentes pequeños y reutilizables cuando haya una necesidad real.
- Mantén la interfaz accesible.
- No accedas directamente a la base de datos desde la UI.
- No incluyas ni manejes secretos del servidor en el cliente.
- Separa la presentación del acceso a datos.
- Mantén Server Components por defecto y limita los Client Components a interacciones que requieran estado o APIs del navegador.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
