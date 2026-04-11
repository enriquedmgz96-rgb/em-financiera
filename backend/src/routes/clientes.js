const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { validarCUIT } = require('../services/validaciones');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clientes ORDER BY apellido, nombre');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const { nombre, apellido, dni, cuit, telefono, origen, observaciones } = req.body;
  if (!nombre || !apellido || !dni) {
    return res.status(400).json({ error: 'nombre, apellido y dni son requeridos (UIF Res. 30/2017)' });
  }
  if (cuit) {
    const v = validarCUIT(cuit);
    if (!v.valido) return res.status(400).json({ error: `CUIT inválido: ${v.mensaje}` });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO clientes (nombre, apellido, dni, cuit, telefono, origen, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre, apellido, dni, cuit || null, telefono || null, origen || null, observaciones || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'DNI ya registrado' });
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  const { nombre, apellido, dni, cuit, telefono, origen, observaciones } = req.body;
  if (cuit) {
    const v = validarCUIT(cuit);
    if (!v.valido) return res.status(400).json({ error: `CUIT inválido: ${v.mensaje}` });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE clientes SET
         nombre        = COALESCE($1, nombre),
         apellido      = COALESCE($2, apellido),
         dni           = COALESCE($3, dni),
         cuit          = COALESCE($4, cuit),
         telefono      = COALESCE($5, telefono),
         origen        = COALESCE($6, origen),
         observaciones = COALESCE($7, observaciones)
       WHERE id = $8 RETURNING *`,
      [nombre, apellido, dni, cuit, telefono, origen, observaciones, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'DNI ya registrado' });
    next(err);
  }
});

module.exports = router;
