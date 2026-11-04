#!/usr/bin/env bash
# Crea infra/vps/prod/.env con claves NUEVAS (nunca las de desarrollo). El .env no se sube a git.
# Uso: scripts/generate-secrets.sh [--force]
#   Sin --force no pisa un .env existente (rotar claves cambia sesiones y contraseñas: ver docs/ops/manual-de-operacion.md).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ -f .env && "${1:-}" != "--force" ]]; then
  echo "Ya existe .env; no se toca. Usa --force solo si quieres claves nuevas (cierra todas las sesiones y exige recrear la base)." >&2
  exit 1
fi

hex() { openssl rand -hex "$1"; }
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

JWT_SECRET="$(hex 32)"          # 64 caracteres
POSTGRES_PASSWORD="$(hex 24)"
SECRET_KEY_BASE="$(hex 48)"     # 96 caracteres
REALTIME_DB_ENC_KEY="$(hex 8)"  # 16 caracteres exactos (clave AES de Realtime)

# JWT HS256 de larga vida para los roles anon y service_role (los que Kong y las librerías esperan).
sign_jwt() {
  local role="$1" header payload sig
  header="$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)"
  payload="$(printf '{"role":"%s","iss":"matchwork","iat":%s,"exp":%s}' "$role" "$(date +%s)" "$(( $(date +%s) + 315360000 ))" | b64url)"
  sig="$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64url)"
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}
ANON_KEY="$(sign_jwt anon)"
SERVICE_ROLE_KEY="$(sign_jwt service_role)"

umask 077
cp .env.example .env
set_var() { # set_var NOMBRE VALOR
  python3 - "$1" "$2" <<'PY'
import re, sys
name, value = sys.argv[1], sys.argv[2]
text = open(".env").read()
text = re.sub(rf"^{name}=.*$", lambda _m: f"{name}={value}", text, flags=re.M)
open(".env", "w").write(text)
PY
}
set_var POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
set_var JWT_SECRET "$JWT_SECRET"
set_var ANON_KEY "$ANON_KEY"
set_var SERVICE_ROLE_KEY "$SERVICE_ROLE_KEY"
set_var SECRET_KEY_BASE "$SECRET_KEY_BASE"
set_var REALTIME_DB_ENC_KEY "$REALTIME_DB_ENC_KEY"
chmod 600 .env
echo "Listo: .env creado con claves nuevas (permisos 600). Guarda una copia en tu gestor de claves; no la pegues en chats ni en git."
echo "Siguiente: edita los dominios y el correo en .env y ejecuta scripts/deploy.sh"
