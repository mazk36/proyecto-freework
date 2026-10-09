# Configurar Supabase para MatchWork

La app web usa una exportación estática para GitHub Pages. La URL del proyecto y la publishable key se incorporan al código del navegador; son valores públicos y solo son seguros junto con la migración y sus permisos RLS. **No configures una `service_role` key ni una secret key en la web, `.env.local`, variables públicas de GitHub o el workflow.**

## Crear y preparar el proyecto

1. Crea un proyecto PostgreSQL en Supabase y copia la Project URL y la publishable key.
2. En Supabase **SQL Editor**, ejecuta el contenido completo de [`20261009010000_company_problem_publishing.sql`](../../supabase/migrations/20261009010000_company_problem_publishing.sql). El trigger de Auth crea el perfil de rol; no publiques una API key administrativa.
3. En **Authentication → Providers**, habilita Email. Supabase puede requerir confirmación de correo; el callback de MatchWork la procesa.
4. En **Authentication → URL Configuration**, configura el sitio publicado y permite las URL de confirmación:
   - `https://marcelojauregui.me/proyecto-freework/`
   - `https://marcelojauregui.me/proyecto-freework/auth/callback/`
   - Para desarrollo local: `http://localhost:3000/` y `http://localhost:3000/auth/callback/`.

Si la URL pública del proyecto cambia, actualiza estas direcciones para que coincidan con el destino configurado en GitHub Pages.

## Variables del proyecto

Para desarrollo local, copia `apps/web/.env.example` a `apps/web/.env.local` y asigna:

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key del proyecto.
- `NEXT_PUBLIC_BASE_PATH`: déjala vacía en `localhost`.

Para GitHub Pages, añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como **Actions variables** en `mazk36/proyecto-freework` (`Settings → Secrets and variables → Actions → Variables`). El workflow define automáticamente `NEXT_PUBLIC_BASE_PATH`. La publishable key es pública; no uses la service role key.

## Ejecutar y recorrer el Camino A

1. Instala dependencias con `pnpm install` e inicia la web con `pnpm dev`.
2. Registra una cuenta de empresa. Si está habilitada la confirmación de correo, abre el enlace que envía Supabase.
3. Completa nombre, sector y país en **Perfil → Perfil de empresa**.
4. En **Mis problemas → Publicar un problema**, completa los cinco pasos. Los borradores se guardan en la base y la interfaz solo los marca guardados después de recibir respuesta.
5. Revisa y confirma la publicación. El registro debe aparecer en **Mis problemas**; editarlo retira temporalmente la publicación abierta mientras se vuelve a revisar y publicar.
6. Registra una cuenta freelancer distinta y abre **Explorar** para consultar publicaciones abiertas. Si la empresa ocultó su nombre, la función de base de datos devuelve `null` para ese dato.

Sin URL y publishable key, la aplicación no finge autenticación ni guardados: muestra que falta conectar Supabase. Sin aplicar la migración, Auth puede crear una cuenta pero el perfil y las operaciones del Camino A no podrán completarse.
