#!/usr/bin/env bash
# Aplica supabase/migrations en orden y de forma idempotente: cada archivo corre una sola vez, en una transacción,
# y queda registrado en matchwork_ops.applied_migrations. Volver a ejecutarlo no repite nada.
# Uso: scripts/migrate.sh [--dry-run]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
MIGRATIONS_DIR="${MIGRATIONS_DIR:-../../../supabase/migrations}"
dry_run=0; [[ "${1:-}" == "--dry-run" ]] && dry_run=1

psql_db() { docker compose exec -T -e PGOPTIONS="-c client_min_messages=warning" db psql -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 "$@"; }

psql_db -c "create schema if not exists matchwork_ops;
create table if not exists matchwork_ops.applied_migrations (name text primary key, applied_at timestamptz not null default now());" >/dev/null

applied=0; skipped=0
for file in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  name="$(basename "$file")"
  done_already="$(psql_db -At -c "select 1 from matchwork_ops.applied_migrations where name = '$name'")"
  if [[ -n "$done_already" ]]; then skipped=$((skipped + 1)); continue; fi
  if (( dry_run )); then echo "pendiente: $name"; continue; fi
  echo "aplicando: $name"
  { echo "begin;"; cat "$file"; echo; echo "insert into matchwork_ops.applied_migrations (name) values ('$name');"; echo "commit;"; } | psql_db >/dev/null
  applied=$((applied + 1))
done
echo "Migraciones: $applied aplicadas, $skipped ya estaban."
