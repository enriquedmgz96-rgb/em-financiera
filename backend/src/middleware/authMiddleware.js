const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'em-financiera-2026-secret';

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado — iniciá sesión' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión expirada — volvé a iniciar sesión' });
  }
};
