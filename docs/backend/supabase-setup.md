# Preparación y operación de Supabase para perfiles

## Migraciones

La fase depende de la migración existente `20261009010000_company_problem_publishing.sql`. La nueva migración es `20261014010000_public_profiles_portfolios.sql`.

- Proyecto nuevo: aplica las migraciones en orden de timestamp.
- Proyecto existente: confirma primero que la migración de empresas y problemas esté aplicada. La migración de perfiles rellena desde `app_users`, conserva sus UUID/nombres/roles y no publica perfiles.
- Si un usuario de Auth no tiene fila en `app_users`, no se le asigna rol ni perfil automáticamente. Regulariza esas cuentas después de confirmar su tipo por un procedimiento administrativo confiable.
- La migración conserva buckets existentes. Si `avatars` o `portfolio-media` ya existe con otra visibilidad, límites o tipos, la migración falla de forma explícita para evitar alterar archivos sin evaluación.

No apliques la migración en producción desde este repositorio sin autorización explícita. El paso de vista previa, después de configurar y vincular el CLI con el proyecto correcto, es:

```sh
supabase db push --dry-run
```

Antes de un `db push` real, revisa las migraciones pendientes, confirma una copia recuperable de base y Storage, prueba restauración en otro proyecto y obtiene autorización. No uses `supabase db reset --linked`.

## Verificación local

Con Supabase CLI y Docker instalados:

```sh
supabase start
supabase db reset
supabase test db
```

`db reset` aquí se refiere únicamente al proyecto local efímero. No lo ejecutes con `--linked`. El archivo de prueba registra cuentas ficticias dentro de una transacción que termina en rollback; no usa `service_role` para probar RLS.

## Tipos TypeScript

La ubicación técnica usada por este repositorio es `apps/web/types/database.ts`. El CLI puede regenerar el contrato desde la base local después de aplicar las migraciones:

```sh
supabase gen types typescript --local > apps/web/types/database.ts
```

El CLI y la base local no están disponibles en este checkout; el archivo se actualizó a partir de la migración revisada y debe regenerarse con el esquema real antes de integrar UI.

## Copias y restauración

El plan Free no ofrece backups automáticos de base según la documentación vigente; Supabase recomienda exportaciones lógicas periódicas. Guarda el dump fuera del repositorio, en almacenamiento con acceso restringido, y verifica su restauración en un proyecto de prueba. Protege la cadena de conexión como secreto y nunca la pongas en Git.

Una exportación lógica puede separar roles, esquema y datos:

```sh
supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql
supabase db dump --db-url "$SUPABASE_DB_URL" -f data.sql --data-only --use-copy
```

El CLI excluye esquemas administrados como `auth` y `storage`; estos archivos no constituyen una copia completa del proyecto ni preservan cuentas de Auth. Confirma con Supabase una estrategia compatible con el proyecto para respaldar y restaurar las cuentas existentes. Para recuperación integral, usa una copia de plataforma comprobada o una estrategia de exportación de Auth que el propietario haya validado.

La base guarda las referencias de Storage, no los bytes. Exporta los objetos de ambos buckets con un procedimiento separado de Storage y conserva la correspondencia de rutas para restaurarlos. Los backups de base no reponen objetos borrados de Storage. Antes de producción, prueba tanto recuperación PostgreSQL como restauración de objetos.

Consulta [Backups de base de datos](https://supabase.com/docs/guides/platform/backups), [respaldo y restauración con CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) y los [límites de Storage](https://supabase.com/docs/guides/storage/uploads/file-limits). Los límites de planes y retenciones cambian; verifica los actuales en el Dashboard y la [página de precios](https://supabase.com/pricing).

## Variables y configuración

La app existente requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; nunca necesita `service_role`. No se requieren nuevas variables para migraciones. Para operar el CLI remoto, use la sesión del CLI o secretos locales seguros, sin guardar tokens o connection strings en el repositorio.

## Estado de este checkout

Despliegue verificado el 2026-10-19 en el proyecto enlazado `kcbooheuultksqljujfk`. La migración base `20261009010000` ya tenía sus objetos materializados y se registró mediante `migration repair`; después se aplicaron `20261014010000`, `20261019010000` y `20261019020000` con `db push --linked`. El dry-run posterior no encuentra migraciones pendientes. El respaldo `MatchWork-production-20261019.tar.gz` conserva su checksum verificado y ya se ensayó su restauración aislada.

La comprobación remota encontró 2 usuarios Auth, 2 perfiles privados tras el backfill, cero proyectos y cero objetos. Los buckets `avatars` y `portfolio-media` tienen la visibilidad, límites y tipos MIME definidos por la migración; las tablas profesionales tienen RLS, y el lint remoto de `public` no encontró errores. No se crearon usuarios ni archivos de prueba persistentes. Las pruebas pgTAP siguen pasando localmente (105 aserciones); el proyecto remoto no tiene pgTAP habilitado y no se instaló allí solo para ejecutar las pruebas.
