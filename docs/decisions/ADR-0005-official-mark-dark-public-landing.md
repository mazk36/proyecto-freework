# ADR-0005: Logo oficial y landing pública oscura

## Estado

Aceptado.

## Contexto

La implementación inicial dibujó un monograma aproximado con SVG inline y repitió esa aproximación en el favicon. El usuario entregó un logo oficial raster independiente, `apps/web/public/brand/matchwork-logo.png`: un lockup cuadrado con el símbolo ribbon y el wordmark sobre un lienzo blanco. También aprobó Night Blue `#0B2A5B` como fondo dominante de toda la landing pública.

## Decisión

- Utilizar la imagen oficial sin modificar como única fuente del logo en navegación, acceso, aplicación y favicon. No recortar, redibujar ni reconstruir el asset. El Master Board define el resto del sistema visual.
- Aplicar un tema oscuro acotado a la landing pública: Night Blue como fondo, Soft White como texto principal, superficies azules tonales y Purple como acento.
- Mantener los estilos claros de acceso y aplicación privada, sin modificar sus rutas ni funcionamiento.

## Consecuencias

- El componente de marca muestra el archivo oficial en vez de construir el símbolo con SVG inline. El fichero del favicon es una copia exacta del mismo PNG.
- Los tokens de la landing pública se centralizan y se aíslan de las demás rutas.
- Esta decisión reemplaza las partes de ADR-0004 que describen la aproximación del monograma y una base clara para la landing pública.
