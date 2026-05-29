const jwt = require('jsonwebtoken');
// JWT_SECRET es garantizado por el fail-fast en app.js. Sin fallback inseguro.
const SECRET = process.env.JWT_SECRET;

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
