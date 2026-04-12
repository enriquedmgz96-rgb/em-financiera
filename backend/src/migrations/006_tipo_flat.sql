-- Agregar sistema 'flat' (interés plano sobre capital original — el más común en Argentina)
-- Este sistema cobra siempre el mismo interés sobre el capital original, no sobre el saldo.
-- Resultado: cuota mensual SIEMPRE igual = (capital/cuotas) + (capital * tasa)

-- Reemplazar la columna para ampliar el CHECK
ALTER TABLE prestamos DROP COLUMN IF EXISTS tipo_amortizacion;
ALTER TABLE prestamos
  ADD COLUMN tipo_amortizacion VARCHAR(20) NOT NULL DEFAULT 'flat'
  CHECK (tipo_amortizacion IN ('aleman', 'frances', 'flat'));

-- Todos los préstamos existentes pasan a sistema flat (cuota fija con interés plano)
UPDATE prestamos SET tipo_amortizacion = 'flat';

-- Para flat: valor_cuota_base = capital / cuotas (solo la porción de capital)
-- La cuota total = valor_cuota_base + monto_capital * tasa (siempre fija)
UPDATE prestamos
  SET valor_cuota_base = ROUND(monto_capital / total_cuotas, 2)
  WHERE tipo_amortizacion = 'flat';
