-- Corrección préstamo Ricardo Zorman
-- Capital: $1.000.000 | Tasa: 7% mensual | 6 cuotas flat
-- Cuota = $1.000.000/6 + $1.000.000×0.07 = $166.666,67 + $70.000 = $236.666,67

UPDATE prestamos
SET
  monto_capital         = 1000000.00,
  tasa_interes_mensual  = 7.00,
  total_cuotas          = 6,
  valor_cuota_base      = ROUND(1000000.00 / 6, 2),   -- 166666.67 (capital por cuota)
  tipo_amortizacion     = 'flat'
WHERE id_cliente = (
  SELECT id FROM clientes WHERE dni = '39447346' LIMIT 1
);
