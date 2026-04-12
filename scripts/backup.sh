#!/bin/bash
# =============================================
# EM Financiera — Backup automático de base de datos
# Cron recomendado: 0 3 * * * /opt/financiera/scripts/backup.sh
# =============================================

set -euo pipefail

# ── Configuración ──────────────────────────────
DB_CONTAINER="postgres_n8n"
DB_NAME="financiera"
DB_USER="financiera_user"

BACKUP_DIR="/opt/financiera/backups"
LOG_FILE="/opt/financiera/backups/backup.log"
RETENER_DIAS=30
FECHA=$(date '+%Y-%m-%d_%H-%M')
ARCHIVO="$BACKUP_DIR/financiera_$FECHA.sql.gz"

# ── Crear carpeta si no existe ──────────────────
mkdir -p "$BACKUP_DIR"

echo "────────────────────────────────────────" >> "$LOG_FILE"
echo "[$FECHA] Iniciando backup..." >> "$LOG_FILE"

# ── Verificar que el contenedor está corriendo ──
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "[$FECHA] ERROR: El contenedor $DB_CONTAINER no está corriendo." >> "$LOG_FILE"
  exit 1
fi

# ── Hacer el dump y comprimir ───────────────────
if docker exec "$DB_CONTAINER" \
    pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$ARCHIVO"; then

  TAMANIO=$(du -sh "$ARCHIVO" | cut -f1)
  echo "[$FECHA] ✓ Backup exitoso: $ARCHIVO ($TAMANIO)" >> "$LOG_FILE"
else
  echo "[$FECHA] ERROR: Falló el pg_dump." >> "$LOG_FILE"
  rm -f "$ARCHIVO"
  exit 1
fi

# ── Eliminar backups viejos (más de 30 días) ────
ELIMINADOS=$(find "$BACKUP_DIR" -name "financiera_*.sql.gz" \
  -mtime +$RETENER_DIAS -print -delete | wc -l)

if [ "$ELIMINADOS" -gt 0 ]; then
  echo "[$FECHA] 🗑  Se eliminaron $ELIMINADOS backup(s) viejos (+${RETENER_DIAS} días)." >> "$LOG_FILE"
fi

# ── Resumen de backups actuales ─────────────────
TOTAL=$(find "$BACKUP_DIR" -name "financiera_*.sql.gz" | wc -l)
echo "[$FECHA] Total backups almacenados: $TOTAL" >> "$LOG_FILE"

exit 0
