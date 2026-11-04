#!/usr/bin/env bash
# Runs MatchWork's local Supabase on alternative ports (55421-55429) from a throwaway copy of ./supabase,
# so it can coexist with another local Supabase project that already uses the default ports (54321-54329).
# Usage: supabase/scripts/local-stack.sh start|stop|reset|test|status
# MATCHWORK_STACK_FULL=1 también levanta Storage y el buzón de correo (Mailpit en 55424, SMTP 55425) y activa la
# confirmación de correo, como en producción. Sin ella se omiten (más rápido; las confirmaciones quedan apagadas).
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
work="${MATCHWORK_STACK_DIR:-${TMPDIR:-/tmp}/matchwork-supabase-stack}"
cli=(npx --yes supabase@3.0.0)
full="${MATCHWORK_STACK_FULL:-0}"
if [ "$full" = "1" ]; then exclude="studio,imgproxy,logflare,vector,edge-runtime"; else exclude="studio,imgproxy,logflare,vector,edge-runtime,storage-api,mailpit"; fi

sync_workdir() {
  rm -rf "$work/supabase/migrations" "$work/supabase/tests"
  mkdir -p "$work/supabase"
  cp -R "$root/supabase/migrations" "$root/supabase/tests" "$work/supabase/"
  cp "$root/supabase/config.toml" "$work/supabase/config.toml"
  # Se copia sobre la carpeta existente (no se borra): Kong la monta y un directorio nuevo dejaría el montaje vacío.
  mkdir -p "$work/supabase/templates"; cp -R "$root/supabase/templates/." "$work/supabase/templates/"
  python3 - "$work/supabase/config.toml" <<'PY'
import os, sys
path = sys.argv[1]
text = open(path).read()
text = text.replace("[db]\nmajor_version = 17", (
    "[api]\nport = 55421\n\n[db]\nport = 55422\nshadow_port = 55420\nmajor_version = 17\n\n"
    "[db.pooler]\nport = 55429\n\n[studio]\nport = 55423\n\n[analytics]\nport = 55427\n"))
text += "\n[local_smtp]\nenabled = true\nport = 55424\nsmtp_port = 55425\npop3_port = 55426\n"
if os.environ.get("MATCHWORK_STACK_FULL") == "1":
    text = text.replace("enable_confirmations = false", "enable_confirmations = true")
open(path, "w").write(text)
PY
}

case "${1:-}" in
  start)
    sync_workdir
    "${cli[@]}" start --workdir "$work" -x "$exclude"
    echo "API: http://127.0.0.1:55421  DB: postgresql://postgres:postgres@127.0.0.1:55422/postgres"
    echo "Realtime needs ~30 s after start before subscriptions receive events." ;;
  stop)   "${cli[@]}" stop --workdir "$work" ;;
  reset)  sync_workdir; "${cli[@]}" db reset --workdir "$work" ;;
  test)   sync_workdir; "${cli[@]}" test db --workdir "$work" ;;
  status) "${cli[@]}" status --workdir "$work" ;;
  *) echo "Uso: $0 start|stop|reset|test|status" >&2; exit 2 ;;
esac
