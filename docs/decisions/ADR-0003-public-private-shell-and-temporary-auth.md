# ADR-0003: Sitio público, aplicación privada y acceso temporal

## Estado

Aceptado.

## Contexto

La versión anterior combinaba la landing con navegación de aplicación, cuentas de rol simuladas y conjuntos de contenido ficticio. La dirección actual requiere una web pública mínima y una app vacía separada, sin incorporar todavía un servicio de autenticación.

## Decisión

- Mantener como páginas públicas `/`, `/iniciar-sesion` y `/registro`; la página 404 también permanece accesible.
- Agrupar las páginas de aplicación bajo `/app` y redirigir las rutas privadas antiguas hacia sus rutas canónicas o al inicio de sesión.
- Escribir toda la interfaz visible en español, declarar `lang="es"` y usar tema oscuro negro con morado como acento.
- Usar un `AuthProvider` temporal de frontend para registro, inicio y cierre de sesión. Solo se guardan nombre, correo, rol y sesión en `localStorage`; la contraseña no se almacena ni se comprueba.
- No cargar datasets ficticios. Las páginas sin fuente de datos muestran estados vacíos.
- Mantener la publicación de problemas como pendiente hasta que exista un servicio que guarde y comparta la información.

## Consecuencias

- La navegación y las redirecciones se ejecutan en el cliente porque el sitio se exporta estáticamente para GitHub Pages.
- Esta autenticación y frontera de rutas no proporcionan seguridad. No deben proteger datos reales. La autenticación y autorización deberán validarse en servidor antes de incorporar información de usuarios.
- Las contraseñas ingresadas en los formularios son transitorias y no se guardan; el inicio de sesión local reconoce cuentas registradas previamente en el mismo navegador.
- La app comienza sin problemas, propuestas, guardados, descartados ni Matches.
- La publicación, persistencia compartida y autenticación real quedan para una fase posterior.
