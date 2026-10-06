# Arquitectura

La arquitectura global de Freework sigue en definición. Las decisiones aprobadas cubren la aplicación web (Next.js con App Router, TypeScript y Tailwind CSS) y el modelo frontend de Discovery, propuestas privadas y Match. Se registran en [ADR-0001](../decisions/ADR-0001-frontend-stack.md) y [ADR-0002](../decisions/ADR-0002-discovery-and-matching-model.md).

El estado de demo reside en un proveedor React pequeño y se serializa en `localStorage`. Los selectores de dominio limitan qué propuestas aparecen en las vistas habituales: el freelancer consulta las propias y la empresa consulta propuestas de sus propios problemas. Esta es una regla de UI/mock, no una frontera de seguridad; el servidor deberá autorizar cada lectura y escritura.

El ranking se mantiene como una función pura fuera de los componentes visuales para poder sustituirlo después. El frontend se publica como export estático de Next.js; las rutas con segmentos dinámicos enumeran sus parámetros durante el build, y los detalles de Match usan un query param en una ruta estática.

El backend, persistencia de servidor, autenticación, autorización, proveedor cloud y arquitectura futura de despliegue siguen pendientes. Documenta las decisiones importantes en `/docs/decisions/` usando la [plantilla ADR](../decisions/ADR-0000-template.md).
