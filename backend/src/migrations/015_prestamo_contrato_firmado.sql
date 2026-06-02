-- Separar el estado de documentación del préstamo en dos:
--   pagare_firmado   → los pagarés están firmados (columna ya existente)
--   contrato_firmado → el contrato de mutuo está firmado (nueva)
-- Las dos son independientes y se tildan por separado en el alta del préstamo.

ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS contrato_firmado BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO schema_migrations (version) VALUES ('015_prestamo_contrato_firmado') ON CONFLICT DO NOTHING;
