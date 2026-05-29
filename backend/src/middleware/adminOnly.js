// Gate por usuario admin.
// La lista de IDs de administradores se configura en .env:
//   ADMIN_USER_IDS=1,3   (default: 1)
// Sin ADMIN_USER_IDS seteado, solo el usuario id=1 es admin.
const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '1')
  .split(',').map(s => parseInt(s.trim(), 10)).filter(Number.isFinite);

module.exports = (req, res, next) => {
  if (!req.user || !ADMIN_IDS.includes(parseInt(req.user.id, 10))) {
    return res.status(403).json({ error: 'Acceso restringido — solo administradores' });
  }
  next();
};
