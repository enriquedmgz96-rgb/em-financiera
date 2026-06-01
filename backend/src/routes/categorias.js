const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// GET /api/categorias
// Filtra por periodicidad (mensual/semanal) y tipo (prestamo/captacion).
// tipo=prestamo por defecto para no romper clientes viejos.
router.get('/', async (req, res, next) => {
  try {
    const periodicidad = req.query.periodicidad || 'mensual';
    const tipo = req.query.tipo === 'captacion' ? 'captacion' : 'prestamo';
    const { rows } = await pool.query(
      'SELECT * FROM categorias_tasa WHERE activo = TRUE AND periodicidad = $1 AND tipo = $2 ORDER BY tasa_mensual',
      [periodicidad, tipo]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/categorias
router.post('/', async (req, res, next) => {
  const { nombre, tasa_mensual, color, periodicidad, tipo } = req.body;
  if (!nombre || !tasa_mensual) {
    return res.status(400).json({ error: 'nombre y tasa_mensual son requeridos' });
  }
  const tipoNorm = tipo === 'captacion' ? 'captacion' : 'prestamo';
  try {
    const { rows } = await pool.query(
      'INSERT INTO categorias_tasa (nombre, tasa_mensual, color, periodicidad, tipo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre.trim(), tasa_mensual, color || 'azul', periodicidad || 'mensual', tipoNorm]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/categorias/:id
router.put('/:id', async (req, res, next) => {
  const { nombre, tasa_mensual, color, periodicidad, tipo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE categorias_tasa
       SET nombre = COALESCE($1, nombre),
           tasa_mensual = COALESCE($2, tasa_mensual),
           color = COALESCE($3, color),
           periodicidad = COALESCE($4, periodicidad),
           tipo = COALESCE($6, tipo)
       WHERE id = $5 RETURNING *`,
      [nombre || null, tasa_mensual || null, color || null, periodicidad || null, req.params.id,
       (tipo === 'captacion' || tipo === 'prestamo') ? tipo : null]
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
