
-- Periodicidad en préstamos
ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS periodicidad VARCHAR(10) NOT NULL DEFAULT 'mensual';
ALTER TABLE prestamos DROP CONSTRAINT IF EXISTS prestamos_periodicidad_check;
ALTER TABLE prestamos ADD CONSTRAINT prestamos_periodicidad_check CHECK (periodicidad IN ('mensual','semanal'));

-- Periodicidad en maestro_tasas
ALTER TABLE maestro_tasas ADD COLUMN IF NOT EXISTS periodicidad VARCHAR(10) NOT NULL DEFAULT 'mensual';
ALTER TABLE maestro_tasas DROP CONSTRAINT IF EXISTS maestro_tasas_moneda_total_cuotas_key;
ALTER TABLE maestro_tasas DROP CONSTRAINT IF EXISTS maestro_tasas_unique;
ALTER TABLE maestro_tasas ADD CONSTRAINT maestro_tasas_unique UNIQUE (moneda, total_cuotas, periodicidad);

-- Tasas semanales ARS 3%
INSERT INTO maestro_tasas (moneda, total_cuotas, tasa_mensual, tasa_total_pct, periodicidad) VALUES
  ('ARS',  1, 3,  3, 'semanal'),
  ('ARS',  2, 3,  6, 'semanal'),
  ('ARS',  3, 3,  9, 'semanal'),
  ('ARS',  4, 3, 12, 'semanal'),
  ('ARS',  5, 3, 15, 'semanal'),
  ('ARS',  6, 3, 18, 'semanal'),
  ('ARS',  7, 3, 21, 'semanal'),
  ('ARS',  8, 3, 24, 'semanal'),
  ('ARS',  9, 3, 27, 'semanal'),
  ('ARS', 10, 3, 30, 'semanal'),
  ('ARS', 11, 3, 33, 'semanal'),
  ('ARS', 12, 3, 36, 'semanal')
ON CONFLICT (moneda, total_cuotas, periodicidad) DO NOTHING;

INSERT INTO schema_migrations (version) VALUES ('011_periodicidad_semanal') ON CONFLICT DO NOTHING;
