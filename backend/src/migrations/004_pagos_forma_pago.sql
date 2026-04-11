-- Cambiar fecha_pago_real a tipo DATE para evitar problemas de timezone
ALTER TABLE pagos ALTER COLUMN fecha_pago_real TYPE DATE USING fecha_pago_real::DATE;

-- Agregar forma de pago para trazabilidad
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS forma_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo'
  CHECK (forma_pago IN ('efectivo','transferencia','cheque','debito','otro'));
