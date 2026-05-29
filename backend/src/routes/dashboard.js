const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

router.get('/', async (req, res, next) => {
  try {
    // FILTRO CONSISTENTE: solo préstamos vivos (activos/mora).
    // Cancelados y archivados quedan fuera de las 3 métricas de capital
    // para que la ecuación cierre: cartera = recuperado + pendiente.
    const VIVOS = "estado NOT IN ('cancelado','archivado')";

    const { rows: [totales] } = await pool.query(`
      SELECT
        COALESCE(SUM(monto_capital),0) AS capital_total_prestado,
        COUNT(*)                       AS prestamos_activos
      FROM prestamos
      WHERE ${VIVOS}
    `);
    // Movimientos sobre pagos de préstamos vivos
    const { rows: [movimientos] } = await pool.query(`
      SELECT
        COALESCE(SUM(pg.capital_amortizado),0) AS capital_cobrado,
        COALESCE(SUM(pg.interes_pagado),0)     AS intereses_cobrados
      FROM pagos pg
      JOIN prestamos p ON p.id = pg.id_prestamo
      WHERE p.${VIVOS}
    `);
    // Pendiente = SUM(monto_capital - amortizado) por préstamo vivo
    // (incluye los que no tienen pagos — antes quedaban afuera)
    const { rows: [pendiente] } = await pool.query(`
      SELECT COALESCE(SUM(p.monto_capital - COALESCE(amort.total,0)), 0) AS capital_pendiente
      FROM prestamos p
      LEFT JOIN (
        SELECT id_prestamo, SUM(capital_amortizado) AS total
        FROM pagos GROUP BY id_prestamo
      ) amort ON amort.id_prestamo = p.id
      WHERE p.${VIVOS}
    `);
    const { rows: mora } = await pool.query(`
      SELECT p.id, p.monto_capital, p.primer_vencimiento,
             c.nombre, c.apellido, c.dni, c.telefono,
             COUNT(pg.id) AS nro_pagos,
             TO_CHAR((p.primer_vencimiento + (COUNT(pg.id) * CASE p.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date, 'DD/MM/YYYY') AS proximo_vencimiento
      FROM prestamos p
      JOIN clientes c ON c.id = p.id_cliente
      LEFT JOIN pagos pg ON pg.id_prestamo = p.id
      WHERE p.estado = 'activo'
      GROUP BY p.id, c.id
      HAVING (p.primer_vencimiento + (COUNT(pg.id) * CASE p.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date < CURRENT_DATE
    `);
    const { rows: proximos } = await pool.query(`
      SELECT p.id, p.monto_capital, p.tasa_interes_mensual, p.valor_cuota_base,
             p.primer_vencimiento, c.nombre, c.apellido, c.dni, c.telefono,
             COUNT(pg.id) AS nro_pagos,
             TO_CHAR((p.primer_vencimiento + (COUNT(pg.id) * CASE p.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date, 'DD/MM/YYYY') AS proximo_vencimiento
      FROM prestamos p
      JOIN clientes c ON c.id = p.id_cliente
      LEFT JOIN pagos pg ON pg.id_prestamo = p.id
      WHERE p.estado = 'activo'
      GROUP BY p.id, c.id
      HAVING (p.primer_vencimiento + (COUNT(pg.id) * CASE p.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date
             BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY (p.primer_vencimiento + (COUNT(pg.id) * CASE p.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date
    `);
    // ===== MÓDULO PLATA DE TERCEROS =====
    // Mismo filtro de "vivas" (activas + mora) para que la matemática cierre.
    const VIVAS = "estado NOT IN ('devuelta','archivada')";

    const { rows: [capTot] } = await pool.query(`
      SELECT
        COALESCE(SUM(monto_capital),0) AS pasivo_total,
        COUNT(*)                       AS captaciones_activas
      FROM captaciones
      WHERE ${VIVAS}
    `);
    const { rows: [devMov] } = await pool.query(`
      SELECT
        COALESCE(SUM(d.capital_amortizado),0) AS capital_devuelto,
        COALESCE(SUM(d.interes_pagado),0)     AS intereses_pagados
      FROM devoluciones d
      JOIN captaciones c ON c.id = d.id_captacion
      WHERE c.${VIVAS}
    `);
    const { rows: [pasPend] } = await pool.query(`
      SELECT COALESCE(SUM(c.monto_capital - COALESCE(dev.total,0)), 0) AS pasivo_pendiente
      FROM captaciones c
      LEFT JOIN (
        SELECT id_captacion, SUM(capital_amortizado) AS total
        FROM devoluciones GROUP BY id_captacion
      ) dev ON dev.id_captacion = c.id
      WHERE c.${VIVAS}
    `);

    // Próximas devoluciones (7 días) — captaciones cuyo próximo vencimiento se acerca
    const { rows: proximasDev } = await pool.query(`
      SELECT c.id, c.monto_capital, c.periodicidad,
             i.nombre, i.apellido, i.dni, i.telefono,
             COUNT(d.id) AS nro_devoluciones,
             TO_CHAR((c.primer_vencimiento + (COUNT(d.id) *
               CASE c.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END
             ))::date, 'DD/MM/YYYY') AS proximo_vencimiento
      FROM captaciones c
      JOIN inversores i ON i.id = c.id_inversor
      LEFT JOIN devoluciones d ON d.id_captacion = c.id
      WHERE c.${VIVAS}
      GROUP BY c.id, i.id
      HAVING (c.primer_vencimiento + (COUNT(d.id) *
        CASE c.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END
      ))::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY (c.primer_vencimiento + (COUNT(d.id) *
        CASE c.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END
      ))::date
    `);

    // Captaciones en mora (próximo vencimiento ya pasó)
    const { rows: captacionesMora } = await pool.query(`
      SELECT c.id, c.monto_capital, c.periodicidad,
             i.nombre, i.apellido, i.dni, i.telefono,
             COUNT(d.id) AS nro_devoluciones,
             TO_CHAR((c.primer_vencimiento + (COUNT(d.id) *
               CASE c.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END
             ))::date, 'DD/MM/YYYY') AS proximo_vencimiento
      FROM captaciones c
      JOIN inversores i ON i.id = c.id_inversor
      LEFT JOIN devoluciones d ON d.id_captacion = c.id
      WHERE c.${VIVAS}
      GROUP BY c.id, i.id
      HAVING (c.primer_vencimiento + (COUNT(d.id) *
        CASE c.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END
      ))::date < CURRENT_DATE
    `);

    // Spread financiero = intereses cobrados − intereses pagados
    const interesesCobrados = parseFloat(movimientos.intereses_cobrados);
    const interesesPagados  = parseFloat(devMov.intereses_pagados);
    const spreadFinanciero  = parseFloat((interesesCobrados - interesesPagados).toFixed(2));

    // Cobertura: capital pendiente de cobrar ÷ pasivo pendiente
    // (si baja de 1, no me alcanza con lo que tengo para devolver lo que debo)
    const capPendiente = parseFloat(pendiente.capital_pendiente);
    const pasPendiente = parseFloat(pasPend.pasivo_pendiente);
    const cobertura = pasPendiente > 0
      ? parseFloat((capPendiente / pasPendiente).toFixed(2))
      : null;

    res.json({
      // Activo (préstamos a clientes)
      capital_total_prestado: parseFloat(totales.capital_total_prestado),
      capital_cobrado:        parseFloat(movimientos.capital_cobrado),
      capital_pendiente:      capPendiente,
      intereses_cobrados:     interesesCobrados,
      prestamos_activos:      parseInt(totales.prestamos_activos),
      prestamos_en_mora:      mora.length,
      en_mora:                mora,
      proximos_a_vencer:      proximos,

      // Pasivo (captaciones de inversores)
      terceros: {
        pasivo_total:         parseFloat(capTot.pasivo_total),
        capital_devuelto:     parseFloat(devMov.capital_devuelto),
        pasivo_pendiente:     pasPendiente,
        intereses_pagados:    interesesPagados,
        captaciones_activas:  parseInt(capTot.captaciones_activas),
        captaciones_en_mora:  captacionesMora.length,
        spread_financiero:    spreadFinanciero,
        cobertura,
        en_mora:              captacionesMora,
        proximas_devoluciones: proximasDev,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
