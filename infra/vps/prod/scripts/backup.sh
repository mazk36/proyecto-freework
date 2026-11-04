#!/usr/bin/env bash
# Copia de seguridad: pg_dump de la base (esquemas public, auth y storage) + archivos de Storage, con rotación
# (BACKUP_KEEP_DAILY diarias y BACKUP_KEEP_WEEKLY semanales) y subida opcional a un destino S3-compatible.
# Uso: scripts/backup.sh   (pensado para cron: 0 3 * * * /ruta/infra/vps/prod/scripts/backup.sh)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
set -a; source .env; set +a
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAILY="${BACKUP_KEEP_DAILY:-14}"
KEEP_WEEKLY="${BACKUP_KEEP_WEEKLY:-8}"
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"
stamp="$(date +%F-%H%M)"

dump="$BACKUP_DIR/daily/matchwork-db-$stamp.dump"
docker compose exec -T db pg_dump -U supabase_admin -d postgres -Fc -n public -n auth -n storage > "$dump"
files="$BACKUP_DIR/daily/matchwork-storage-$stamp.tar.gz"
docker compose exec -T storage tar -C /var/lib/storage -czf - . > "$files"
# Comprobación mínima: el volcado se puede leer.
docker compose exec -T db pg_restore --list < "$dump" >/dev/null
echo "Copia creada: $dump ($(du -h "$dump" | cut -f1)) y $files ($(du -h "$files" | cut -f1))"

# El domingo, además, queda una copia semanal.
if [[ "$(date +%u)" == "7" ]]; then cp "$dump" "$files" "$BACKUP_DIR/weekly/"; fi

# Rotación: se conservan las últimas N de cada tipo.
rotate() { # rotate DIRECTORIO PATRÓN CONSERVAR
  ls -1t "$1"/$2 2>/dev/null | tail -n +"$(( $3 + 1 ))" | while read -r old; do rm -f -- "$old"; done
}
for pattern in 'matchwork-db-*.dump' 'matchwork-storage-*.tar.gz'; do
  rotate "$BACKUP_DIR/daily" "$pattern" "$KEEP_DAILY"
  rotate "$BACKUP_DIR/weekly" "$pattern" "$KEEP_WEEKLY"
done

if [[ -n "${BACKUP_S3_URL:-}" ]]; then
  if command -v aws >/dev/null; then
    endpoint=(); [[ -n "${BACKUP_S3_ENDPOINT:-}" ]] && endpoint=(--endpoint-url "$BACKUP_S3_ENDPOINT")
    aws "${endpoint[@]}" s3 cp "$dump" "$BACKUP_S3_URL/" --only-show-errors
    aws "${endpoint[@]}" s3 cp "$files" "$BACKUP_S3_URL/" --only-show-errors
    echo "Subida a $BACKUP_S3_URL completada."
  else
    echo "AVISO: BACKUP_S3_URL está definido pero no hay CLI de AWS; la copia quedó solo en $BACKUP_DIR." >&2
  fi
fi
