/**
 * Motor de cuotas para EM-Financiera.
 * Funciones puras — sin efectos secundarios, sin acceso a DB.
 *
 * Soporta tres sistemas de amortización:
 *
 *  'flat'    — cuota FIJA, interés sobre capital ORIGINAL (el más común en Argentina).
 *              Interés = capital_original × tasa (siempre igual).
 *              Capital mensual = capital / cuotas (fijo).
 *              Ejemplo: $800k, 7%, 6 cuotas → $133.333 + $56.000 = $189.333/mes siempre.
 *
 *  'frances' — cuota FIJA (PMT), interés sobre saldo ACTUAL (decrece el saldo).
 *              La cuota total es siempre la misma pero capital crece e interés baja.
 *
 *  'aleman'  — capital FIJO, interés sobre saldo ACTUAL (cuota total DECRECE).
 *              Primer mes es el más caro, luego baja.
 */

/**
 * Calcula el PMT (cuota fija total) para el sistema francés.
 * PMT = P × r / (1 - (1+r)^-n)
 */
function calcularPMT(montoCapital, tasaMensual, totalCuotas) {
  const r = tasaMensual / 100;
  if (r === 0) return montoCapital / totalCuotas;
  return montoCapital * r / (1 - Math.pow(1 + r, -totalCuotas));
}

/**
 * Calcula el resultado de registrar un pago.
 *
 * @param {object} params
 * @param {'cuota_completa'|'solo_interes'|'adelanto_parcial'} params.tipoPago
 * @param {number} params.montoPagado
 * @param {number} params.saldoCapitalActual
 * @param {number} params.tasaMensual - porcentaje (ej: 7 = 7%)
 * @param {number} params.cuotaBase
 *   - flat/aleman: capital / cuotas (porción de capital fija por mes)
 *   - frances:     PMT (cuota total fija)
 * @param {'flat'|'frances'|'aleman'} [params.tipoAmortizacion='flat']
 * @param {number} [params.montoCapitalOriginal] - solo necesario para 'flat'
 */
function calcularPago({ tipoPago, montoPagado, saldoCapitalActual, tasaMensual, cuotaBase, tipoAmortizacion = 'flat', montoCapitalOriginal = null }) {
  const r = tasaMensual / 100;

  // Interés del mes: flat usa capital original (fijo), los demás usan saldo actual
  const interesMes = tipoAmortizacion === 'flat'
    ? (montoCapitalOriginal || saldoCapitalActual) * r
    : saldoCapitalActual * r;
  const interesPagado = interesMes;

  let capitalAmortizado;

  if (tipoPago === 'solo_interes') {
    capitalAmortizado = 0;
  } else if (tipoPago === 'cuota_completa') {
    if (tipoAmortizacion === 'frances') {
      // cuotaBase = PMT (pago total fijo); capital = PMT - interés del mes
      capitalAmortizado = cuotaBase - interesMes;
    } else {
      // flat y aleman: cuotaBase = porción de capital fija por mes
      capitalAmortizado = cuotaBase;
    }
  } else {
    // adelanto_parcial: todo lo que supere el interés amortiza capital
    capitalAmortizado = montoPagado - interesMes;
  }

  capitalAmortizado = Math.max(0, capitalAmortizado);
  capitalAmortizado = Math.min(capitalAmortizado, saldoCapitalActual);

  const saldoCapitalPostPago = Math.max(0, saldoCapitalActual - capitalAmortizado);

  let cuotasRestantesPostPago;
  if (saldoCapitalPostPago === 0) {
    cuotasRestantesPostPago = 0;
  } else if (tipoAmortizacion === 'frances') {
    const ratio = r * saldoCapitalPostPago / cuotaBase;
    cuotasRestantesPostPago = ratio >= 1 ? 999 : Math.round(-Math.log(1 - ratio) / Math.log(1 + r));
  } else {
    // flat y aleman: cuotas restantes = saldo / capital mensual.
    // Restamos un epsilon para absorber el residuo de punto flotante que deja
    // valor_cuota_base redondeado a 2 decimales; si no, Math.ceil infla en +1
    // (ej. 666666.67 / 133333.33 = 5.0000002 → 6 en vez de 5) y produce mora falsa.
    cuotasRestantesPostPago = Math.ceil(saldoCapitalPostPago / cuotaBase - 1e-6);
  }

  return {
    interesPagado: parseFloat(interesPagado.toFixed(2)),
    capitalAmortizado: parseFloat(capitalAmortizado.toFixed(2)),
    saldoCapitalPostPago: parseFloat(saldoCapitalPostPago.toFixed(2)),
    cuotasRestantesPostPago,
  };
}

/**
 * Proyecta la tabla de cuotas para un préstamo (sin persistir).
 */
function calcularProyeccion({ montoCapital, tasaMensual, totalCuotas, tipoAmortizacion = 'flat' }) {
  const r = tasaMensual / 100;
  const tabla = [];
  let saldo = montoCapital;

  if (tipoAmortizacion === 'flat') {
    // Interés fijo siempre sobre capital original; capital fijo por cuota
    const cuotaBase = montoCapital / totalCuotas;
    const interesFijo = montoCapital * r;
    for (let i = 1; i <= totalCuotas; i++) {
      const capital = i < totalCuotas ? cuotaBase : saldo; // última ajusta redondeo
      saldo = Math.max(0, saldo - capital);
      tabla.push({
        cuota: i,
        capitalAmortizado: parseFloat(capital.toFixed(2)),
        interes: parseFloat(interesFijo.toFixed(2)),
        cuotaTotal: parseFloat((capital + interesFijo).toFixed(2)),
        saldoRestante: parseFloat(saldo.toFixed(2)),
      });
    }
  } else if (tipoAmortizacion === 'frances') {
    // PMT: cuota total fija, interés sobre saldo, capital creciente
    const pmt = calcularPMT(montoCapital, tasaMensual, totalCuotas);
    for (let i = 1; i <= totalCuotas; i++) {
      const interes = saldo * r;
      const capital = i < totalCuotas ? pmt - interes : saldo;
      saldo = Math.max(0, saldo - capital);
      tabla.push({
        cuota: i,
        capitalAmortizado: parseFloat(capital.toFixed(2)),
        interes: parseFloat(interes.toFixed(2)),
        cuotaTotal: parseFloat((capital + interes).toFixed(2)),
        saldoRestante: parseFloat(saldo.toFixed(2)),
      });
    }
  } else {
    // aleman: capital fijo, interés sobre saldo (cuota total decreciente)
    const cuotaBase = montoCapital / totalCuotas;
    for (let i = 1; i <= totalCuotas; i++) {
      const interes = saldo * r;
      const capital = i < totalCuotas ? cuotaBase : saldo;
      saldo = Math.max(0, saldo - capital);
      tabla.push({
        cuota: i,
        capitalAmortizado: parseFloat(capital.toFixed(2)),
        interes: parseFloat(interes.toFixed(2)),
        cuotaTotal: parseFloat((capital + interes).toFixed(2)),
        saldoRestante: parseFloat(saldo.toFixed(2)),
      });
    }
  }

  return tabla;
}

/**
 * Calcula el saldo capital actual de un préstamo a partir de su historial de pagos.
 */
function saldoCapitalActual(montoCapital, pagos) {
  if (!pagos || pagos.length === 0) return montoCapital;
  return parseFloat(pagos[pagos.length - 1].saldo_capital_post_pago);
}

module.exports = { calcularPago, calcularProyeccion, saldoCapitalActual, calcularPMT };
