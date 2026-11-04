#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! "$1" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
  printf 'Uso: DB_URL=... %s <uuid-del-usuario>\n' "$0" >&2
  exit 2
fi
if [[ -z "${DB_URL:-}" ]]; then
  printf 'Falta la variable DB_URL de la base de datos.\n' >&2
  exit 2
fi
psql "$DB_URL" -X -v ON_ERROR_STOP=1 -v "uid=$1" <<'SQL'
insert into public.admins (user_id) values (:'uid'::uuid) on conflict (user_id) do nothing;
SQL
