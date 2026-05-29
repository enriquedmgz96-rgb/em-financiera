// Inversores — quienes aportan capital. Espejo simétrico de clientes.js.
const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { validarCUIT } = require('../services/validaciones');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inversores ORDER BY apellido, nombre');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const {
    nombre, apellido, dni, cuit, telefono, email, domicilio,
    banco_cbu, banco_alias, origen, observaciones, documentacion_presentada,
  } = req.body;
  if (!nombre || !apellido || !dni) {
    return res.status(400).json({ error: 'nombre, apellido y dni son requeridos' });
  }
  if (cuit) {
    const v = validarCUIT(cuit);
    if (!v.valido) return res.status(400).json({ error: `CUIT inválido: ${v.mensaje}` });
  }
  const docJson = Array.isArray(documentacion_presentada)
    ? JSON.stringify(documentacion_presentada)
    : (documentacion_presentada || '[]');
  try {
    const { rows } = await pool.query(
      `INSERT INTO inversores
         (nombre, apellido, dni, cuit, telefono, email, domicilio,
          banco_cbu, banco_alias, origen, observaciones, documentacion_presentada)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [nombre, apellido, dni, cuit || null, telefono || null, email || null,
       domicilio || null, banco_cbu || null, banco_alias || null,
       origen || null, observaciones || null, docJson]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'DNI ya registrado' });
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inversores WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Inversor no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  const {
    nombre, apellido, dni, cuit, telefono, email, domicilio,
    banco_cbu, banco_alias, origen, observaciones, documentacion_presentada,
  } = req.body;
  if (cuit) {
    const v = validarCUIT(cuit);
    if (!v.valido) return res.status(400).json({ error: `CUIT inválido: ${v.mensaje}` });
  }
  const docJson = documentacion_presentada !== undefined
    ? (Array.isArray(documentacion_presentada) ? JSON.stringify(documentacion_presentada) : documentacion_presentada)
    : undefined;
  try {
    const { rows } = await pool.query(
      `UPDATE inversores SET
         nombre                   = COALESCE($1, nombre),
         apellido                 = COALESCE($2, apellido),
         dni                      = COALESCE($3, dni),
         cuit                     = COALESCE($4, cuit),
         telefono                 = COALESCE($5, telefono),
         email                    = COALESCE($6, email),
         domicilio                = COALESCE($7, domicilio),
         banco_cbu                = COALESCE($8, banco_cbu),
         banco_alias              = COALESCE($9, banco_alias),
         origen                   = COALESCE($10, origen),
         observaciones            = COALESCE($11, observaciones),
         documentacion_presentada = COALESCE($12, documentacion_presentada)
       WHERE id = $13 RETURNING *`,
      [nombre, apellido, dni, cuit, telefono, email, domicilio,
       banco_cbu, banco_alias, origen, observaciones, docJson ?? null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Inversor no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'DNI ya registrado' });
    next(err);
  }
});

module.exports = router;
