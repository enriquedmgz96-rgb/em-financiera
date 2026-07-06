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
    // Períodos cubiertos = el MÁS avanzado entre:
    //   (a) capital pagado: total - cuotas que faltan (MIN(cuotas_restantes_post_pago))
    //   (b) períodos servidos: cantidad de pagos "cuota completa" o "solo interés"
    // (a) captura a los que pagan adelantos/de más; (b) captura a los que pagan
    // solo el interés del período (están al día aunque no bajen capital) y además
    // es robusto ante el redondeo del contador de cuotas. Sin pagos → faltan todas.
    const CUB = `LEAST(p.total_cuotas, GREATEST(
      p.total_cuotas - COALESCE(MIN(pg.cuotas_restantes_post_pago), p.total_cuotas),
      COUNT(pg.id) FILTER (WHERE pg.tipo_pago IN ('cuota_completa','solo_interes'))
    ))`;
    const VTO = `(p.primer_vencimiento + (${CUB} * CASE p.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date`;
    const { rows: mora } = await pool.query(`
      SELECT p.id, p.monto_capital, p.primer_vencimiento,
             c.nombre, c.apellido, c.dni, c.telefono,
             ${CUB} AS nro_pagos,
             TO_CHAR(${VTO}, 'DD/MM/YYYY') AS proximo_vencimiento
      FROM prestamos p
      JOIN clientes c ON c.id = p.id_cliente
      LEFT JOIN pagos pg ON pg.id_prestamo = p.id
      WHERE p.estado IN ('activo','mora')
      GROUP BY p.id, c.id
      HAVING ${VTO} < CURRENT_DATE
    `);
    const { rows: proximos } = await pool.query(`
      SELECT p.id, p.monto_capital, p.tasa_interes_mensual, p.valor_cuota_base,
             p.primer_vencimiento, c.nombre, c.apellido, c.dni, c.telefono,
             ${CUB} AS nro_pagos,
             TO_CHAR(${VTO}, 'DD/MM/YYYY') AS proximo_vencimiento
      FROM prestamos p
      JOIN clientes c ON c.id = p.id_cliente
      LEFT JOIN pagos pg ON pg.id_prestamo = p.id
      WHERE p.estado IN ('activo','mora')
      GROUP BY p.id, c.id
      HAVING ${VTO} BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY ${VTO}
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

    // Próximas devoluciones (7 días) y mora de captaciones. Mismo criterio que
    // préstamos: el más avanzado entre capital devuelto y períodos servidos
    // (devoluciones "cuota completa" o "solo interés").
    const CUB_C = `LEAST(c.total_cuotas, GREATEST(
      c.total_cuotas - COALESCE(MIN(d.cuotas_restantes_post_pago), c.total_cuotas),
      COUNT(d.id) FILTER (WHERE d.tipo_pago IN ('cuota_completa','solo_interes'))
    ))`;
    const VTO_C = `(c.primer_vencimiento + (${CUB_C} * CASE c.periodicidad WHEN 'semanal' THEN INTERVAL '7 days' ELSE INTERVAL '30 days' END))::date`;
    const { rows: proximasDev } = await pool.query(`
      SELECT c.id, c.monto_capital, c.periodicidad,
             i.nombre, i.apellido, i.dni, i.telefono,
             ${CUB_C} AS nro_devoluciones,
             TO_CHAR(${VTO_C}, 'DD/MM/YYYY') AS proximo_vencimiento
      FROM captaciones c
      JOIN clientes i ON i.id = c.id_inversor
      LEFT JOIN devoluciones d ON d.id_captacion = c.id
      WHERE c.${VIVAS}
      GROUP BY c.id, i.id
      HAVING ${VTO_C} BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY ${VTO_C}
    `);

    const { rows: captacionesMora } = await pool.query(`
      SELECT c.id, c.monto_capital, c.periodicidad,
             i.nombre, i.apellido, i.dni, i.telefono,
             ${CUB_C} AS nro_devoluciones,
             TO_CHAR(${VTO_C}, 'DD/MM/YYYY') AS proximo_vencimiento
      FROM captaciones c
      JOIN clientes i ON i.id = c.id_inversor
      LEFT JOIN devoluciones d ON d.id_captacion = c.id
      WHERE c.${VIVAS}
      GROUP BY c.id, i.id
      HAVING ${VTO_C} < CURRENT_DATE
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

// GET /api/dashboard/balance — balance consolidado Activo (a cobrar) vs Pasivo (a devolver) + tendencia
router.get('/balance', async (req, res, next) => {
  try {
    const VIVOS = "estado NOT IN ('cancelado','archivado')";
    const VIVAS = "estado NOT IN ('devuelta','archivada')";

    // ACTIVO: capital pendiente de cobrar a clientes (préstamos vivos)
    const { rows: [activo] } = await pool.query(`
      SELECT
        COALESCE(SUM(p.monto_capital),0)                                  AS capital_prestado,
        COALESCE(SUM(p.monto_capital - COALESCE(amort.total,0)),0)        AS a_cobrar,
        COUNT(*)                                                          AS operaciones
      FROM prestamos p
      LEFT JOIN (
        SELECT id_prestamo, SUM(capital_amortizado) AS total FROM pagos GROUP BY id_prestamo
      ) amort ON amort.id_prestamo = p.id
      WHERE p.${VIVOS}
    `);

    // PASIVO: capital pendiente de devolver a inversores (captaciones vivas)
    const { rows: [pasivo] } = await pool.query(`
      SELECT
        COALESCE(SUM(c.monto_capital),0)                                  AS capital_captado,
        COALESCE(SUM(c.monto_capital - COALESCE(dev.total,0)),0)          AS a_devolver,
        COUNT(*)                                                          AS operaciones
      FROM captaciones c
      LEFT JOIN (
        SELECT id_captacion, SUM(capital_amortizado) AS total FROM devoluciones GROUP BY id_captacion
      ) dev ON dev.id_captacion = c.id
      WHERE c.${VIVAS}
    `);

    // TENDENCIA: últimos 6 meses de intereses cobrados vs pagados (spread mensual)
    const { rows: tendencia } = await pool.query(`
      WITH meses AS (
        SELECT to_char(d, 'YYYY-MM') AS ym
        FROM generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
          date_trunc('month', CURRENT_DATE),
          INTERVAL '1 month'
        ) d
      ),
      cob AS (
        SELECT to_char(date_trunc('month', fecha_pago_real), 'YYYY-MM') AS ym,
               SUM(interes_pagado) AS interes, SUM(capital_amortizado) AS capital
        FROM pagos GROUP BY 1
      ),
      pag AS (
        SELECT to_char(date_trunc('month', fecha_pago_real), 'YYYY-MM') AS ym,
               SUM(interes_pagado) AS interes, SUM(capital_amortizado) AS capital
        FROM devoluciones GROUP BY 1
      )
      SELECT m.ym                                                        AS mes,
             COALESCE(cob.interes,0)::float                              AS intereses_cobrados,
             COALESCE(pag.interes,0)::float                              AS intereses_pagados,
             (COALESCE(cob.interes,0) - COALESCE(pag.interes,0))::float  AS spread,
             COALESCE(cob.capital,0)::float                              AS capital_cobrado,
             COALESCE(pag.capital,0)::float                              AS capital_devuelto
      FROM meses m
      LEFT JOIN cob ON cob.ym = m.ym
      LEFT JOIN pag ON pag.ym = m.ym
      ORDER BY m.ym
    `);

    const aCobrar   = parseFloat(activo.a_cobrar);
    const aDevolver = parseFloat(pasivo.a_devolver);
    const posicionNeta = parseFloat((aCobrar - aDevolver).toFixed(2));
    const cobertura = aDevolver > 0 ? parseFloat((aCobrar / aDevolver).toFixed(4)) : null;

    res.json({
      activo: {
        capital_prestado: parseFloat(activo.capital_prestado),
        a_cobrar: aCobrar,
        operaciones: parseInt(activo.operaciones),
      },
      pasivo: {
        capital_captado: parseFloat(pasivo.capital_captado),
        a_devolver: aDevolver,
        operaciones: parseInt(pasivo.operaciones),
      },
      posicion_neta: posicionNeta,
      cobertura,
      tendencia,
    });
  } catch (err) { next(err); }
});

module.exports = router;
