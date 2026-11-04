#!/usr/bin/env bash
# Genera .generated/kong.yml a partir de la plantilla y las claves de .env (sin imprimirlas).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[[ -f .env ]] || { echo "Falta .env: ejecuta scripts/generate-secrets.sh" >&2; exit 1; }
mkdir -p .generated
python3 - <<'PY'
import os, re
env = {}
for line in open(".env"):
    line = line.rstrip("\n")
    if line and not line.startswith("#") and "=" in line:
        key, value = line.split("=", 1)
        env[key] = value
for needed in ("ANON_KEY", "SERVICE_ROLE_KEY"):
    if not env.get(needed):
        raise SystemExit(f"Falta {needed} en .env")
text = open("kong/kong.yml.tpl").read()
text = re.sub(r"\$\{(\w+)\}", lambda m: env[m.group(1)], text)
with open(".generated/kong.yml", "w") as handle:
    handle.write(text)
os.chmod(".generated/kong.yml", 0o600)
PY
echo "Generado .generated/kong.yml"
