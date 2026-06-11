const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// Próximo vencimiento real = primer_vencimiento + cuotas cubiertas por capital.
// cuotas cubiertas = total - cuotas que faltan (MIN(cuotas_restantes_post_pago)).
const VTO = `(pr.primer_vencimiento + ((pr.total_cuotas - COALESCE(MIN(pg.cuotas_restantes_post_pago), pr.total_cuotas)) * CASE pr.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date`;

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
    res.json({
      marcados_mora: marcados.length, ids_mora: marcados.map(r => r.id),
      recuperados: recuperados.length, ids_recuperados: recuperados.map(r => r.id),
    });
  } catch (err) { next(err); }
});

module.exports = router;
