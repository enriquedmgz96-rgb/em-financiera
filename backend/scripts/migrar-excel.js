/**
 * Migración única desde "Centro de control.xlsx"
 * Ejecutar: node src/db/migrate.js && node scripts/migrar-excel.js
 */
require('dotenv').config();
const pool = require('../src/db/connection');

const CLIENTES = [
  { nombre: 'Matias',  apellido: 'Salas',  dni: '39447316', cuit: '20394473163', telefono: '3563401992', origen: 'EMM' },
  { nombre: 'Ricardo', apellido: 'Zorman', dni: '39447346', cuit: '20394473465', telefono: '3574652461', origen: 'EMM' },
  // NOTA: Lucas Vivas no tenía CUIT en el Excel — completar antes de migrar si se requiere cumplimiento UIF
  { nombre: 'Lucas',   apellido: 'Vivas',  dni: '38020591', cuit: null,          telefono: '3576415895', origen: 'EMM' },
];

const PRESTAMOS = [
  { dni_cliente: '39447316', fecha: '2025-02-05', monto_capital: 800000,  tasa: 7.5, cuotas: 6, primer_vcto: '2025-03-05', motivo: 'Negocio/Emprendimiento' },
  { dni_cliente: '39447346', fecha: '2025-02-05', monto_capital: 1000000, tasa: 7.5, cuotas: 6, primer_vcto: '2025-03-05', motivo: 'Negocio/Emprendimiento' },
  { dni_cliente: '38020591', fecha: '2025-02-13', monto_capital: 450000,  tasa: 7.5, cuotas: 3, primer_vcto: '2025-03-18', motivo: 'Grandes Compras' },
];

async function migrar() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Migrando clientes...');
    const clienteIds = {};
    for (const c of CLIENTES) {
      const { rows } = await client.query(
        `INSERT INTO clientes (nombre, apellido, dni, cuit, telefono, origen)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (dni) DO UPDATE SET origen = EXCLUDED.origen
         RETURNING id, dni`,
        [c.nombre, c.apellido, c.dni, c.cuit, c.telefono, c.origen]
      );
      clienteIds[rows[0].dni] = rows[0].id;
      console.log(`  ✓ ${c.nombre} ${c.apellido} → id ${rows[0].id}`);
    }

    console.log('Migrando préstamos...');
    const prestamoIds = {};
    for (const p of PRESTAMOS) {
      const idCliente = clienteIds[p.dni_cliente];
      const cuotaBase = parseFloat((p.monto_capital / p.cuotas).toFixed(2));
      const { rows } = await client.query(
        `INSERT INTO prestamos
           (id_cliente, fecha, moneda, monto_capital, tasa_interes_mensual, total_cuotas,
            valor_cuota_base, primer_vencimiento, estado, motivo)
         VALUES ($1,$2,'ARS',$3,$4,$5,$6,$7,'activo',$8)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [idCliente, p.fecha, p.monto_capital, p.tasa, p.cuotas, cuotaBase, p.primer_vcto, p.motivo]
      );
      if (rows.length > 0) {
        prestamoIds[p.dni_cliente] = rows[0].id;
        console.log(`  ✓ Préstamo ${p.dni_cliente}: $${p.monto_capital} → id ${rows[0].id}`);
      } else {
        const ex = await client.query(
          `SELECT p.id FROM prestamos p JOIN clientes c ON c.id = p.id_cliente WHERE c.dni = $1 ORDER BY p.fecha LIMIT 1`,
          [p.dni_cliente]
        );
        prestamoIds[p.dni_cliente] = ex.rows[0]?.id;
        console.log(`  ⚠ Préstamo ${p.dni_cliente} ya existía, saltando.`);
      }
    }

    console.log('Migrando pago de Salas...');
    const idPrestamo = prestamoIds['39447316'];
    const saldo = 800000;
    const interes = parseFloat((saldo * 0.075).toFixed(2));
    const capitalAmort = parseFloat((200000 - interes).toFixed(2));
    const saldoPost = parseFloat((saldo - capitalAmort).toFixed(2));
    const cuotaBase = parseFloat((800000 / 6).toFixed(2));
    const cuotasRestantes = Math.ceil(saldoPost / cuotaBase);

    const { rowCount } = await client.query('SELECT 1 FROM pagos WHERE id_prestamo = $1', [idPrestamo]);
    if (rowCount === 0) {
      await client.query(
        `INSERT INTO pagos
           (id_prestamo, fecha_pago, monto_pagado, tipo_pago, capital_amortizado,
            interes_pagado, saldo_capital_post_pago, cuotas_restantes_post_pago, observaciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [idPrestamo, '2025-02-05', 200000, 'adelanto_parcial', capitalAmort, interes, saldoPost,
         cuotasRestantes, 'Pago migrado desde Excel Centro de control']
      );
      console.log(`  ✓ Pago migrado: capital amort $${capitalAmort}, saldo $${saldoPost}`);
    } else {
      console.log('  ⚠ Pago ya existía, saltando.');
    }

    await client.query('COMMIT');
    console.log('\n✓ Migración completada exitosamente.');
    console.log('IMPORTANTE: Verificar CUIT de Lucas Vivas — quedó sin CUIT en el sistema.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en migración:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrar();
