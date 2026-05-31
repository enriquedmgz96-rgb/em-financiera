const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { validarCUIT } = require('../services/validaciones');

// Registro único de personas (BP / socios de negocio): cada persona se crea una
// sola vez y puede actuar como cliente (préstamos) y/o como inversor (captaciones).
//
// SOCIO_SELECT trae, además de los datos de la persona, el RESUMEN de su actividad
// en cada rol — para que la pantalla Socios muestre el estado de un vistazo:
//   rol cliente  → prestamos_activos / prestamos_capital / prestamos_pendiente
//   rol inversor → captaciones_activas / captaciones_capital / captaciones_pendiente
// "pendiente" usa la MISMA definición canónica que el dashboard: capital − amortizado,
// sobre operaciones vivas (préstamos: NOT IN cancelado/archivado; captaciones: NOT IN
// devuelta/archivada). Las flags tiene_prestamos / tiene_captaciones marcan el rol aunque
// la operación ya esté cerrada (cubren todo el historial).
const SOCIO_SELECT = `
  SELECT c.*,
    (COALESCE(pr.total_ops, 0)  > 0) AS tiene_prestamos,
    (COALESCE(cap.total_ops, 0) > 0) AS tiene_captaciones,
    COALESCE(pr.activos,    0) AS prestamos_activos,
    COALESCE(pr.capital,    0) AS prestamos_capital,
    COALESCE(pr.pendiente,  0) AS prestamos_pendiente,
    COALESCE(cap.activas,   0) AS captaciones_activas,
    COALESCE(cap.capital,   0) AS captaciones_capital,
    COALESCE(cap.pendiente, 0) AS captaciones_pendiente
  FROM clientes c
  LEFT JOIN (
    SELECT p.id_cliente,
      COUNT(*)                                                          AS total_ops,
      COUNT(*) FILTER (WHERE p.estado NOT IN ('cancelado','archivado')) AS activos,
      COALESCE(SUM(p.monto_capital)
               FILTER (WHERE p.estado NOT IN ('cancelado','archivado')), 0) AS capital,
      COALESCE(SUM(p.monto_capital - COALESCE(am.amortizado, 0))
               FILTER (WHERE p.estado NOT IN ('cancelado','archivado')), 0) AS pendiente
    FROM prestamos p
    LEFT JOIN (
      SELECT id_prestamo, SUM(capital_amortizado) AS amortizado
      FROM pagos GROUP BY id_prestamo
    ) am ON am.id_prestamo = p.id
    GROUP BY p.id_cliente
  ) pr ON pr.id_cliente = c.id
  LEFT JOIN (
    SELECT k.id_inversor,
      COUNT(*)                                                         AS total_ops,
      COUNT(*) FILTER (WHERE k.estado NOT IN ('devuelta','archivada')) AS activas,
      COALESCE(SUM(k.monto_capital)
               FILTER (WHERE k.estado NOT IN ('devuelta','archivada')), 0) AS capital,
      COALESCE(SUM(k.monto_capital - COALESCE(dv.devuelto, 0))
               FILTER (WHERE k.estado NOT IN ('devuelta','archivada')), 0) AS pendiente
    FROM captaciones k
    LEFT JOIN (
      SELECT id_captacion, SUM(capital_amortizado) AS devuelto
      FROM devoluciones GROUP BY id_captacion
    ) dv ON dv.id_captacion = k.id
    GROUP BY k.id_inversor
  ) cap ON cap.id_inversor = c.id
`;

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${SOCIO_SELECT} ORDER BY c.apellido, c.nombre`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const {
    nombre, apellido, dni, cuit, telefono, origen, observaciones, domicilio,
    documentacion_presentada, email, banco_cbu, banco_alias,
  } = req.body;
  if (!nombre || !apellido || !dni) {
    return res.status(400).json({ error: 'nombre, apellido y dni son requeridos (UIF Res. 30/2017)' });
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
      `INSERT INTO clientes
         (nombre, apellido, dni, cuit, telefono, origen, observaciones, domicilio,
          documentacion_presentada, email, banco_cbu, banco_alias)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [nombre, apellido, dni, cuit || null, telefono || null, origen || null,
       observaciones || null, domicilio || null, docJson,
       email || null, banco_cbu || null, banco_alias || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'DNI ya registrado' });
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${SOCIO_SELECT} WHERE c.id = $1`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  const {
    nombre, apellido, dni, cuit, telefono, origen, observaciones, domicilio,
    documentacion_presentada, email, banco_cbu, banco_alias,
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
      `UPDATE clientes SET
         nombre                   = COALESCE($1, nombre),
         apellido                 = COALESCE($2, apellido),
         dni                      = COALESCE($3, dni),
         cuit                     = COALESCE($4, cuit),
         telefono                 = COALESCE($5, telefono),
         origen                   = COALESCE($6, origen),
         observaciones            = COALESCE($7, observaciones),
         domicilio                = COALESCE($8, domicilio),
         documentacion_presentada = COALESCE($9, documentacion_presentada),
         email                    = COALESCE($11, email),
         banco_cbu                = COALESCE($12, banco_cbu),
         banco_alias              = COALESCE($13, banco_alias)
       WHERE id = $10 RETURNING *`,
      [nombre, apellido, dni, cuit, telefono, origen, observaciones, domicilio || null,
       docJson ?? null, req.params.id, email ?? null, banco_cbu ?? null, banco_alias ?? null]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'DNI ya registrado' });
    next(err);
  }
});

module.exports = router;
