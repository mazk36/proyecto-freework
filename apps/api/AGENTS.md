# Apps / API

Esta área podrá alojar la API, casos de uso, reglas de aplicación, interacción con el dominio, autenticación y autorización, persistencia e integraciones de servidor cuando esas capacidades se definan.

- Valida todas las entradas externas.
- Separa el transporte HTTP de la lógica de negocio.
- No pongas reglas del dominio directamente en handlers o controladores.
- Encapsula persistencia y servicios externos.
- Mantén los contratos explícitos y los errores consistentes.
- No asumas un framework, protocolo ni diseño de API antes de su decisión.
