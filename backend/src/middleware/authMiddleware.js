const jwt = require('jsonwebtoken');
const pool = require('../db/connection');
// JWT_SECRET es garantizado por el fail-fast en app.js. Sin fallback inseguro.
const SECRET = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado — iniciá sesión' });
  }
  let payload;
  try {
    payload = jwt.verify(auth.slice(7), SECRET);
  } catch {
    return res.status(401).json({ error: 'Sesión expirada — volvé a iniciar sesión' });
  }
  // Revalidar contra la base en cada request: si el usuario fue DESACTIVADO o
  // borrado, el token deja de valer al instante (antes seguía activo hasta 30 días).
  try {
    const { rows } = await pool.query('SELECT id, activo FROM usuarios WHERE id = $1', [payload.id]);
    if (rows.length === 0 || rows[0].activo === false) {
      return res.status(401).json({ error: 'Tu usuario está inactivo — contactá al administrador' });
    }
  } catch (err) {
    return next(err);
  }
  req.user = payload;
  next();
};
