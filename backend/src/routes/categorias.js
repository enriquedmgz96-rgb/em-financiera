const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// GET /api/categorias
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM categorias_tasa WHERE activo = TRUE ORDER BY tasa_mensual'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/categorias
router.post('/', async (req, res, next) => {
  const { nombre, tasa_mensual, color } = req.body;
  if (!nombre || !tasa_mensual) {
    return res.status(400).json({ error: 'nombre y tasa_mensual son requeridos' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO categorias_tasa (nombre, tasa_mensual, color) VALUES ($1, $2, $3) RETURNING *',
      [nombre.trim(), tasa_mensual, color || 'azul']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/categorias/:id
router.put('/:id', async (req, res, next) => {
  const { nombre, tasa_mensual, color } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE categorias_tasa
       SET nombre = COALESCE($1, nombre),
           tasa_mensual = COALESCE($2, tasa_mensual),
           color = COALESCE($3, color)
       WHERE id = $4 RETURNING *`,
      [nombre || null, tasa_mensual || null, color || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/categorias/:id (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('UPDATE categorias_tasa SET activo = FALSE WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
