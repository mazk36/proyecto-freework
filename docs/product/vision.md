# Visión del producto

## Problema

Las empresas pueden reconocer una necesidad antes de conocer la mejor forma de resolverla.

## Propuesta

MatchWork parte de los problemas que las empresas quieren resolver. Profesionales independientes pueden proponer distintos enfoques para una misma necesidad. Cuando una propuesta encaja y ambas partes quieren continuar, hacen Match para seguir conversando.

## Participantes

- Empresa.
- Freelancer.

## Principio central

**Problem first, solution second.** La conversación empieza con la situación que se quiere mejorar, no con una solución técnica predeterminada.

## Alcance actual

La landing y las pantallas de acceso son públicas. La aplicación se agrupa bajo `/app` y solo se muestra después del acceso temporal de desarrollo. La interfaz es en español y utiliza la identidad aprobada de MatchWork: azul noche y morado sobre superficies claras, Sora para encabezados, Inter para la interfaz y JetBrains Mono para datos. La aplicación arranca vacía: no usa problemas, soluciones, propuestas, empresas, freelancers ni Matches ficticios.

Discovery, Explore, propuestas y Matches describen el dominio y la dirección aprobada del producto. En esta versión, sus pantallas no muestran contenido hasta que exista una fuente real de datos. La publicación de problemas también espera la conexión de un servicio de datos.

El significado de Match está limitado al interés mutuo en continuar la conversación. No representa por sí mismo una contratación, un pago ni un contrato.

## Límites y preguntas abiertas

El acceso actual es una simulación frontend almacenada en el navegador. No autentica identidades ni aplica autorización en servidor. No deben incorporarse datos reales o confidenciales hasta implementar esas protecciones.

El backend, persistencia compartida, autenticación, autorización, pagos, reputación, contratos, chat y algoritmo futuro de recomendación quedan pendientes. No se han aprobado decisiones sobre tecnologías para esos sistemas.
