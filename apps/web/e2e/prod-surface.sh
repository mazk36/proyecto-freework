#!/usr/bin/env bash
# Revisión de la superficie expuesta de la pila de producción local: puertos publicados, rutas de Kong accesibles,
# cabeceras de seguridad y valores de Auth. Requiere la pila levantada (infra/vps/prod/scripts/deploy.sh).
set -uo pipefail
cd "$(dirname "$0")/../../../infra/vps/prod"
set -a
. ./.env
set +a

echo "== Puertos publicados en el equipo"
docker ps --format '{{.Names}} {{.Ports}}' | grep matchwork-prod || true

echo "== Auth: autoconfirmación, registro, captcha"
docker exec matchwork-prod-auth-1 env 2>/dev/null | grep -E "AUTOCONFIRM|DISABLE_SIGNUP|EXTERNAL_(GOOGLE|EMAIL)_ENABLED|SECURITY_CAPTCHA_ENABLED" || true

echo "== Rutas por $API_URL (sin clave / con clave anónima)"
for p in /pg/ /pg-meta/ /studio/ /analytics/ /functions/v1/ /graphql/v1 /rest/v1/ /auth/v1/admin/users /auth/v1/settings /storage/v1/bucket /realtime/v1/api/ /; do
  sin=$(curl -sk -o /dev/null -w "%{http_code}" "$API_URL$p")
  con=$(curl -sk -o /dev/null -w "%{http_code}" -H "apikey: $ANON_KEY" "$API_URL$p")
  printf "%-26s sin-clave:%s  con-clave:%s\n" "$p" "$sin" "$con"
done

echo "== Cabeceras de la web ($SITE_URL)"
curl -skI "$SITE_URL/" | grep -iE "strict-transport|x-content-type|x-frame|referrer|permissions|content-security|cross-origin|^server|x-powered" || true

echo "== Cabeceras de la API"
curl -skI -H "apikey: $ANON_KEY" "$API_URL/rest/v1/" | grep -iE "strict-transport|x-content-type|referrer|^server|access-control" || true

echo "== CORS: origen ajeno contra la API"
curl -sk -o /dev/null -D - -X OPTIONS -H "Origin: https://evil.example" -H "Access-Control-Request-Method: GET" -H "apikey: $ANON_KEY" "$API_URL/rest/v1/" | grep -iE "^HTTP|access-control" || true

echo "== OpenAPI anónimo de PostgREST (lista de tablas y funciones)"
curl -sk -H "apikey: $ANON_KEY" "$API_URL/rest/v1/" | head -c 300
echo
