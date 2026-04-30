const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const pool    = require('../db/connection');

// GET /api/usuarios
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, nombre_completo, activo, created_at FROM usuarios ORDER BY id'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/usuarios
router.post('/', async (req, res, next) => {
  const { username, password, nombre_completo } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username y password son requeridos' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (username, password_hash, nombre_completo)
       VALUES ($1, $2, $3) RETURNING id, username, nombre_completo, activo, created_at`,
      [username.trim(), hash, nombre_completo?.trim() || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El usuario ya existe' });
    next(err);
  }
});

// PUT /api/usuarios/:id — actualizar nombre y/o contraseña
router.put('/:id', async (req, res, next) => {
  const { nombre_completo, password, activo } = req.body;
  try {
    let hashUpdate = '';
    const params = [];

    if (nombre_completo !== undefined) {
      params.push(nombre_completo.trim());
      hashUpdate += `nombre_completo = $${params.length},`;
    }
    if (activo !== undefined) {
      params.push(activo);
      hashUpdate += `activo = $${params.length},`;
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      params.push(hash);
      hashUpdate += `password_hash = $${params.length},`;
    }

    if (!params.length) return res.status(400).json({ error: 'Nada que actualizar' });

    hashUpdate = hashUpdate.replace(/,$/, '');
    params.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE usuarios SET ${hashUpdate} WHERE id = $${params.length}
       RETURNING id, username, nombre_completo, activo, created_at`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
