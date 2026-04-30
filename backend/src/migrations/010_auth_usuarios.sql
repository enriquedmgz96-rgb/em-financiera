-- Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id               SERIAL PRIMARY KEY,
  username         VARCHAR(50)  NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  nombre_completo  VARCHAR(100),
  activo           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Registrar quién creó cada préstamo
ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS creado_por_id      INTEGER REFERENCES usuarios(id);
ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS creado_por_nombre  VARCHAR(50);

-- Registrar quién registró cada pago
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS creado_por_id      INTEGER REFERENCES usuarios(id);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS creado_por_nombre  VARCHAR(50);
