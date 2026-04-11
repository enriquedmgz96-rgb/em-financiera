#!/bin/bash
# Ejecutar UNA VEZ en el VPS para crear el usuario y la base de datos financiera
set -e

CONTAINER="${POSTGRES_CONTAINER:-postgres}"
DB_NAME="financiera"
DB_USER="financiera_user"
DB_PASSWORD="${DB_PASSWORD:-cambiar_en_produccion}"

echo "Creando usuario y base de datos en contenedor: $CONTAINER"

docker exec -i "$CONTAINER" psql -U postgres <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

echo "Base de datos '$DB_NAME' y usuario '$DB_USER' listos."
echo ""
echo "Siguiente paso: ejecutar migraciones:"
echo "  docker exec financiera-backend node src/db/migrate.js"
