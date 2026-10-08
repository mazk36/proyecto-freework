# ADR-0001: Stack de la aplicación web

## Status

Accepted

## Context

MatchWork necesita una primera experiencia web para explorar problemas, revisar propuestas y simular la publicación de un problema. Los requisitos piden rutas navegables, interacción en el cliente donde haga falta y tipos estrictos, sin elegir todavía el stack del backend.

## Decision

Construir la aplicación en `apps/web` con Next.js 16.3.8 y App Router, React 19.3.0, TypeScript 6.0.3 y Tailwind CSS 4.3.3. Gestionar el monorepo con pnpm 11.19.0 y mantener la configuración de lint, comprobación de tipos y pruebas pequeña y local al proyecto.

## Alternatives Considered

- Otras tecnologías web: no se adoptan en esta iteración; la solicitud define este stack para validar el producto.
- Un orquestador de builds de monorepo: se omite porque por ahora solo hay una aplicación y no se necesita coordinación adicional.

## Consequences

- App Router permite organizar las rutas solicitadas en el sistema de archivos y mantener componentes de servidor por defecto.
- TypeScript estricto hace explícitos los modelos de dominio y los límites de datos de la interfaz.
- Tailwind CSS y variables CSS centralizadas permiten construir y ajustar el sistema visual desde el propio proyecto.
- Se deben mantener pequeños los límites entre componentes de servidor y cliente. Esta decisión no selecciona backend, base de datos, autenticación ni proveedor de despliegue.

## Date

2026-10-06
