#!/usr/bin/env bash
# Comprueba que cada servicio está sano y que la web y la API responden por HTTPS (con la compresión activa).
# Sale con error si algo falla. Uso: scripts/healthcheck.sh
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[[ -f .env ]] || { echo "Falta .env" >&2; exit 1; }
set -a; source .env; set +a

fail=0
ok() { printf 'OK    %s\n' "$1"; }
bad() { printf 'FALLA %s\n' "$1"; fail=1; }

for svc in db auth storage kong web; do
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    health="$(docker compose ps "$svc" --format '{{.Health}}' 2>/dev/null)"
    [[ "$health" == "healthy" ]] && break
    sleep 5
  done
  [[ "$health" == "healthy" ]] && ok "contenedor $svc sano" || bad "contenedor $svc: ${health:-no está en marcha}"
done
for svc in rest realtime templates; do
  state="$(docker compose ps "$svc" --format '{{.State}}' 2>/dev/null)"
  [[ "$state" == "running" ]] && ok "contenedor $svc en marcha" || bad "contenedor $svc: ${state:-no está en marcha}"
done

curl_opts=(-sk --max-time 10 --resolve "$WEB_HOST:${HTTPS_PORT}:127.0.0.1" --resolve "$API_HOST:${HTTPS_PORT}:127.0.0.1")
if [[ "$WEB_HOST" != *.localhost ]]; then curl_opts=(-s --max-time 10); fi
code="$(curl "${curl_opts[@]}" -o /dev/null -w '%{http_code}' -H 'Accept-Encoding: br' "$SITE_URL/")"
[[ "$code" == "200" ]] && ok "web responde 200" || bad "web respondió $code"
enc="$(curl "${curl_opts[@]}" -o /dev/null -D - -H 'Accept-Encoding: br' "$SITE_URL/" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-encoding"{print $2}')"
[[ "$enc" == "br" ]] && ok "la web llega comprimida con brotli" || bad "sin brotli (content-encoding: ${enc:-ninguno})"
code="$(curl "${curl_opts[@]}" -o /dev/null -w '%{http_code}' -H "apikey: $ANON_KEY" "$API_URL/auth/v1/health")"
[[ "$code" == "200" ]] && ok "Auth responde 200 a través de Kong" || bad "Auth respondió $code"
code="$(curl "${curl_opts[@]}" -o /dev/null -w '%{http_code}' -H "apikey: $ANON_KEY" -X POST -H 'Content-Type: application/json' -d '{}' "$API_URL/rest/v1/rpc/get_public_counters")"
[[ "$code" == "200" ]] && ok "REST responde 200 (get_public_counters)" || bad "REST respondió $code"
code="$(curl "${curl_opts[@]}" -o /dev/null -w '%{http_code}' "$API_URL/rest/v1/")"
[[ "$code" == "401" ]] && ok "la API rechaza peticiones sin clave (401)" || bad "la API sin clave respondió $code (se esperaba 401)"
code="$(curl "${curl_opts[@]}" -o /dev/null -w '%{http_code}' -H "apikey: $ANON_KEY" "$API_URL/storage/v1/bucket")"
[[ "$code" =~ ^(200|400|401)$ ]] && ok "Storage responde a través de Kong ($code)" || bad "Storage respondió $code"
pub="$(docker compose exec -T db psql -U postgres -d postgres -At -c "select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages'" 2>/dev/null)"
[[ "$pub" == "1" ]] && ok "Realtime publica la tabla de mensajes" || bad "Realtime no publica la tabla de mensajes (el chat no actualizaría en vivo)"
port_pg="$(docker compose port db 5432 2>/dev/null || true)"
[[ -z "$port_pg" || "$port_pg" == ":0" ]] && ok "Postgres no tiene ningún puerto publicado en el equipo" || bad "Postgres publica un puerto: $port_pg"

(( fail )) && { echo "Hay comprobaciones que fallan."; exit 1; }
echo "Todo en orden."
