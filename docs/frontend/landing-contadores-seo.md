# Landing: contadores públicos y SEO

La RPC `public.get_public_counters()` es de solo lectura y devuelve una fila con agregados, sin identificadores ni datos individuales. Su ejecución está concedida a `anon` y `authenticated`; no modifica permisos ni políticas de las tablas.

- **Problemas abiertos:** problemas con `status = 'open'`.
- **Empresas que publicaron problemas:** empresas distintas con al menos un problema cuyo estado actual sea `open`, `paused` o `closed`. Se excluyen borradores. Esto no es un historial permanente: al volver a editar una publicación, el modelo actual la convierte en borrador y borra `published_at`, por lo que esa empresa puede dejar de contar hasta republicar.
- **Profesionales con perfil público:** cuentas de freelancer con `profiles.is_public = true` y un titular (`freelancer_profiles.headline`) no vacío; es un criterio conservador que excluye perfiles públicos vacíos. El nombre técnico `freelancers_active` no implica que hayan iniciado sesión recientemente ni que estén disponibles.
- **Propuestas enviadas:** propuestas cuyo estado actual es `submitted`; se excluyen borradores y retiradas.

El cliente valida la respuesta y conserva las cifras exitosas durante 60 segundos en memoria y, si está disponible, en `sessionStorage`. Al volver el foco consulta de nuevo usando esa caché; si faltan las credenciales de Supabase, falla la RPC o la respuesta no es válida, oculta la franja. Los valores cero muestran «Sé de los primeros». La animación se ejecuta una sola vez al entrar en pantalla y se omite con movimiento reducido. El skeleton reserva espacio para una respuesta exitosa; si la consulta falla, eliminar la franja puede causar un desplazamiento que debe medirse en el CLS real.

## Configuración y límites

- Configurar `NEXT_PUBLIC_SITE_URL` con el origen público real para generar canonical, Open Graph, JSON-LD y sitemap; si falta, se utiliza `http://localhost:3000`. `PAGES_BASE_PATH` se añade sin duplicarse para GitHub Pages. El workflow usa el origen proporcionado por Pages salvo que se configure la variable de repositorio `NEXT_PUBLIC_SITE_URL`.
- `robots.txt` y `sitemap.xml` se generan estáticamente. El sitemap incluye solo `/`, `/registro/` e `/iniciar-sesion/`. Los perfiles se cargan en el cliente mediante `?slug=`: no hay páginas estáticas individuales ni metadata o canonical particular por perfil, por lo que se excluyen del sitemap. Su indexación individual requiere URLs y renderizado en servidor.
- En GitHub Pages bajo un subdirectorio, los buscadores consultan `robots.txt` en la raíz del dominio, no en la raíz del proyecto. Para que las reglas surtan efecto se necesita controlar el `robots.txt` del dominio o usar un dominio propio en su raíz. `robots.txt` tampoco sustituye la protección de rutas privadas; estas mantienen `noindex` en sus metadatos.
- La imagen social `public/og/matchwork.png` usa el wordmark oficial sin modificar; se regenera con `node apps/web/scripts/generate-og-image.mjs` y FFmpeg. Los archivos originales de `public/brand` permanecen intactos.
- Pendiente: mediciones reales de Lighthouse en producción, capturas en los cinco tamaños del brief y páginas de perfiles indexables cuando haya renderizado en servidor. El chip «Empresa verificada» requiere una fuente de verificación real; actualmente no existe en el modelo.
