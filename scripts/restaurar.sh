#!/bin/bash
# =============================================
# EM Financiera — Restaurar backup
# Uso: ./restaurar.sh financiera_2026-04-12_03-00.sql.gz
# =============================================

set -euo pipefail

DB_CONTAINER="postgres_n8n"
DB_NAME="financiera"
DB_USER="financiera_user"
BACKUP_DIR="/opt/financiera/backups"

# ── Verificar argumento ─────────────────────────
if [ -z "${1:-}" ]; then
  echo ""
  echo "Uso: $0 <archivo_backup>"
  echo ""
  echo "Backups disponibles:"
  ls -lh "$BACKUP_DIR"/financiera_*.sql.gz 2>/dev/null | \
    awk '{print "  " $NF "  (" $5 ")"}'
  echo ""
  exit 1
fi

ARCHIVO="$BACKUP_DIR/$1"

if [ ! -f "$ARCHIVO" ]; then
  # Probar si pasaron la ruta completa
  if [ -f "$1" ]; then
    ARCHIVO="$1"
  else
    echo "ERROR: No se encontró el archivo: $ARCHIVO"
    exit 1
  fi
fi

echo ""
echo "⚠️  ATENCIÓN: Esto va a reemplazar TODA la base de datos '$DB_NAME'."
echo "   Archivo a restaurar: $ARCHIVO"
echo ""
read -p "   ¿Confirmar restauración? (escribir SI): " CONFIRMACION

if [ "$CONFIRMACION" != "SI" ]; then
  echo "Restauración cancelada."
  exit 0
fi

echo ""
echo "Restaurando..."

# Descomprimir y restaurar
gunzip -c "$ARCHIVO" | docker exec -i "$DB_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" \
  --quiet --set ON_ERROR_STOP=0 2>&1

echo ""
echo "✓ Restauración completada desde: $ARCHIVO"
echo "  Reiniciando backend..."

cd /opt/financiera && docker-compose restart backend 2>/dev/null || true

echo "✓ Listo."
