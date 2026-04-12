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
GDRIVE_CARPETA="gdrive:EM Financiera"
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
  echo "[$FECHA] ✓ Backup local exitoso: financiera_$FECHA.sql.gz ($TAMANIO)" >> "$LOG_FILE"
else
  echo "[$FECHA] ERROR: Falló el pg_dump." >> "$LOG_FILE"
  rm -f "$ARCHIVO"
  exit 1
fi

# ── Subir a Google Drive ────────────────────────
if command -v rclone &> /dev/null; then
  if rclone copy "$ARCHIVO" "$GDRIVE_CARPETA" --quiet 2>> "$LOG_FILE"; then
    echo "[$FECHA] ☁  Subido a Google Drive: $GDRIVE_CARPETA" >> "$LOG_FILE"

    # Eliminar backups viejos también de Drive (más de 30 días)
    rclone delete "$GDRIVE_CARPETA" \
      --min-age "${RETENER_DIAS}d" \
      --include "financiera_*.sql.gz" \
      --quiet 2>> "$LOG_FILE" || true

  else
    echo "[$FECHA] ⚠ No se pudo subir a Google Drive (el backup local sí quedó guardado)." >> "$LOG_FILE"
  fi
else
  echo "[$FECHA] ⚠ rclone no instalado — backup solo guardado localmente." >> "$LOG_FILE"
fi

# ── Eliminar backups locales viejos (más de 30 días) ──
ELIMINADOS=$(find "$BACKUP_DIR" -name "financiera_*.sql.gz" \
  -mtime +$RETENER_DIAS -print -delete | wc -l)

if [ "$ELIMINADOS" -gt 0 ]; then
  echo "[$FECHA] 🗑  Se eliminaron $ELIMINADOS backup(s) local(es) viejos (+${RETENER_DIAS} días)." >> "$LOG_FILE"
fi

# ── Resumen final ───────────────────────────────
TOTAL_LOCAL=$(find "$BACKUP_DIR" -name "financiera_*.sql.gz" | wc -l)
echo "[$FECHA] Backups locales almacenados: $TOTAL_LOCAL" >> "$LOG_FILE"
echo "[$FECHA] Backup completado." >> "$LOG_FILE"

exit 0
