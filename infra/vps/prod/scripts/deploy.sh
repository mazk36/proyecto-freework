#!/usr/bin/env bash
# Despliegue completo e idempotente: genera la configuración de Kong, construye la web, levanta la pila,
# espera a que los servicios estén sanos, aplica las migraciones y comprueba todo.
# Uso: scripts/deploy.sh [--sin-build]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[[ -f .env ]] || { echo "Falta .env: ejecuta scripts/generate-secrets.sh y revisa los dominios." >&2; exit 1; }

profiles=()
if grep -q '^SMTP_HOST=mailpit$' .env; then profiles=(--profile mailpit); fi

scripts/render.sh
if [[ "${1:-}" != "--sin-build" ]]; then docker compose "${profiles[@]}" build web; fi

# La base primero: las migraciones de la aplicación necesitan que Auth y Storage hayan creado sus esquemas.
docker compose "${profiles[@]}" up -d db
echo "Esperando a Postgres…"
until [[ "$(docker compose ps db --format '{{.Health}}')" == "healthy" ]]; do sleep 2; done

docker compose "${profiles[@]}" up -d auth storage rest realtime templates
echo "Esperando a Auth y Storage (crean sus tablas)…"
until [[ "$(docker compose ps auth --format '{{.Health}}')" == "healthy" && "$(docker compose ps storage --format '{{.Health}}')" == "healthy" ]]; do sleep 3; done

scripts/migrate.sh

docker compose "${profiles[@]}" up -d
# PostgREST guarda en caché el esquema: se avisa tras migrar para que vea funciones y tablas nuevas.
docker compose kill -s SIGUSR1 rest >/dev/null 2>&1 || true
scripts/healthcheck.sh
