#!/usr/bin/env bash
# Restaura una copia sobre la pila: detiene los servicios que usan la base, restaura la base (y los archivos de Storage si se
# indica) y vuelve a levantarlo todo. DESTRUCTIVO: reemplaza los datos actuales.
# Uso: scripts/restore.sh <matchwork-db-….dump> [<matchwork-storage-….tar.gz>] [--si]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
dump="${1:?Indica el archivo .dump}"; shift
files=""; confirm=""
for arg in "$@"; do case "$arg" in --si) confirm=1 ;; *) files="$arg" ;; esac; done
[[ -f "$dump" ]] || { echo "No existe $dump" >&2; exit 1; }
if [[ -z "$confirm" ]]; then
  echo "Esto REEMPLAZA los datos actuales por los de $dump. Repite el comando con --si para confirmar." >&2
  exit 2
fi
profiles=()
if grep -q '^SMTP_HOST=mailpit$' .env; then profiles=(--profile mailpit); fi

docker compose stop web kong auth rest realtime storage >/dev/null
docker compose up -d db
until [[ "$(docker compose ps db --format '{{.Health}}')" == "healthy" ]]; do sleep 2; done

# Se cierran las conexiones que queden y se restaura sobre los esquemas existentes.
docker compose exec -T db psql -U postgres -d postgres -X -q -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = 'postgres' and pid <> pg_backend_pid() and usename <> 'supabase_admin' and usename not like 'supabase_%_admin'" >/dev/null
docker compose exec -T db pg_restore -U supabase_admin -d postgres --clean --if-exists < "$dump" 2>restore.log \
  || { echo "pg_restore terminó con avisos; revisa restore.log (si solo hablan de extensiones o roles ya existentes son inofensivos)"; }

# pg_restore recrea el esquema public y pierde el permiso de uso de los roles de la API (sin él PostgREST responde 401).
docker compose exec -T db psql -U supabase_admin -d postgres -X -q -c "grant usage on schema public to anon, authenticated, service_role" >/dev/null
# Al recrear la tabla de mensajes también sale de la publicación de Realtime (sin ella el chat no se actualiza en vivo).
docker compose exec -T db psql -U supabase_admin -d postgres -X -q -c "do \$\$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then alter publication supabase_realtime add table public.messages; end if; end \$\$" >/dev/null

if [[ -n "$files" ]]; then
  [[ -f "$files" ]] || { echo "No existe $files" >&2; exit 1; }
  docker compose up -d storage
  docker compose exec -T storage sh -c 'rm -rf /var/lib/storage/* && tar -C /var/lib/storage -xzf -' < "$files"
fi

# Las funciones y tablas de la aplicación vienen en la copia; migrate solo aplica lo que falte.
docker compose "${profiles[@]}" up -d db auth storage rest realtime templates
until [[ "$(docker compose ps auth --format '{{.Health}}')" == "healthy" ]]; do sleep 3; done
scripts/migrate.sh
docker compose "${profiles[@]}" up -d
docker compose kill -s SIGUSR1 rest >/dev/null 2>&1 || true
scripts/healthcheck.sh
