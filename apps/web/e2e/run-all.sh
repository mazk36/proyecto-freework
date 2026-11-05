#!/usr/bin/env bash
# Corre toda la batería e2e en orden y resume qué pasó. Requiere el stack de Supabase, el export servido y E2E_PSQL
# (o las variables de «Contra la pila de producción» de e2e/README.md). Salta captcha.mjs (necesita configuración
# especial) y lighthouse.mjs salvo que exista LIGHTHOUSE_DIR.
# Uso: E2E_PSQL=/opt/homebrew/opt/libpq/bin/psql e2e/run-all.sh
set -uo pipefail
cd "$(dirname "$0")/.."

suites=(journey security security-final security-web email-cycle account mail-storage realtime-fallback engines paging perf ui-matrix a11y)
[ -n "${LIGHTHOUSE_DIR:-}" ] && suites+=(lighthouse)

failed=()
for suite in "${suites[@]}"; do
  echo "=== $suite ==="
  if node "e2e/$suite.mjs"; then echo "--- $suite: OK"; else echo "--- $suite: FALLÓ"; failed+=("$suite"); fi
done

echo
if [ ${#failed[@]} -eq 0 ]; then echo "Batería completa en verde (${#suites[@]} guiones)."; else echo "Fallaron: ${failed[*]}"; exit 1; fi
