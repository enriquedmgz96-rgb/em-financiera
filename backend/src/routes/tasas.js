const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// GET /api/tasas?moneda=ARS&periodicidad=mensual
router.get('/', async (req, res, next) => {
  try {
    const moneda       = req.query.moneda       || 'ARS';
    const periodicidad = req.query.periodicidad || 'mensual';
    const { rows } = await pool.query(
      `SELECT total_cuotas, tasa_mensual AS tasa_periodo, tasa_total_pct, periodicidad
       FROM maestro_tasas
       WHERE moneda = $1 AND periodicidad = $2 AND activo = TRUE
       ORDER BY total_cuotas`,
      [moneda, periodicidad]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
