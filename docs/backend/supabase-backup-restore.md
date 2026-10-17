# Respaldo y restauración de Supabase

## Alcance

El plan Free no ofrece los respaldos automáticos diarios de los planes Pro, Team y Enterprise. Mantén exportaciones lógicas periódicas fuera del repositorio. La base de datos y los bytes de Storage son respaldos distintos: un dump de PostgreSQL no contiene los archivos almacenados en el proveedor de objetos.

Este procedimiento crea copias privadas del proyecto; los dumps pueden contener correos, usuarios de Auth, información de empresas y publicaciones privadas. No lo ejecutes hasta tener autorización para exportar producción y acceso a las credenciales mediante una sesión segura. No pongas contraseñas, tokens ni URLs con contraseña en scripts, historial de shell, Git o reportes.

## Preparación

1. Inicia sesión con Supabase CLI y confirma el proyecto vinculado en el Dashboard antes de exportar.
2. Elige un directorio fuera del repositorio, en un disco cifrado o un destino de backup cifrado.
3. Ejecuta `umask 077` antes de crear el directorio. Conserva los archivos con permisos solo para la cuenta que hace el respaldo y cifra una copia fuera del equipo.
4. Registra la fecha, el proyecto, las versiones de PostgreSQL/CLI, las tablas clave y los buckets, sin registrar credenciales.

## Base de datos

Usa el CLI oficial para que aplique sus filtros de objetos administrados por Supabase. `db dump` solo lee el origen. Ejecuta cada comando desde el repositorio vinculado y responde a los prompts de credenciales directamente en la terminal:

```sh
umask 077
backup_dir="$HOME/.local/share/matchwork-backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir/database"

supabase db dump --linked --role-only --file "$backup_dir/database/roles.sql"
supabase db dump --linked --file "$backup_dir/database/schema.sql"
supabase db dump --linked --data-only --use-copy \
  -x storage.buckets_vectors -x storage.vector_indexes \
  --file "$backup_dir/database/data.sql"
sha256sum "$backup_dir"/database/*.sql > "$backup_dir/database/SHA256SUMS"
```

La exportación oficial incluye esquema, funciones, triggers, permisos, datos de Auth (`auth.users`) y datos de las tablas; roles personalizados no conservan sus contraseñas y deben configurarse de nuevo al restaurar. Si se necesita preservar el historial de migraciones en una restauración a un proyecto nuevo, exporta `supabase_migrations` por separado; nunca copies ese historial a producción para marcar migraciones como aplicadas.

Guarda también un manifiesto de conteos de tablas clave, generado por consultas `SELECT` de solo lectura antes del dump. Como mínimo registra `auth.users`, `public.app_users`, `public.company_profiles`, `public.business_problems`, `public.profiles`, `public.freelancer_profiles`, `public.portfolio_projects` y `public.portfolio_media`. No guardes ese manifiesto en Git.

## Archivos de Storage

1. Anota todos los buckets y sus ajustes (`public`, límites de tamaño y MIME) desde Storage en el Dashboard. No des por hecho que los únicos buckets remotos son los creados por las migraciones locales.
2. Habilita el protocolo S3 de Supabase y genera un par de acceso dedicado para la operación. Consérvalo en un perfil local de AWS con permisos mínimos y fuera del repositorio.
3. Sincroniza los objetos de cada bucket a su propio directorio local:

```sh
storage_endpoint="https://<project-ref>.supabase.co/storage/v1/s3"
aws s3 sync "s3://<bucket>" "$backup_dir/storage/<bucket>" \
  --endpoint-url "$storage_endpoint" --profile matchwork-backup --no-progress
```

Repite el comando para cada bucket, incluido `portfolio-media`. Genera un manifiesto SHA-256 de los archivos descargados y compara cantidades y bytes por bucket con los listados del origen. El ETag de S3 no siempre equivale a MD5, por lo que no lo uses como única verificación. Cifra los directorios de Storage y SQL antes de copiarlos fuera del equipo.

No exportes `storage.objects` para reinsertarlo por SQL: las filas son metadatos administrados por Storage y no contienen los bytes. Para restaurar, crea primero los buckets con la misma visibilidad y límites en un proyecto de recuperación y carga los objetos mediante la API de Storage o S3. Mantén privado `portfolio-media`.

## Ensayo de restauración

Restaura siempre primero en un proyecto de recuperación vacío, nunca sobre producción. Con credenciales del destino introducidas de manera segura en el prompt de `psql`, la restauración lógica sigue el orden de roles, esquema y datos:

```sh
psql --password --dbname "$RESTORE_DB_URL" \
  --single-transaction --set ON_ERROR_STOP=1 \
  --file "$backup_dir/database/roles.sql" \
  --file "$backup_dir/database/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$backup_dir/database/data.sql"
```

`RESTORE_DB_URL` debe apuntar a una base vacía de recuperación y no llevar la contraseña embebida. Primero valida los hashes con `sha256sum -c`, y después comprueba en el destino los conteos del manifiesto, objetos de esquema, extensiones, índices, constraints, triggers y políticas RLS. Recrea las configuraciones de buckets y carga los bytes por la API; compara el número y SHA-256 de objetos. Prueba que un borrador no se puede descargar como `anon`, que el dueño autenticado sí puede leerlo y que una fotografía publicada solo se sirve por las rutas que autoriza RLS.

El ensayo debe terminar sin errores y quedar documentado antes de considerar la copia recuperable. La exportación/restauración de producción y la descarga de objetos requieren autorización explícita; este documento no las ejecuta.

## Referencias

- [Respaldos de base de datos de Supabase](https://supabase.com/docs/guides/platform/backups)
- [Backup y restore con Supabase CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Descarga de objetos de Storage](https://supabase.com/docs/guides/storage/management/download-objects)
- [Buckets privados de Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals)
