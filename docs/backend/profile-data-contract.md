# Contrato de datos de perfiles

Este contrato describe las operaciones futuras del cliente Supabase. No implica una API propia ni modifica páginas o componentes. Los permisos de Postgres son la autoridad; las validaciones del cliente solo mejoran la experiencia.

## Consultar el perfil propio

Después de obtener la sesión, use el UUID de Supabase Auth. La política permite consultar el borrador propio:

```ts
const { data: profile, error } = await supabase
  .from("profiles")
  .select("id, account_type, display_name, slug, avatar_path, is_public, created_at, updated_at")
  .eq("id", user.id)
  .maybeSingle();
```

Si la fila no existe, `ensure_my_profile()` crea o recupera el perfil a partir de `app_users`. La función no recibe un UUID:

```ts
const { data: profile, error } = await supabase.rpc("ensure_my_profile");
```

Una sesión sin una fila confiable en `app_users` recibe `42501`; debe completarse la regularización de esa cuenta antes de asignarle un tipo.

## Consultar un perfil público

```ts
const { data: profile, error } = await supabase
  .from("profiles")
  .select(`
    id, display_name, slug, avatar_path,
    freelancer_profiles(headline, bio, location_text, years_experience, website_url, availability_status),
    freelancer_skills(id, skill_id, custom_name, skills(name, slug, category)),
    portfolio_projects(id, title, description, category, project_period, external_url, cover_image_path, sort_order,
      portfolio_media(id, storage_path, alt_text, sort_order))
  `)
  .eq("slug", slug)
  .eq("is_public", true)
  .maybeSingle();
```

RLS oculta borradores y aplica la publicación también a los detalles, habilidades, proyectos y metadatos de imágenes relacionados. El correo de Auth, `app_users`, datos de sesión y datos privados no forman parte de este contrato.

## Editar y publicar el perfil

`profiles` es de solo lectura directa. Cambie solo el objeto permitido por `save_my_profile`; campos como `id`, `account_type`, `created_at` y claves administrativas se rechazan:

```ts
const { data, error } = await supabase.rpc("save_my_profile", {
  p_profile: {
    display_name: "Nombre profesional",
    slug: "nombre-profesional",
    avatar_path: "USER_UUID/FILE_UUID.webp",
  },
});

// Publicar o retirar el perfil es una acción explícita:
await supabase.rpc("save_my_profile", {
  p_profile: { is_public: true },
});
```

Para cambiar los detalles profesionales:

```ts
const { error } = await supabase
  .from("freelancer_profiles")
  .update({
    headline: "Ingeniero de automatización",
    bio: "Descripción profesional",
    location_text: "Lima, Perú",
    years_experience: 6,
    website_url: "https://example.com",
    linkedin_url: "https://www.linkedin.com/in/perfil",
    github_url: "https://github.com/perfil",
    availability_status: "available",
  })
  .eq("user_id", user.id);
```

`linkedin_url` y `github_url` se agregan mediante `20261019010000_freelancer_social_links.sql`; ambos aceptan solo URLs `http(s)` de sus respectivos dominios. `availability_status` es texto opcional limitado a 40 caracteres; no hay una taxonomía de disponibilidad aprobada.

## Habilidades

Para enlazar una habilidad existente, inserte una fila en `freelancer_skills` con `freelancer_user_id` igual al usuario actual y `skill_id` del catálogo. Para una capacidad que aún no exista, use `custom_name` y deje `skill_id` como `null`:

```ts
await supabase.from("freelancer_skills").insert({
  freelancer_user_id: user.id,
  skill_id: null,
  custom_name: "Automatización con PLC legado",
});
```

Una fila debe elegir solo una fuente. La unicidad duplicada devuelve `23505`. Los clientes pueden leer habilidades activas pero no pueden insertar o renombrar elementos del catálogo compartido.

## Proyectos e imágenes

Los proyectos se crean con `is_published = false`:

```ts
const { data: project, error } = await supabase
  .from("portfolio_projects")
  .insert({ freelancer_user_id: user.id, title: "Proyecto" })
  .select("id")
  .single();
```

El dueño cambia `is_published` en su proyecto. El proyecto solo aparece a terceros cuando `profiles.is_public` también es `true`. Las imágenes se guardan con Storage, luego se registra su ruta en `portfolio_media`; nunca se escriben bytes en PostgreSQL.

Para avatar, genere un UUID de archivo y suba una imagen JPEG, PNG o WebP a `avatars/{user.id}/{fileId}.webp` (máximo 2 MiB). La URL pública se deriva así:

```ts
const { data } = supabase.storage.from("avatars").getPublicUrl(path);
```

La URL puede funcionar antes de publicar el perfil; no suba archivos privados a `avatars`.

Para portafolio, use el bucket privado y la ruta `portfolio-media/{user.id}/{project.id}/{fileId}.webp` (máximo 5 MiB). Después de guardar `portfolio_media.storage_path`, un cliente autorizado puede solicitar una URL firmada temporal:

```ts
const { data, error } = await supabase.storage
  .from("portfolio-media")
  .createSignedUrl(path, 300);
```

El plazo del ejemplo es ilustrativo. La autorización del enlace se verifica con RLS al crearlo.

La aplicación utiliza `portfolio_projects.cover_image_path` para la imagen principal y solicita URLs firmadas de corta duración. RLS solo permite leer una imagen propia o una imagen de un proyecto publicado cuyo perfil también sea público.
`portfolio_projects.skills_used` se añade con `20261019020000_portfolio_project_skills.sql`; guarda hasta 20 etiquetas profesionales por proyecto y hereda la privacidad de su fila.

## Ruta pública estática

La vista pública se sirve desde `/profesionales/?slug={profiles.slug}`. El documento HTML es estático y consulta el slug desde el navegador; RLS devuelve únicamente perfiles públicos y sus proyectos publicados. No se usa una ruta dinámica que requiera prerenderizar perfiles desconocidos en GitHub Pages.

## Errores esperados

| Código / respuesta | Causa típica |
| --- | --- |
| `42501` | Sin sesión, propietario incorrecto, operación no autorizada o cuenta pendiente de regularización |
| `22023` | Campos RPC desconocidos, formato o longitud inválidos |
| `23505` | Slug, habilidad o ruta de imagen duplicados |
| `23514` | Una restricción de tabla rechazó el valor |
| `23503` | El usuario, habilidad o proyecto referenciado no existe |
| `P0002` | `save_my_profile` se llamó antes de `ensure_my_profile` |
| Storage `400` / `403` | Tipo o tamaño rechazado, ruta mal formada o permiso RLS insuficiente |

Las respuestas del cliente no deben incluir registros de `auth.users` ni consultar `app_users` para construir perfiles públicos.
