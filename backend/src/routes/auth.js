const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');

// JWT_SECRET garantizado por el fail-fast en app.js. Sin fallback inseguro.
const SECRET = process.env.JWT_SECRET;

// ── Rate limiting en memoria contra fuerza bruta de login ──
const MAX_INTENTOS = 6;                 // fallos permitidos por (IP + usuario)
const VENTANA_MS   = 15 * 60 * 1000;    // ventana y bloqueo: 15 minutos
const intentos = new Map();

function claveIntento(req, username) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress || 'unknown';
  return ip + '|' + String(username || '').toLowerCase();
}
function segundosBloqueo(clave) {
  const e = intentos.get(clave);
  if (e && e.blockedUntil && e.blockedUntil > Date.now()) {
    return Math.ceil((e.blockedUntil - Date.now()) / 1000);
  }
  return 0;
}
function registrarFallo(clave) {
  const now = Date.now();
  let e = intentos.get(clave);
  if (!e || now - e.first > VENTANA_MS) e = { count: 0, first: now, blockedUntil: 0 };
  e.count += 1;
  if (e.count >= MAX_INTENTOS) e.blockedUntil = now + VENTANA_MS;
  intentos.set(clave, e);
  if (intentos.size > 5000) { // evitar crecimiento indefinido
    for (const [k, v] of intentos) if (!v.blockedUntil || v.blockedUntil < now) intentos.delete(k);
  }
}

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  const clave = claveIntento(req, username);
  const espera = segundosBloqueo(clave);
  if (espera > 0) {
    return res.status(429).json({ error: `Demasiados intentos fallidos. Probá de nuevo en ${Math.ceil(espera / 60)} minuto(s).` });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE username = $1 AND activo = TRUE',
      [username]
    );
    if (rows.length === 0) {
      registrarFallo(clave);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const usuario = rows[0];
    const ok = await bcrypt.compare(password, usuario.password_hash);
    if (!ok) {
      registrarFallo(clave);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    intentos.delete(clave); // login exitoso limpia los intentos
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
