/**
 * Motor de cuotas para EM-Financiera.
 * Funciones puras — sin efectos secundarios, sin acceso a DB.
 *
 * Soporta dos sistemas de amortización:
 *   'aleman'  — capital fijo por cuota, interés sobre saldo (cuota total decreciente)
 *   'frances' — cuota total fija (PMT), interés sobre saldo, capital creciente
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
 * Para sistema 'aleman':
 *   cuotaBase = capital / cuotas (porción de capital fija por mes)
 *   cuota_completa = cuotaBase + interés_mes (decrece cada mes)
 *
 * Para sistema 'frances':
 *   cuotaBase = PMT (cuota total fija)
 *   capital_amortizado = PMT - interés_mes (crece cada mes)
 *
 * @param {object} params
 * @param {'cuota_completa'|'solo_interes'|'adelanto_parcial'} params.tipoPago
 * @param {number} params.montoPagado
 * @param {number} params.saldoCapitalActual
 * @param {number} params.tasaMensual - porcentaje (ej: 7 = 7%)
 * @param {number} params.cuotaBase  - para 'aleman': capital/cuotas; para 'frances': PMT
 * @param {'aleman'|'frances'} [params.tipoAmortizacion='aleman']
 */
function calcularPago({ tipoPago, montoPagado, saldoCapitalActual, tasaMensual, cuotaBase, tipoAmortizacion = 'aleman' }) {
  const r = tasaMensual / 100;
  const interesMes = saldoCapitalActual * r;
  const interesPagado = interesMes;

  let capitalAmortizado;

  if (tipoPago === 'solo_interes') {
    capitalAmortizado = 0;
  } else if (tipoPago === 'cuota_completa') {
    if (tipoAmortizacion === 'frances') {
      // cuotaBase = PMT (pago total fijo), capital = PMT - interés
      capitalAmortizado = cuotaBase - interesMes;
    } else {
      // 'aleman': cuotaBase = porción de capital fija
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
    // n = -log(1 - r×saldo/PMT) / log(1+r)
    const ratio = r * saldoCapitalPostPago / cuotaBase;
    cuotasRestantesPostPago = ratio >= 1 ? 999 : Math.round(-Math.log(1 - ratio) / Math.log(1 + r));
  } else {
    cuotasRestantesPostPago = Math.ceil(saldoCapitalPostPago / cuotaBase);
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
function calcularProyeccion({ montoCapital, tasaMensual, totalCuotas, tipoAmortizacion = 'aleman' }) {
  const r = tasaMensual / 100;
  const cuotaBase = tipoAmortizacion === 'frances'
    ? calcularPMT(montoCapital, tasaMensual, totalCuotas)
    : montoCapital / totalCuotas;

  const tabla = [];
  let saldo = montoCapital;

  for (let i = 1; i <= totalCuotas; i++) {
    const interes = saldo * r;
    let capital;

    if (tipoAmortizacion === 'frances') {
      // Última cuota ajusta diferencias de redondeo
      capital = i < totalCuotas ? cuotaBase - interes : saldo;
    } else {
      capital = i < totalCuotas ? cuotaBase : saldo;
    }

    saldo = Math.max(0, saldo - capital);

    tabla.push({
      cuota: i,
      capitalAmortizado: parseFloat(capital.toFixed(2)),
      interes: parseFloat(interes.toFixed(2)),
      cuotaTotal: parseFloat((capital + interes).toFixed(2)),
      saldoRestante: parseFloat(saldo.toFixed(2)),
    });
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
