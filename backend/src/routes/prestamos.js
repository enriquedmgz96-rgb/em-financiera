const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { saldoCapitalActual, calcularProyeccion, calcularPMT } = require('../services/motorCuotas');
const { generarContrato, generarResumen } = require('../services/generadorPDF');

router.get('/', async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (req.query.estado) {
      conditions.push(`p.estado = $${params.length + 1}`);
      params.push(req.query.estado);
    } else if (req.query.incluir_archivados !== 'true') {
      // Por defecto excluir archivados de la lista principal
      conditions.push(`p.estado != 'archivado'`);
    }
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
  const {
    id_cliente, moneda, monto_capital, tasa_interes_mensual,
    total_cuotas, primer_vencimiento, pagare_firmado,
    nombre_garantia, telefono_garantia, dni_garantia, cuil_garantia, domicilio_garantia,
    observaciones, periodicidad, motivo,
    tipo_amortizacion, contrato_firmado, requiere_garantia
  } = req.body;
  const _periodicidad = periodicidad || 'mensual';
  const _requiereGarantia = requiere_garantia === undefined ? true : !!requiere_garantia;
  if (!id_cliente || !monto_capital || !tasa_interes_mensual || !total_cuotas || !primer_vencimiento) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id_cliente, monto_capital, tasa_interes_mensual, total_cuotas, primer_vencimiento' });
  }
  const tipoAmort = ['flat', 'frances', 'aleman'].includes(tipo_amortizacion) ? tipo_amortizacion : 'flat';
  // Frances: valor_cuota_base = PMT (cuota total fija con interés sobre saldo)
  // Flat/Alemán: valor_cuota_base = capital / cuotas (solo la porción de capital)
  const valor_cuota_base = tipoAmort === 'frances'
    ? parseFloat(calcularPMT(parseFloat(monto_capital), parseFloat(tasa_interes_mensual), parseInt(total_cuotas)).toFixed(2))
    : parseFloat((monto_capital / total_cuotas).toFixed(2));
  try {
    const { rows } = await pool.query(
      `INSERT INTO prestamos
         (id_cliente, moneda, monto_capital, tasa_interes_mensual, total_cuotas,
          valor_cuota_base, primer_vencimiento, periodicidad, estado, pagare_firmado, motivo,
          nombre_garantia, telefono_garantia, dni_garantia, cuil_garantia, domicilio_garantia,
          observaciones, tipo_amortizacion, contrato_firmado, requiere_garantia,
          creado_por_id, creado_por_nombre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'activo',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [id_cliente, moneda || 'ARS', monto_capital, tasa_interes_mensual, total_cuotas,
        valor_cuota_base, primer_vencimiento, _periodicidad, pagare_firmado || false, motivo || null,
        nombre_garantia || null, telefono_garantia || null, dni_garantia || null,
        cuil_garantia || null, domicilio_garantia || null,
        observaciones || null,
        tipoAmort, contrato_firmado || false, _requiereGarantia, req.user?.id || null, req.user?.nombre || req.user?.username || null]
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
      'SELECT * FROM pagos WHERE id_prestamo = $1 ORDER BY fecha_pago_real, fecha_registro', [req.params.id]
    );
    const saldo = saldoCapitalActual(parseFloat(prestamo.monto_capital), pagos);
    const tasa = parseFloat(prestamo.tasa_interes_mensual) / 100;
    // Flat: interés siempre sobre capital original; otros: sobre saldo actual
    const baseInteres = prestamo.tipo_amortizacion === 'flat'
      ? parseFloat(prestamo.monto_capital)
      : saldo;
    const interes_proximo_mes = parseFloat((baseInteres * tasa).toFixed(2));
    res.json({ ...prestamo, pagos, saldo_capital_actual: saldo, interes_proximo_mes });
  } catch (err) { next(err); }
});

const ESTADOS_PRESTAMO = ['activo', 'cancelado', 'mora', 'archivado'];
router.put('/:id', async (req, res, next) => {
  const { estado, pagare_firmado, observaciones, contrato_firmado, requiere_garantia } = req.body;
  if (estado != null && !ESTADOS_PRESTAMO.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Debe ser: ${ESTADOS_PRESTAMO.join(', ')}` });
  }
  try {
    // No permitir marcar 'cancelado' manualmente si todavía queda saldo por cobrar.
    if (estado === 'cancelado') {
      const { rows: pr } = await pool.query('SELECT monto_capital FROM prestamos WHERE id = $1', [req.params.id]);
      const { rows: pagos } = await pool.query('SELECT * FROM pagos WHERE id_prestamo = $1 ORDER BY fecha_pago_real, fecha_registro', [req.params.id]);
      if (pr.length && saldoCapitalActual(parseFloat(pr[0].monto_capital), pagos) > 1) {
        return res.status(400).json({ error: 'No se puede marcar como finalizado un préstamo con saldo pendiente. Registrá el pago final.' });
      }
    }
    const { rows } = await pool.query(
      `UPDATE prestamos SET
         estado            = COALESCE($1, estado),
         pagare_firmado    = COALESCE($2, pagare_firmado),
         observaciones     = COALESCE($3, observaciones),
         contrato_firmado  = COALESCE($5, contrato_firmado),
         requiere_garantia = COALESCE($6, requiere_garantia)
       WHERE id = $4 RETURNING *`,
      [estado, pagare_firmado, observaciones, req.params.id, contrato_firmado,
       requiere_garantia === undefined ? null : requiere_garantia]
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
      tipoAmortizacion: prestamo.tipo_amortizacion || 'aleman',
    });
    const nombreArchivo = `contrato-prestamo-${prestamo.id}-${prestamo.apellido.toLowerCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
    const doc = generarContrato(prestamo, tabla);
    doc.pipe(res);
  } catch (err) { next(err); }
});

router.get('/:id/resumen', async (req, res, next) => {
  try {
    const { rows: prestamos } = await pool.query(
      `SELECT p.*, c.nombre, c.apellido, c.dni, c.cuit, c.telefono
       FROM prestamos p JOIN clientes c ON c.id = p.id_cliente WHERE p.id = $1`,
      [req.params.id]
    );
    if (prestamos.length === 0) return res.status(404).json({ error: 'Préstamo no encontrado' });
    const prestamo = prestamos[0];
    const { rows: pagos } = await pool.query(
      'SELECT * FROM pagos WHERE id_prestamo = $1 ORDER BY fecha_pago_real, fecha_registro', [req.params.id]
    );
    const saldo = saldoCapitalActual(parseFloat(prestamo.monto_capital), pagos);
    const tasa = parseFloat(prestamo.tasa_interes_mensual) / 100;
    // Flat: interés siempre sobre capital original; otros: sobre saldo actual
    const baseIntResumen = prestamo.tipo_amortizacion === 'flat'
      ? parseFloat(prestamo.monto_capital)
      : saldo;
    const interesProxMes = parseFloat((baseIntResumen * tasa).toFixed(2));
    const nombreArchivo = `resumen-prestamo-${prestamo.id}-${prestamo.apellido.toLowerCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
    const doc = generarResumen(prestamo, pagos, saldo, interesProxMes);
    doc.pipe(res);
  } catch (err) { next(err); }
});

// GET /api/prestamos/:id/contrato-mutuo — descarga DOCX del contrato mutuo
router.get('/:id/contrato-mutuo', async (req, res, next) => {
  try {
    const { rows: prestamos } = await pool.query(
      `SELECT p.*, c.nombre, c.apellido, c.dni, c.cuit, c.telefono, c.domicilio
       FROM prestamos p JOIN clientes c ON c.id = p.id_cliente
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (prestamos.length === 0) return res.status(404).json({ error: 'Préstamo no encontrado' });

    const prestamo = prestamos[0];
    const { rows: pagos } = await pool.query(
      'SELECT * FROM pagos WHERE id_prestamo = $1 ORDER BY fecha_pago_real, fecha_registro',
      [req.params.id]
    );

    const { saldoCapitalActual } = require('../services/motorCuotas');
    const { generarContratoMutuo } = require('../services/generadorContrato');

    const saldo = saldoCapitalActual(parseFloat(prestamo.monto_capital), pagos);
    const interes = parseFloat((saldo * (parseFloat(prestamo.tasa_interes_mensual) / 100)).toFixed(2));

    const nombreArchivo = `mutuo-prestamo-${prestamo.id}-${prestamo.apellido.toLowerCase()}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);

    const buffer = await generarContratoMutuo(prestamo, pagos);
    res.send(buffer);
  } catch (err) { next(err); }
});

module.exports = router;
