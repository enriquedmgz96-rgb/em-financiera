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

// PUT /api/tasas/:cuotas?moneda=ARS — actualiza tasa mensual y recalcula tasa_total_pct
router.put('/:cuotas', async (req, res, next) => {
  const { tasa_mensual } = req.body;
  const moneda = req.query.moneda || 'ARS';
  const cuotas = parseInt(req.params.cuotas);
  if (!tasa_mensual || isNaN(tasa_mensual) || tasa_mensual <= 0) {
    return res.status(400).json({ error: 'tasa_mensual debe ser un número positivo' });
  }
  try {
    const tasa_total_pct = parseFloat((tasa_mensual * cuotas).toFixed(4));
    const { rows } = await pool.query(
      `UPDATE maestro_tasas SET tasa_mensual = $1, tasa_total_pct = $2
       WHERE moneda = $3 AND total_cuotas = $4 RETURNING *`,
      [tasa_mensual, tasa_total_pct, moneda, cuotas]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Tasa no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
