-- Separar fecha real del pago de la fecha de registro en el sistema
ALTER TABLE pagos
  RENAME COLUMN fecha_pago TO fecha_pago_real;

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Comentarios descriptivos
COMMENT ON COLUMN pagos.fecha_pago_real IS 'Fecha en que se realizó el pago (ingresada por el usuario)';
COMMENT ON COLUMN pagos.fecha_registro  IS 'Fecha en que se registró el pago en el sistema (automática)';
