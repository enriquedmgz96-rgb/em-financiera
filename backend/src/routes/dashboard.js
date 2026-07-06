const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

router.get('/', async (req, res, next) => {
  try {
    // FILTRO CONSISTENTE: solo préstamos vivos (activos/mora).
    // Cancelados y archivados quedan fuera de las 3 métricas de capital
    // para que la ecuación cierre: cartera = recuperado + pendiente.
    const VIVOS = "estado NOT IN ('cancelado','archivado')";

    // Finanzas de préstamos POR MONEDA (nunca se suman ARS + USD)
    const { rows: finPrestRows } = await pool.query(`
      SELECT p.moneda,
        COALESCE(SUM(p.monto_capital),0)                          AS capital_total_prestado,
        COALESCE(SUM(COALESCE(pg.cap,0)),0)                        AS capital_cobrado,
        COALESCE(SUM(p.monto_capital - COALESCE(pg.cap,0)),0)      AS capital_pendiente,
        COALESCE(SUM(COALESCE(pg.intr,0)),0)                       AS intereses_cobrados,
        COUNT(*)                                                   AS prestamos_activos
      FROM prestamos p
      LEFT JOIN (
        SELECT id_prestamo, SUM(capital_amortizado) AS cap, SUM(interes_pagado) AS intr
        FROM pagos GROUP BY id_prestamo
      ) pg ON pg.id_prestamo = p.id
      WHERE p.${VIVOS}
      GROUP BY p.moneda
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

    // Finanzas de plata de terceros POR MONEDA
    const { rows: finTercRows } = await pool.query(`
      SELECT c.moneda,
        COALESCE(SUM(c.monto_capital),0)                          AS pasivo_total,
        COALESCE(SUM(COALESCE(dv.cap,0)),0)                        AS capital_devuelto,
        COALESCE(SUM(c.monto_capital - COALESCE(dv.cap,0)),0)      AS pasivo_pendiente,
        COALESCE(SUM(COALESCE(dv.intr,0)),0)                       AS intereses_pagados,
        COUNT(*)                                                   AS captaciones_activas
      FROM captaciones c
      LEFT JOIN (
        SELECT id_captacion, SUM(capital_amortizado) AS cap, SUM(interes_pagado) AS intr
        FROM devoluciones GROUP BY id_captacion
      ) dv ON dv.id_captacion = c.id
      WHERE c.${VIVAS}
      GROUP BY c.moneda
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

    // Ensamblar finanzas por moneda (préstamos y terceros), con spread y cobertura
    // calculados dentro de cada moneda — nunca cruzando ARS con USD.
    const monedas = [...new Set([
      ...finPrestRows.map(r => r.moneda),
      ...finTercRows.map(r => r.moneda),
    ])].sort();
    const finanzas_prestamos = [];
    const finanzas_terceros = [];
    for (const mon of monedas) {
      const fp = finPrestRows.find(r => r.moneda === mon);
      const ft = finTercRows.find(r => r.moneda === mon);
      const interesesCobrados = parseFloat(fp?.intereses_cobrados || 0);
      const interesesPagados  = parseFloat(ft?.intereses_pagados || 0);
      const capPendiente = parseFloat(fp?.capital_pendiente || 0);
      const pasPendiente = parseFloat(ft?.pasivo_pendiente || 0);
      if (fp) finanzas_prestamos.push({
        moneda: mon,
        capital_total_prestado: parseFloat(fp.capital_total_prestado),
        capital_cobrado:        parseFloat(fp.capital_cobrado),
        capital_pendiente:      capPendiente,
        intereses_cobrados:     interesesCobrados,
        prestamos_activos:      parseInt(fp.prestamos_activos),
      });
      if (ft) finanzas_terceros.push({
        moneda: mon,
        pasivo_total:      parseFloat(ft.pasivo_total),
        capital_devuelto:  parseFloat(ft.capital_devuelto),
        pasivo_pendiente:  pasPendiente,
        intereses_pagados: interesesPagados,
        captaciones_activas: parseInt(ft.captaciones_activas),
        spread_financiero: parseFloat((interesesCobrados - interesesPagados).toFixed(2)),
        cobertura: pasPendiente > 0 ? parseFloat((capPendiente / pasPendiente).toFixed(2)) : null,
      });
    }

    res.json({
      // Activo (préstamos a clientes) — por moneda + datos generales
      finanzas_prestamos,
      prestamos_activos: finanzas_prestamos.reduce((s, x) => s + x.prestamos_activos, 0),
      prestamos_en_mora: mora.length,
      en_mora:           mora,
      proximos_a_vencer: proximos,

      // Pasivo (captaciones de inversores) — por moneda + datos generales
      terceros: {
        finanzas: finanzas_terceros,
        captaciones_activas: finanzas_terceros.reduce((s, x) => s + x.captaciones_activas, 0),
        captaciones_en_mora: captacionesMora.length,
        en_mora:             captacionesMora,
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

    // ACTIVO por moneda: capital pendiente de cobrar a clientes (préstamos vivos)
    const { rows: activoRows } = await pool.query(`
      SELECT p.moneda,
        COALESCE(SUM(p.monto_capital),0)                                  AS capital_prestado,
        COALESCE(SUM(p.monto_capital - COALESCE(amort.total,0)),0)        AS a_cobrar,
        COUNT(*)                                                          AS operaciones
      FROM prestamos p
      LEFT JOIN (
        SELECT id_prestamo, SUM(capital_amortizado) AS total FROM pagos GROUP BY id_prestamo
      ) amort ON amort.id_prestamo = p.id
      WHERE p.${VIVOS}
      GROUP BY p.moneda
    `);

    // PASIVO por moneda: capital pendiente de devolver a inversores (captaciones vivas)
    const { rows: pasivoRows } = await pool.query(`
      SELECT c.moneda,
        COALESCE(SUM(c.monto_capital),0)                                  AS capital_captado,
        COALESCE(SUM(c.monto_capital - COALESCE(dev.total,0)),0)          AS a_devolver,
        COUNT(*)                                                          AS operaciones
      FROM captaciones c
      LEFT JOIN (
        SELECT id_captacion, SUM(capital_amortizado) AS total FROM devoluciones GROUP BY id_captacion
      ) dev ON dev.id_captacion = c.id
      WHERE c.${VIVAS}
      GROUP BY c.moneda
    `);

    // TENDENCIA por moneda: últimos 6 meses de intereses cobrados vs pagados
    const { rows: tendRows } = await pool.query(`
      WITH meses AS (
        SELECT to_char(d, 'YYYY-MM') AS ym
        FROM generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
          date_trunc('month', CURRENT_DATE),
          INTERVAL '1 month'
        ) d
      ),
      cob AS (
        SELECT p.moneda, to_char(date_trunc('month', pg.fecha_pago_real), 'YYYY-MM') AS ym,
               SUM(pg.interes_pagado) AS interes
        FROM pagos pg JOIN prestamos p ON p.id = pg.id_prestamo GROUP BY 1,2
      ),
      pag AS (
        SELECT c.moneda, to_char(date_trunc('month', d.fecha_pago_real), 'YYYY-MM') AS ym,
               SUM(d.interes_pagado) AS interes
        FROM devoluciones d JOIN captaciones c ON c.id = d.id_captacion GROUP BY 1,2
      ),
      mon AS (SELECT DISTINCT moneda FROM (SELECT moneda FROM cob UNION SELECT moneda FROM pag) x WHERE moneda IS NOT NULL)
      SELECT mon.moneda, m.ym AS mes,
             COALESCE(cob.interes,0)::float AS intereses_cobrados,
             COALESCE(pag.interes,0)::float AS intereses_pagados,
             (COALESCE(cob.interes,0) - COALESCE(pag.interes,0))::float AS spread
      FROM mon CROSS JOIN meses m
      LEFT JOIN cob ON cob.ym = m.ym AND cob.moneda = mon.moneda
      LEFT JOIN pag ON pag.ym = m.ym AND pag.moneda = mon.moneda
      ORDER BY mon.moneda, m.ym
    `);

    // Armar un bloque por cada moneda con datos (activo o pasivo)
    const monedas = [...new Set([
      ...activoRows.map(r => r.moneda),
      ...pasivoRows.map(r => r.moneda),
    ])].sort();
    const por_moneda = monedas.map(mon => {
      const a = activoRows.find(r => r.moneda === mon) || {};
      const p = pasivoRows.find(r => r.moneda === mon) || {};
      const aCobrar   = parseFloat(a.a_cobrar || 0);
      const aDevolver = parseFloat(p.a_devolver || 0);
      return {
        moneda: mon,
        activo: {
          capital_prestado: parseFloat(a.capital_prestado || 0),
          a_cobrar: aCobrar,
          operaciones: parseInt(a.operaciones || 0),
        },
        pasivo: {
          capital_captado: parseFloat(p.capital_captado || 0),
          a_devolver: aDevolver,
          operaciones: parseInt(p.operaciones || 0),
        },
        posicion_neta: parseFloat((aCobrar - aDevolver).toFixed(2)),
        cobertura: aDevolver > 0 ? parseFloat((aCobrar / aDevolver).toFixed(4)) : null,
        tendencia: tendRows.filter(t => t.moneda === mon)
          .map(t => ({ mes: t.mes, intereses_cobrados: t.intereses_cobrados, intereses_pagados: t.intereses_pagados, spread: t.spread })),
      };
    });

    res.json({ por_moneda });
  } catch (err) { next(err); }
});

module.exports = router;
