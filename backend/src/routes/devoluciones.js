// Devoluciones — pagos hechos al inversor por una captación.
// Espejo simétrico de pagos.js. Mismo motor de cuotas con replay.
const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { calcularPago, saldoCapitalActual } = require('../services/motorCuotas');
const { generarReciboDevolucion } = require('../services/generadorPDF');

const TIPOS_VALIDOS = ['cuota_completa', 'solo_interes', 'adelanto_parcial'];

router.post('/', async (req, res, next) => {
  const { id_captacion, monto_pagado, tipo_pago, observaciones, fecha_pago_real, forma_pago } = req.body;
  if (!id_captacion || !monto_pagado || !tipo_pago) {
    return res.status(400).json({ error: 'id_captacion, monto_pagado y tipo_pago son requeridos' });
  }
  if (!fecha_pago_real) {
    return res.status(400).json({ error: 'fecha_pago_real es requerida' });
  }
  if (!TIPOS_VALIDOS.includes(tipo_pago)) {
    return res.status(400).json({ error: `tipo_pago debe ser: ${TIPOS_VALIDOS.join(', ')}` });
  }
  const montoNum = parseFloat(monto_pagado);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: 'monto_pagado debe ser un número mayor a 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: captaciones } = await client.query(
      'SELECT * FROM captaciones WHERE id = $1 FOR UPDATE',
      [id_captacion]
    );
    if (captaciones.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Captación no encontrada' });
    }
    const captacion = captaciones[0];
    if (captacion.estado === 'devuelta') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La captación ya fue devuelta totalmente' });
    }

    const { rows: [devInsertada] } = await client.query(
      `INSERT INTO devoluciones (id_captacion, fecha_pago_real, monto_pagado, tipo_pago, forma_pago,
        capital_amortizado, interes_pagado, saldo_capital_post_pago, cuotas_restantes_post_pago,
        observaciones, creado_por_id, creado_por_nombre)
       VALUES ($1,$2,$3,$4,$5,0,0,0,0,$6,$7,$8) RETURNING *`,
      [id_captacion, fecha_pago_real, monto_pagado, tipo_pago, forma_pago || 'transferencia',
       observaciones || null, req.user?.id || null, req.user?.nombre || req.user?.username || null]
    );

    // Replay: recalcular TODAS las devoluciones de la captación en orden cronológico
    const { rows: todas } = await client.query(
      'SELECT * FROM devoluciones WHERE id_captacion = $1 ORDER BY fecha_pago_real, fecha_registro',
      [id_captacion]
    );
    let saldo = parseFloat(captacion.monto_capital);
    const cuotaBase = parseFloat(captacion.valor_cuota_base);
    const tasaPeriodo = parseFloat(captacion.tasa_interes_mensual);
    const tipoAmortizacion = captacion.tipo_amortizacion || 'flat';
    let devolucionFinal = null;

    for (const d of todas) {
      const resultado = calcularPago({
        tipoPago: d.tipo_pago,
        montoPagado: parseFloat(d.monto_pagado),
        saldoCapitalActual: saldo,
        tasaMensual: tasaPeriodo,
        cuotaBase,
        tipoAmortizacion,
        montoCapitalOriginal: parseFloat(captacion.monto_capital),
      });

      // VALIDACIONES DE NEGOCIO — solo para la devolución recién insertada
      if (d.id === devInsertada.id) {
        const interesPeriodo = resultado.interesPagado;
        const cuotaCompleta  = cuotaBase + interesPeriodo;
        const monto = parseFloat(d.monto_pagado);
        const tol = 1;
        if (d.tipo_pago === 'adelanto_parcial' && monto < interesPeriodo - tol) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `El monto ($${monto.toFixed(2)}) es menor al interés del periodo ($${interesPeriodo.toFixed(2)}). Registralo como "Solo interés" o aumentá el monto.`,
          });
        }
        if (d.tipo_pago === 'cuota_completa' && Math.abs(monto - cuotaCompleta) > tol) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `El monto ($${monto.toFixed(2)}) no coincide con la cuota completa ($${cuotaCompleta.toFixed(2)}). Usá "Adelanto parcial" si querés otro monto.`,
          });
        }
        if (d.tipo_pago === 'solo_interes' && Math.abs(monto - interesPeriodo) > tol) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `El monto ($${monto.toFixed(2)}) no coincide con el interés del periodo ($${interesPeriodo.toFixed(2)}). Ajustá el monto o cambiá el tipo.`,
          });
        }
      }

      await client.query(
        `UPDATE devoluciones SET capital_amortizado=$1, interes_pagado=$2,
           saldo_capital_post_pago=$3, cuotas_restantes_post_pago=$4 WHERE id=$5`,
        [resultado.capitalAmortizado, resultado.interesPagado,
         resultado.saldoCapitalPostPago, resultado.cuotasRestantesPostPago, d.id]
      );
      saldo = resultado.saldoCapitalPostPago;
      if (d.id === devInsertada.id) devolucionFinal = { ...d, ...resultado };
    }

    // Cerrar en $0 si queda residuo de redondeo
    if (saldo > 0 && saldo < 1) {
      saldo = 0;
      const ultima = todas[todas.length - 1];
      await client.query(
        'UPDATE devoluciones SET saldo_capital_post_pago = 0 WHERE id = $1', [ultima.id]
      );
      if (devolucionFinal) devolucionFinal.saldoCapitalPostPago = 0;
    }
    const nuevoEstado = saldo === 0 ? 'devuelta' : 'activa';
    await client.query('UPDATE captaciones SET estado = $1 WHERE id = $2', [nuevoEstado, id_captacion]);
    await client.query('COMMIT');
    res.status(201).json(devolucionFinal);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.get('/:id_captacion', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM devoluciones WHERE id_captacion = $1 ORDER BY fecha_pago_real, fecha_registro',
      [req.params.id_captacion]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM devoluciones WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Devolución no encontrada' });
    }
    const idCap = rows[0].id_captacion;
    // Lock de la captación para evitar races con un POST simultáneo
    await client.query('SELECT * FROM captaciones WHERE id = $1 FOR UPDATE', [idCap]);
    await client.query('DELETE FROM devoluciones WHERE id = $1', [req.params.id]);

    const { rows: [captacion] } = await client.query('SELECT * FROM captaciones WHERE id = $1', [idCap]);
    const { rows: restantes } = await client.query(
      'SELECT * FROM devoluciones WHERE id_captacion = $1 ORDER BY fecha_pago_real, fecha_registro',
      [idCap]
    );
    let saldo = parseFloat(captacion.monto_capital);
    const cuotaBase = parseFloat(captacion.valor_cuota_base);
    const tasaPeriodo = parseFloat(captacion.tasa_interes_mensual);
    const tipoAmortizacion = captacion.tipo_amortizacion || 'flat';
    for (const d of restantes) {
      const r = calcularPago({
        tipoPago: d.tipo_pago,
        montoPagado: parseFloat(d.monto_pagado),
        saldoCapitalActual: saldo,
        tasaMensual: tasaPeriodo,
        cuotaBase,
        tipoAmortizacion,
        montoCapitalOriginal: parseFloat(captacion.monto_capital),
      });
      await client.query(
        'UPDATE devoluciones SET capital_amortizado=$1, interes_pagado=$2, saldo_capital_post_pago=$3, cuotas_restantes_post_pago=$4 WHERE id=$5',
        [r.capitalAmortizado, r.interesPagado, r.saldoCapitalPostPago, r.cuotasRestantesPostPago, d.id]
      );
      saldo = r.saldoCapitalPostPago;
    }
    if (saldo > 0 && saldo < 1) {
      saldo = 0;
      if (restantes.length > 0) {
        const ultima = restantes[restantes.length - 1];
        await client.query('UPDATE devoluciones SET saldo_capital_post_pago = 0 WHERE id = $1', [ultima.id]);
      }
    }
    const nuevoEstado = saldo === 0 ? 'devuelta' : 'activa';
    await client.query('UPDATE captaciones SET estado = $1 WHERE id = $2', [nuevoEstado, idCap]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/devoluciones/:id/recibo — PDF del recibo de devolución
router.get('/:id/recibo', async (req, res, next) => {
  try {
    const { rows: devs } = await pool.query('SELECT * FROM devoluciones WHERE id = $1', [req.params.id]);
    if (devs.length === 0) return res.status(404).json({ error: 'Devolución no encontrada' });
    const dev = devs[0];
    const { rows: caps } = await pool.query(
      `SELECT c.*, i.nombre, i.apellido, i.dni
       FROM captaciones c JOIN clientes i ON i.id = c.id_inversor WHERE c.id = $1`,
      [dev.id_captacion]
    );
    if (caps.length === 0) return res.status(404).json({ error: 'Captación no encontrada' });
    const nombreArchivo = `recibo-devolucion-${dev.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
    const doc = generarReciboDevolucion(dev, caps[0]);
    doc.pipe(res);
  } catch (err) { next(err); }
});

module.exports = router;
