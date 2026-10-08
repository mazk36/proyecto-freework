# ADR-0006: Logos oficiales y fondo GitHub Night

## Estado

Aceptado.

## Contexto

Después de ADR-0005, el usuario entregó variantes oficiales del logo y actualizó los colores de apoyo de la marca a Soft Lavender `#D8C4FF`, Slate Gray `#687280`, Mist `#F5F7FB` y Soft White `#F8FAFC`. Para el fondo pidió un estilo oscuro como GitHub y eligió un casi negro, ya que la paleta de apoyo no contiene un color suficientemente oscuro. Luego proporcionó una variante blanca y morada del wordmark para los fondos oscuros.

## Decisión

- Conservar las imágenes recibidas sin alterar su arte: wordmark horizontal, variante blanca y morada para fondos oscuros, marca compacta y lockup vertical.
- Usar el wordmark claro en superficies claras, el wordmark blanco y morado en superficies oscuras, la marca compacta en espacios pequeños y como icono, y mantener disponible el lockup vertical para composiciones que lo necesiten.
- Usar GitHub Night `#0D1117` como fondo de la landing pública. Aplicar Slate Gray a bordes y como tinte de las superficies oscuras; usar Soft White para texto principal y conservar Purple para acciones y señales de Match.
- Mantener claros los estilos de acceso y aplicación privada, según el alcance de ADR-0005.
- Esta decisión reemplaza en ADR-0005 la variante única del logo y el uso de Night Blue como fondo de la landing. Las demás decisiones de ADR-0005 siguen vigentes.

## Consecuencias

- Los assets oficiales quedan en `apps/web/public/brand/`; el favicon usa una copia exacta de la marca compacta.
- El wordmark horizontal conserva la imagen original y recorta únicamente el espacio transparente exterior al presentarse en una caja horizontal.
- La documentación de identidad mantiene los valores de marca y distingue el azul del logo del fondo nocturno de la landing.
