# Project Mission

MatchWork es una plataforma web de marketplace centrada en problemas. Las empresas describen problemas que quieren resolver y los profesionales independientes pueden analizar esos problemas y competir con propuestas de distintas soluciones. La dirección del producto es **problem first, solution second**. Un Match representa interés mutuo para continuar una conversación; no implica contratación, pago ni contrato. Sigue el sistema visual aprobado en [la guía de identidad](docs/brand/matchwork-core-identity.md). Los requisitos evolucionarán; nunca inventes requisitos de negocio ni presentes ideas pendientes como decisiones aprobadas.

# Source of Truth

Ante una duda, sigue esta jerarquía:

1. Instrucciones explícitas del usuario.
2. Especificaciones aprobadas dentro de `/docs`.
3. Architecture Decision Records (ADR) aceptados.
4. Código y tests existentes.
5. Convenciones generales de ingeniería.

Si dos fuentes de autoridad comparable se contradicen, detente en la parte afectada y pide aclaración. No elijas una interpretación en silencio.

# Engineering Principles

- Prefiere la simplicidad y evita la sobreingeniería.
- Mantén responsabilidades claras, alta cohesión y bajo acoplamiento.
- Aplica DRY cuando reduzca duplicación significativa; evita abstracciones prematuras.
- Aplica SOLID cuando resulte apropiado y prefiere composición sobre herencia.
- Usa nombres descriptivos y funciones pequeñas y enfocadas.
- Mantén las APIs explícitas y controla los efectos secundarios.
- Prioriza código legible sobre código ingenioso.
- Elimina código muerto y evita comentarios que solo repitan el código.

# Architecture Rules

- El dominio del negocio no debe depender de la UI.
- La UI no debe acceder directamente a la base de datos.
- Mantén la lógica de negocio fuera de los componentes visuales.
- Encapsula las integraciones externas y centraliza la configuración.
- Haz explícitas las dependencias entre módulos y evita dependencias circulares.
- Nunca guardes secretos en el repositorio.
- No elijas ni asumas un framework o stack hasta que se apruebe.

# Type Safety

Cuando se elija un lenguaje con sistema de tipos, usa su modo estricto. Evita `any` y equivalentes salvo que exista una justificación concreta. Valida datos que cruzan límites externos y distingue los tipos internos de los DTOs o contratos externos cuando corresponda.

# Error Handling

Maneja errores explícitamente; no silencies excepciones. Proporciona errores útiles sin exponer información sensible y distingue los errores esperados de los inesperados.

# Security

- No incluyas secretos ni hagas commit de archivos `.env`; documenta las variables necesarias en `.env.example`.
- Valida entradas externas, aplica mínimo privilegio y no confíes en datos recibidos del cliente.
- Cuando se implemente autenticación, separa autenticación de autorización.
- No registres credenciales, tokens ni datos sensibles.
- Evalúa las dependencias nuevas antes de incorporarlas.

# Dependencies

Antes de agregar una dependencia, determina si es necesaria, si puede evitarse razonablemente, si ya existe una librería equivalente y si la opción está mantenida. Justifica las dependencias importantes. No agregues dependencias solo por conveniencia.

# Testing

La funcionalidad significativa futura debe tener pruebas apropiadas. Prioriza lógica de negocio, casos límite y validación; añade pruebas de integración cuando aporten valor. No crees pruebas triviales para aumentar cobertura.

# Documentation

Documenta decisiones arquitectónicas importantes, contratos relevantes, cambios estructurales y procedimientos de desarrollo necesarios. Evita documentación redundante y basa los documentos de producto únicamente en requisitos confirmados.

# Working Procedure

Antes de modificar código:

1. Lee este `AGENTS.md` y el `AGENTS.md` más cercano a los archivos afectados.
2. Inspecciona el código relacionado y entiende los patrones existentes.
3. Comprueba las pruebas existentes pertinentes.

Durante la implementación:

1. Realiza el cambio mínimo correcto y reutiliza patrones existentes.
2. Evita refactors no relacionados.
3. Mantén compatibilidad salvo instrucción contraria.

Después de implementar:

1. Ejecuta formatter, lint, typecheck y pruebas pertinentes si están configurados.
2. Revisa `git diff`, elimina temporales y comprueba que no haya secretos ni cambios accidentales.
3. Actualiza la documentación cuando corresponda.

# Definition of Done

Una tarea no está terminada mientras haya errores conocidos, pruebas pertinentes fallidas, lint o typecheck fallidos, archivos temporales, código comentado innecesario, secretos, cambios accidentales o documentación necesaria desactualizada. Omite las comprobaciones para herramientas que todavía no existan y deja constancia de las limitaciones relevantes.
