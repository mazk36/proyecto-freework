#!/usr/bin/env bash
# Mide Content-Encoding, tamaño transferido y versión HTTP de las rutas principales.
# Uso: infra/vps/medir-compresion.sh [https://localhost:8443]
set -euo pipefail
BASE="${1:-https://localhost:8443}"
RUTAS=(/ /registro/ /iniciar-sesion/)
CODIFICACIONES=(identity gzip zstd br)

printf '%-12s %-9s %-9s %-9s %s\n' ruta codif. bytes http content-encoding
for ruta in "${RUTAS[@]}"; do
  for ae in "${CODIFICACIONES[@]}"; do
    salida=$(curl -sk -H "Accept-Encoding: $ae" -o /dev/null -D - -w 'BYTES=%{size_download} HTTP=%{http_version} CODE=%{http_code}\n' "$BASE$ruta")
    enc=$(printf '%s' "$salida" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-encoding"{print $2}')
    bytes=$(printf '%s' "$salida" | sed -n 's/.*BYTES=\([0-9]*\).*/\1/p')
    http=$(printf '%s' "$salida" | sed -n 's/.*HTTP=\([0-9.]*\).*/\1/p')
    code=$(printf '%s' "$salida" | sed -n 's/.*CODE=\([0-9]*\).*/\1/p')
    printf '%-12s %-9s %-9s %-9s %s (%s)\n' "$ruta" "$ae" "$bytes" "$http" "${enc:-ninguna}" "$code"
  done
done
