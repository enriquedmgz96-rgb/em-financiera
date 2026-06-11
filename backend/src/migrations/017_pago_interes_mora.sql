-- Recargo punitorio por mora cobrado en un pago, registrado APARTE del
-- capital y el interés normal. No afecta el cálculo de saldo/capital:
--   total cobrado = monto_pagado (cuota: capital + interés) + interes_mora
-- Default 0 para todos los pagos existentes.

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS interes_mora NUMERIC(14,2) NOT NULL DEFAULT 0;

INSERT INTO schema_migrations (version) VALUES ('017_pago_interes_mora') ON CONFLICT DO NOTHING;
