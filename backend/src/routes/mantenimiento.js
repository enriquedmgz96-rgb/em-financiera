const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// Próximo vencimiento real = primer_vencimiento + períodos cubiertos.
// Períodos cubiertos = el más avanzado entre capital pagado (total - cuotas que
// faltan) y períodos servidos (pagos "cuota completa" o "solo interés"). Igual
// criterio que el dashboard: contempla adelantos, solo-interés y el redondeo.
const CUB = `LEAST(pr.total_cuotas, GREATEST(
  pr.total_cuotas - COALESCE(MIN(pg.cuotas_restantes_post_pago), pr.total_cuotas),
  COUNT(pg.id) FILTER (WHERE pg.tipo_pago IN ('cuota_completa','solo_interes'))
))`;
const VTO = `(pr.primer_vencimiento + (${CUB} * CASE pr.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date`;

// Mismo criterio para captaciones (aliases c / d).
const CUB_C = `LEAST(c.total_cuotas, GREATEST(
  c.total_cuotas - COALESCE(MIN(d.cuotas_restantes_post_pago), c.total_cuotas),
  COUNT(d.id) FILTER (WHERE d.tipo_pago IN ('cuota_completa','solo_interes'))
))`;
const VTO_C = `(c.primer_vencimiento + (${CUB_C} * CASE c.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date`;

router.post('/actualizar-mora', async (req, res, next) => {
  try {
    // 1) Marcar en mora los préstamos activos cuyo próximo vencimiento real ya pasó.
    const { rows: marcados } = await pool.query(`
      UPDATE prestamos p SET estado = 'mora'
      FROM (
        SELECT pr.id FROM prestamos pr
        LEFT JOIN pagos pg ON pg.id_prestamo = pr.id
        WHERE pr.estado = 'activo'
        GROUP BY pr.id
        HAVING ${VTO} < CURRENT_DATE
      ) AS vencidos
      WHERE p.id = vencidos.id
      RETURNING p.id
    `);
    // 2) Auto-corrección: sacar de mora los que ya se pusieron al día (pagaron adelantos, etc.)
    const { rows: recuperados } = await pool.query(`
      UPDATE prestamos p SET estado = 'activo'
      FROM (
        SELECT pr.id FROM prestamos pr
        LEFT JOIN pagos pg ON pg.id_prestamo = pr.id
        WHERE pr.estado = 'mora'
        GROUP BY pr.id
        HAVING ${VTO} >= CURRENT_DATE
      ) AS aldia
      WHERE p.id = aldia.id
      RETURNING p.id
    `);
    // 3) Captaciones: marcar en mora las vencidas y recuperar las que se pusieron al día.
    const { rows: capMarcadas } = await pool.query(`
      UPDATE captaciones cap SET estado = 'mora'
      FROM (
        SELECT c.id FROM captaciones c
        LEFT JOIN devoluciones d ON d.id_captacion = c.id
        WHERE c.estado = 'activa'
        GROUP BY c.id
        HAVING ${VTO_C} < CURRENT_DATE
      ) AS vencidas
      WHERE cap.id = vencidas.id
      RETURNING cap.id
    `);
    const { rows: capRecuperadas } = await pool.query(`
      UPDATE captaciones cap SET estado = 'activa'
      FROM (
        SELECT c.id FROM captaciones c
        LEFT JOIN devoluciones d ON d.id_captacion = c.id
        WHERE c.estado = 'mora'
        GROUP BY c.id
        HAVING ${VTO_C} >= CURRENT_DATE
      ) AS aldia
      WHERE cap.id = aldia.id
      RETURNING cap.id
    `);
    res.json({
      marcados_mora: marcados.length, ids_mora: marcados.map(r => r.id),
      recuperados: recuperados.length, ids_recuperados: recuperados.map(r => r.id),
      captaciones_mora: capMarcadas.length, ids_captaciones_mora: capMarcadas.map(r => r.id),
      captaciones_recuperadas: capRecuperadas.length,
    });
  } catch (err) { next(err); }
});

module.exports = router;
