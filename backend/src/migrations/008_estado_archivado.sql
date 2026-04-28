-- Agrega 'archivado' como estado válido de préstamos
ALTER TABLE prestamos DROP CONSTRAINT IF EXISTS prestamos_estado_check;
ALTER TABLE prestamos ADD CONSTRAINT prestamos_estado_check
  CHECK (estado IN ('activo','cancelado','mora','archivado'));
