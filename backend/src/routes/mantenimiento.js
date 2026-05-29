const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

router.post('/actualizar-mora', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      UPDATE prestamos p
      SET estado = 'mora'
      FROM (
        SELECT pr.id,
               (pr.primer_vencimiento + (COUNT(pg.id) * CASE pr.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date AS proximo_vcto
        FROM prestamos pr
        LEFT JOIN pagos pg ON pg.id_prestamo = pr.id
        WHERE pr.estado = 'activo'
        GROUP BY pr.id
        HAVING (pr.primer_vencimiento + (COUNT(pg.id) * CASE pr.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date < CURRENT_DATE
      ) AS vencidos
      WHERE p.id = vencidos.id
      RETURNING p.id
    `);
    res.json({ actualizados: rows.length, ids: rows.map(r => r.id) });
  } catch (err) { next(err); }
});

module.exports = router;
