const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { saldoCapitalActual, calcularProyeccion } = require('../services/motorCuotas');
const { generarContrato } = require('../services/generadorPDF');

router.get('/', async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (req.query.estado) { conditions.push(`p.estado = $${params.length + 1}`); params.push(req.query.estado); }
    if (req.query.id_cliente) { conditions.push(`p.id_cliente = $${params.length + 1}`); params.push(req.query.id_cliente); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre, c.apellido, c.dni
       FROM prestamos p JOIN clientes c ON c.id = p.id_cliente
       ${where} ORDER BY p.fecha DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const { id_cliente, moneda, monto_capital, tasa_interes_mensual, total_cuotas,
    primer_vencimiento, pagare_firmado, motivo, nombre_garantia,
    telefono_garantia, dni_garantia, observaciones } = req.body;
  if (!id_cliente || !monto_capital || !tasa_interes_mensual || !total_cuotas || !primer_vencimiento) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id_cliente, monto_capital, tasa_interes_mensual, total_cuotas, primer_vencimiento' });
  }
  const valor_cuota_base = parseFloat((monto_capital / total_cuotas).toFixed(2));
  try {
    const { rows } = await pool.query(
      `INSERT INTO prestamos
         (id_cliente, moneda, monto_capital, tasa_interes_mensual, total_cuotas,
          valor_cuota_base, primer_vencimiento, estado, pagare_firmado, motivo,
          nombre_garantia, telefono_garantia, dni_garantia, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'activo',$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id_cliente, moneda || 'ARS', monto_capital, tasa_interes_mensual, total_cuotas,
        valor_cuota_base, primer_vencimiento, pagare_firmado || false, motivo || null,
        nombre_garantia || null, telefono_garantia || null, dni_garantia || null, observaciones || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Cliente no encontrado' });
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows: prestamos } = await pool.query(
      `SELECT p.*, c.nombre, c.apellido, c.dni, c.cuit, c.telefono
       FROM prestamos p JOIN clientes c ON c.id = p.id_cliente WHERE p.id = $1`,
      [req.params.id]
    );
    if (prestamos.length === 0) return res.status(404).json({ error: 'Préstamo no encontrado' });
    const prestamo = prestamos[0];
    const { rows: pagos } = await pool.query(
      'SELECT * FROM pagos WHERE id_prestamo = $1 ORDER BY fecha_pago', [req.params.id]
    );
    const saldo = saldoCapitalActual(parseFloat(prestamo.monto_capital), pagos);
    const interes_proximo_mes = parseFloat((saldo * (parseFloat(prestamo.tasa_interes_mensual) / 100)).toFixed(2));
    res.json({ ...prestamo, pagos, saldo_capital_actual: saldo, interes_proximo_mes });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  const { estado, pagare_firmado, observaciones } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE prestamos SET
         estado         = COALESCE($1, estado),
         pagare_firmado = COALESCE($2, pagare_firmado),
         observaciones  = COALESCE($3, observaciones)
       WHERE id = $4 RETURNING *`,
      [estado, pagare_firmado, observaciones, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Préstamo no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/:id/contrato', async (req, res, next) => {
  try {
    const { rows: prestamos } = await pool.query(
      `SELECT p.*, c.nombre, c.apellido, c.dni, c.cuit, c.telefono
       FROM prestamos p JOIN clientes c ON c.id = p.id_cliente WHERE p.id = $1`,
      [req.params.id]
    );
    if (prestamos.length === 0) return res.status(404).json({ error: 'Préstamo no encontrado' });
    const prestamo = prestamos[0];
    const tabla = calcularProyeccion({
      montoCapital: parseFloat(prestamo.monto_capital),
      tasaMensual: parseFloat(prestamo.tasa_interes_mensual),
      totalCuotas: parseInt(prestamo.total_cuotas),
    });
    const nombreArchivo = `contrato-prestamo-${prestamo.id}-${prestamo.apellido.toLowerCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    const doc = generarContrato(prestamo, tabla);
    doc.pipe(res);
  } catch (err) { next(err); }
});

module.exports = router;
