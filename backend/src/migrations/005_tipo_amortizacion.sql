-- Agregar sistema de amortización al préstamo: 'aleman' (capital fijo, cuota decreciente)
-- o 'frances' (cuota fija, capital creciente — sistema estándar)
ALTER TABLE prestamos
  ADD COLUMN IF NOT EXISTS tipo_amortizacion VARCHAR(20) NOT NULL DEFAULT 'aleman'
  CHECK (tipo_amortizacion IN ('aleman', 'frances'));

-- Todos los préstamos existentes pasan a sistema francés (cuota fija)
UPDATE prestamos SET tipo_amortizacion = 'frances';
