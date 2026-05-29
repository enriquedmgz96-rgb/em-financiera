// Captaciones — capital recibido del inversor, a devolver con interés.
// Espejo simétrico de prestamos.js (reusa motorCuotas para cálculos).
const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { saldoCapitalActual, calcularPMT } = require('../services/motorCuotas');

router.get('/', async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (req.query.estado) {
      conditions.push(`c.estado = $${params.length + 1}`);
      params.push(req.query.estado);
    } else if (req.query.incluir_archivadas !== 'true') {
      conditions.push(`c.estado != 'archivada'`);
    }
    if (req.query.id_inversor) {
      conditions.push(`c.id_inversor = $${params.length + 1}`);
      params.push(req.query.id_inversor);
    }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT c.*, i.nombre, i.apellido, i.dni
       FROM captaciones c
       JOIN inversores i ON i.id = c.id_inversor
       ${where} ORDER BY c.fecha_aporte DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const {
    id_inversor, moneda, monto_capital, tasa_interes_mensual,
    total_cuotas, primer_vencimiento, periodicidad,
    tipo_amortizacion, tipo,
    nro_contrato_mutuo, nro_pagare,
    observaciones,
  } = req.body;
  const _periodicidad = periodicidad || 'mensual';
  if (!id_inversor || !monto_capital || !tasa_interes_mensual || !total_cuotas || !primer_vencimiento) {
    return res.status(400).json({
      error: 'Faltan campos requeridos: id_inversor, monto_capital, tasa_interes_mensual, total_cuotas, primer_vencimiento',
    });
  }
  if (parseFloat(monto_capital) <= 0) {
    return res.status(400).json({ error: 'monto_capital debe ser mayor a 0' });
  }
  const tipoAmort = ['flat', 'frances', 'aleman'].includes(tipo_amortizacion) ? tipo_amortizacion : 'flat';
  const tipoCap   = ['plazo_fijo', 'renovable', 'a_la_vista'].includes(tipo) ? tipo : 'plazo_fijo';
  // Frances: valor_cuota_base = PMT. Flat/Alemán: capital / cuotas
  const valor_cuota_base = tipoAmort === 'frances'
    ? parseFloat(calcularPMT(parseFloat(monto_capital), parseFloat(tasa_interes_mensual), parseInt(total_cuotas)).toFixed(2))
    : parseFloat((monto_capital / total_cuotas).toFixed(2));
  try {
    const { rows } = await pool.query(
      `INSERT INTO captaciones
         (id_inversor, moneda, monto_capital, tasa_interes_mensual, total_cuotas,
          valor_cuota_base, primer_vencimiento, periodicidad, tipo_amortizacion, tipo,
          nro_contrato_mutuo, nro_pagare, observaciones,
          creado_por_id, creado_por_nombre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [id_inversor, moneda || 'ARS', monto_capital, tasa_interes_mensual, total_cuotas,
       valor_cuota_base, primer_vencimiento, _periodicidad, tipoAmort, tipoCap,
       nro_contrato_mutuo || null, nro_pagare || null, observaciones || null,
       req.user?.id || null, req.user?.nombre || req.user?.username || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Inversor no encontrado' });
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows: captaciones } = await pool.query(
      `SELECT c.*, i.nombre, i.apellido, i.dni, i.cuit, i.telefono, i.banco_cbu, i.banco_alias
       FROM captaciones c JOIN inversores i ON i.id = c.id_inversor WHERE c.id = $1`,
      [req.params.id]
    );
    if (captaciones.length === 0) return res.status(404).json({ error: 'Captación no encontrada' });
    const captacion = captaciones[0];
    const { rows: devoluciones } = await pool.query(
      'SELECT * FROM devoluciones WHERE id_captacion = $1 ORDER BY fecha_registro',
      [req.params.id]
    );
    const saldo = saldoCapitalActual(parseFloat(captacion.monto_capital), devoluciones);
    const tasa  = parseFloat(captacion.tasa_interes_mensual) / 100;
    const baseInteres = captacion.tipo_amortizacion === 'flat'
      ? parseFloat(captacion.monto_capital)
      : saldo;
    const interes_proximo_mes = parseFloat((baseInteres * tasa).toFixed(2));
    res.json({ ...captacion, devoluciones, saldo_capital_actual: saldo, interes_proximo_mes });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  const { estado, observaciones, nro_contrato_mutuo, nro_pagare } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE captaciones SET
         estado             = COALESCE($1, estado),
         observaciones      = COALESCE($2, observaciones),
         nro_contrato_mutuo = COALESCE($3, nro_contrato_mutuo),
         nro_pagare         = COALESCE($4, nro_pagare)
       WHERE id = $5 RETURNING *`,
      [estado, observaciones, nro_contrato_mutuo, nro_pagare, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Captación no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
