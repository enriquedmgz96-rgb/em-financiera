const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');

const SECRET = process.env.JWT_SECRET || 'em-financiera-2026-secret';

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE username = $1 AND activo = TRUE',
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const usuario = rows[0];
    const ok = await bcrypt.compare(password, usuario.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const token = jwt.sign(
      { id: usuario.id, username: usuario.username, nombre: usuario.nombre_completo },
      SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, username: usuario.username, nombre: usuario.nombre_completo });
  } catch (err) { next(err); }
});

// GET /api/auth/me — verifica token y devuelve datos del usuario
router.get('/me', require('../middleware/authMiddleware'), (req, res) => {
  res.json({ username: req.user.username, nombre: req.user.nombre });
});

module.exports = router;
