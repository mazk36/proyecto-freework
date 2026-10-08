# ADR-0002: Modelo de Discovery y matching

## Estado

Aceptado como modelo de producto.

## Contexto

MatchWork parte de problemas que una empresa quiere resolver y permite que distintos freelancers propongan soluciones. Una vista de Discovery puede ayudar a revisar oportunidades o propuestas, pero cada propuesta debe permanecer privada para sus participantes.

## Decisión

- Mantener `Problem` como punto de partida y permitir varias `SolutionProposal` para un mismo problema.
- La experiencia prevista para freelancers permite descubrir problemas; la experiencia prevista para empresas permite revisar propuestas de sus problemas.
- Un freelancer puede consultar sus propias propuestas; la empresa responsable puede consultar las propuestas recibidas para sus problemas.
- Un Match representa interés mutuo para continuar conversando. No implica contratación, pago ni contrato.
- El ranking inicial se expresa como funciones puras y deterministas que consideran preferencias, presupuesto y recencia. No se ha decidido un algoritmo futuro.

## Estado de implementación

Las funciones de dominio y sus pruebas se conservan. La implementación frontend con perfiles, propuestas y datos de demostración fue retirada. Las rutas correspondientes viven bajo `/app` y muestran estados vacíos hasta que exista una fuente real de datos. La separación pública/privada y la autenticación temporal se describen en [ADR-0003](ADR-0003-public-private-shell-and-temporary-auth.md).

## Alternativas consideradas

- Mostrar propuestas en el detalle público del problema: descartado porque las propuestas pertenecen a sus participantes.
- Elegir un algoritmo de recomendación avanzado: no adoptado; no hay una decisión de producto para ello.
- Implementar servicios de servidor como parte del modelo frontend: fuera del alcance de este ADR.

## Consecuencias

- Problemas y propuestas siguen siendo conceptos separados del frontend.
- La implementación futura debe autorizar cada lectura y escritura en el servidor; filtrar datos en la UI no basta.
- Un Match es un estado de interés mutuo, no una relación contractual.
- Las páginas vacías actuales no implican que existan datos disponibles.
