-- Permite registrar préstamos SIN garantía / codeudor.
-- Cuando requiere_garantia = FALSE:
--   * el alta no exige los datos del garante
--   * el contrato de mutuo se genera sin la cláusula del codeudor
-- Default TRUE para no alterar los préstamos ya existentes.

ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS requiere_garantia BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO schema_migrations (version) VALUES ('016_prestamo_requiere_garantia') ON CONFLICT DO NOTHING;
