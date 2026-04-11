const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

router.get('/', async (req, res, next) => {
  try {
    const { rows: [totales] } = await pool.query(`
      SELECT
        COALESCE(SUM(monto_capital),0)            AS capital_total_prestado,
        COUNT(*) FILTER (WHERE estado = 'activo') AS prestamos_activos
      FROM prestamos
    `);
    const { rows: [movimientos] } = await pool.query(`
      SELECT
        COALESCE(SUM(capital_amortizado),0) AS capital_cobrado,
        COALESCE(SUM(interes_pagado),0)     AS intereses_cobrados
      FROM pagos
    `);
    const { rows: [pendiente] } = await pool.query(`
      SELECT COALESCE(SUM(ultimo_saldo.saldo),0) AS capital_pendiente
      FROM (
        SELECT DISTINCT ON (id_prestamo) saldo_capital_post_pago AS saldo
        FROM pagos ORDER BY id_prestamo, fecha_pago_real DESC
      ) AS ultimo_saldo
    `);
    const { rows: mora } = await pool.query(`
      SELECT p.id, p.monto_capital, p.primer_vencimiento,
             c.nombre, c.apellido, c.dni, c.telefono,
             COUNT(pg.id) AS nro_pagos,
             (p.primer_vencimiento + (COUNT(pg.id) * INTERVAL '30 days'))::date AS proximo_vencimiento
      FROM prestamos p
      JOIN clientes c ON c.id = p.id_cliente
      LEFT JOIN pagos pg ON pg.id_prestamo = p.id
      WHERE p.estado = 'activo'
      GROUP BY p.id, c.id
      HAVING (p.primer_vencimiento + (COUNT(pg.id) * INTERVAL '30 days'))::date < CURRENT_DATE
    `);
    const { rows: proximos } = await pool.query(`
      SELECT p.id, p.monto_capital, p.tasa_interes_mensual, p.valor_cuota_base,
             p.primer_vencimiento, c.nombre, c.apellido, c.dni, c.telefono,
             COUNT(pg.id) AS nro_pagos,
             (p.primer_vencimiento + (COUNT(pg.id) * INTERVAL '30 days'))::date AS proximo_vencimiento
      FROM prestamos p
      JOIN clientes c ON c.id = p.id_cliente
      LEFT JOIN pagos pg ON pg.id_prestamo = p.id
      WHERE p.estado = 'activo'
      GROUP BY p.id, c.id
      HAVING (p.primer_vencimiento + (COUNT(pg.id) * INTERVAL '30 days'))::date
             BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY proximo_vencimiento
    `);
    res.json({
      capital_total_prestado: parseFloat(totales.capital_total_prestado),
      capital_cobrado: parseFloat(movimientos.capital_cobrado),
      capital_pendiente: parseFloat(pendiente.capital_pendiente),
      intereses_cobrados: parseFloat(movimientos.intereses_cobrados),
      prestamos_activos: parseInt(totales.prestamos_activos),
      prestamos_en_mora: mora.length,
      en_mora: mora,
      proximos_a_vencer: proximos,
    });
  } catch (err) { next(err); }
});

module.exports = router;
