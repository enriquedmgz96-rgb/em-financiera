const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { calcularPago, saldoCapitalActual } = require('../services/motorCuotas');
const { generarRecibo } = require('../services/generadorPDF');

const TIPOS_VALIDOS = ['cuota_completa', 'solo_interes', 'adelanto_parcial'];

router.post('/', async (req, res, next) => {
  const { id_prestamo, monto_pagado, tipo_pago, observaciones } = req.body;
  if (!id_prestamo || !monto_pagado || !tipo_pago) {
    return res.status(400).json({ error: 'id_prestamo, monto_pagado y tipo_pago son requeridos' });
  }
  if (!TIPOS_VALIDOS.includes(tipo_pago)) {
    return res.status(400).json({ error: `tipo_pago debe ser: ${TIPOS_VALIDOS.join(', ')}` });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: prestamos } = await client.query(
      'SELECT * FROM prestamos WHERE id = $1 FOR UPDATE', [id_prestamo]
    );
    if (prestamos.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }
    const prestamo = prestamos[0];
    if (prestamo.estado === 'cancelado') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El préstamo ya está cancelado' });
    }
    const { rows: pagosAnteriores } = await client.query(
      'SELECT * FROM pagos WHERE id_prestamo = $1 ORDER BY fecha_pago', [id_prestamo]
    );
    const saldoActual = saldoCapitalActual(parseFloat(prestamo.monto_capital), pagosAnteriores);
    const { interesPagado, capitalAmortizado, saldoCapitalPostPago, cuotasRestantesPostPago } = calcularPago({
      tipoPago: tipo_pago,
      montoPagado: parseFloat(monto_pagado),
      saldoCapitalActual: saldoActual,
      tasaMensual: parseFloat(prestamo.tasa_interes_mensual),
      cuotaBase: parseFloat(prestamo.valor_cuota_base),
    });
    const { rows: [pago] } = await client.query(
      `INSERT INTO pagos (id_prestamo, monto_pagado, tipo_pago, capital_amortizado, interes_pagado,
        saldo_capital_post_pago, cuotas_restantes_post_pago, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id_prestamo, monto_pagado, tipo_pago, capitalAmortizado, interesPagado,
        saldoCapitalPostPago, cuotasRestantesPostPago, observaciones || null]
    );
    if (saldoCapitalPostPago === 0) {
      await client.query("UPDATE prestamos SET estado = 'cancelado' WHERE id = $1", [id_prestamo]);
    }
    await client.query('COMMIT');
    res.status(201).json(pago);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.get('/:id_prestamo', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM pagos WHERE id_prestamo = $1 ORDER BY fecha_pago', [req.params.id_prestamo]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id/recibo', async (req, res, next) => {
  try {
    const { rows: pagos } = await pool.query('SELECT * FROM pagos WHERE id = $1', [req.params.id]);
    if (pagos.length === 0) return res.status(404).json({ error: 'Pago no encontrado' });
    const pago = pagos[0];
    const { rows: prestamos } = await pool.query(
      `SELECT p.*, c.nombre, c.apellido, c.dni, c.cuit, c.telefono
       FROM prestamos p JOIN clientes c ON c.id = p.id_cliente WHERE p.id = $1`,
      [pago.id_prestamo]
    );
    const nombreArchivo = `recibo-pago-${pago.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    const doc = generarRecibo(pago, prestamos[0]);
    doc.pipe(res);
  } catch (err) { next(err); }
});

module.exports = router;
