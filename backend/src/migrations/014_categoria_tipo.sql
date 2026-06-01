-- Distinguir categorías de tasa por tipo:
--   prestamo  → lo que se le cobra al cliente
--   captacion → lo que se le paga al inversor
-- Las categorías existentes quedan como 'prestamo' (default).

-- Defensivo: asegurar la columna periodicidad (existe en prod por un cambio
-- fuera de migraciones; esto la deja consistente en cualquier entorno).
ALTER TABLE categorias_tasa ADD COLUMN IF NOT EXISTS periodicidad VARCHAR(10) NOT NULL DEFAULT 'mensual';

ALTER TABLE categorias_tasa ADD COLUMN IF NOT EXISTS tipo VARCHAR(12) NOT NULL DEFAULT 'prestamo';
ALTER TABLE categorias_tasa DROP CONSTRAINT IF EXISTS categorias_tasa_tipo_check;
ALTER TABLE categorias_tasa ADD CONSTRAINT categorias_tasa_tipo_check CHECK (tipo IN ('prestamo','captacion'));

-- Categorías iniciales de captación (lo que se le paga al inversor), mensuales.
INSERT INTO categorias_tasa (nombre, tasa_mensual, color, periodicidad, tipo) VALUES
  ('Estándar inversor', 3, 'azul',     'mensual', 'captacion'),
  ('Preferencial',      4, 'amarillo', 'mensual', 'captacion'),
  ('Premium',           5, 'verde',    'mensual', 'captacion')
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations (version) VALUES ('014_categoria_tipo') ON CONFLICT DO NOTHING;
