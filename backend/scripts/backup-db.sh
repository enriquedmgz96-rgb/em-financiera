#!/bin/bash
# Backup diario de la base de datos financiera
# Configurar en crontab: 0 3 * * * bash /opt/financiera/backend/scripts/backup-db.sh
set -e

CONTAINER="${POSTGRES_CONTAINER:-postgres}"
DB_NAME="financiera"
DB_USER="${DB_USER:-financiera_user}"
BACKUP_DIR="${BACKUP_DIR:-/opt/financiera/backups}"
FECHA=$(TZ="America/Argentina/Cordoba" date +%Y%m%d_%H%M)
ARCHIVO="${BACKUP_DIR}/financiera_${FECHA}.sql.gz"

mkdir -p "$BACKUP_DIR"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$ARCHIVO"
echo "Backup guardado: $ARCHIVO ($(du -sh "$ARCHIVO" | cut -f1))"

# Eliminar backups con más de 30 días
find "$BACKUP_DIR" -name "financiera_*.sql.gz" -mtime +30 -delete
echo "Backups antiguos eliminados."
