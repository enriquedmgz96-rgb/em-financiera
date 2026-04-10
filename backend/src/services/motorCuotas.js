/**
 * Motor de cuotas para EM-Financiera.
 * Funciones puras — sin efectos secundarios, sin acceso a DB.
 */

function calcularPago({ tipoPago, montoPagado, saldoCapitalActual, tasaMensual, cuotaBase }) {
  const interesMes = saldoCapitalActual * (tasaMensual / 100);

  let capitalAmortizado;
  const interesPagado = interesMes;

  if (tipoPago === 'solo_interes') {
    capitalAmortizado = 0;
  } else if (tipoPago === 'cuota_completa') {
    capitalAmortizado = cuotaBase;
  } else {
    // adelanto_parcial: todo lo que supere el interés amortiza capital
    capitalAmortizado = montoPagado - interesMes;
  }

  capitalAmortizado = Math.max(0, capitalAmortizado);
  capitalAmortizado = Math.min(capitalAmortizado, saldoCapitalActual);

  const saldoCapitalPostPago = Math.max(0, saldoCapitalActual - capitalAmortizado);
  const cuotasRestantesPostPago = saldoCapitalPostPago === 0 ? 0 : Math.ceil(saldoCapitalPostPago / cuotaBase);

  return {
    interesPagado: parseFloat(interesPagado.toFixed(2)),
    capitalAmortizado: parseFloat(capitalAmortizado.toFixed(2)),
    saldoCapitalPostPago: parseFloat(saldoCapitalPostPago.toFixed(2)),
    cuotasRestantesPostPago,
  };
}

function calcularProyeccion({ montoCapital, tasaMensual, totalCuotas }) {
  const cuotaBase = montoCapital / totalCuotas;
  const tabla = [];
  let saldo = montoCapital;

  for (let i = 1; i <= totalCuotas; i++) {
    const interes = saldo * (tasaMensual / 100);
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

  return tabla;
}

function saldoCapitalActual(montoCapital, pagos) {
  if (!pagos || pagos.length === 0) return montoCapital;
  return parseFloat(pagos[pagos.length - 1].saldo_capital_post_pago);
}

module.exports = { calcularPago, calcularProyeccion, saldoCapitalActual };
