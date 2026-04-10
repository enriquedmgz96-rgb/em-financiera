const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// GET /api/tasas?moneda=ARS
router.get('/', async (req, res, next) => {
  try {
    const moneda = req.query.moneda || 'ARS';
    const { rows } = await pool.query(
      `SELECT total_cuotas, tasa_mensual, tasa_total_pct
       FROM maestro_tasas
       WHERE moneda = $1 AND activo = TRUE
       ORDER BY total_cuotas`,
      [moneda]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
