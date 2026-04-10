const { calcularPago, calcularProyeccion, saldoCapitalActual } = require('../src/services/motorCuotas');

describe('calcularPago - cuota_completa', () => {
  test('amortiza cuota_base y paga interes correctamente', () => {
    const result = calcularPago({
      tipoPago: 'cuota_completa',
      montoPagado: 20000,
      saldoCapitalActual: 100000,
      tasaMensual: 10,
      cuotaBase: 10000,
    });
    expect(result.interesPagado).toBeCloseTo(10000);
    expect(result.capitalAmortizado).toBeCloseTo(10000);
    expect(result.saldoCapitalPostPago).toBeCloseTo(90000);
    expect(result.cuotasRestantesPostPago).toBe(9);
  });
});

describe('calcularPago - solo_interes', () => {
  test('solo paga interes, capital no se reduce', () => {
    const result = calcularPago({
      tipoPago: 'solo_interes',
      montoPagado: 10000,
      saldoCapitalActual: 100000,
      tasaMensual: 10,
      cuotaBase: 10000,
    });
    expect(result.interesPagado).toBeCloseTo(10000);
    expect(result.capitalAmortizado).toBe(0);
    expect(result.saldoCapitalPostPago).toBeCloseTo(100000);
    expect(result.cuotasRestantesPostPago).toBe(10);
  });
});

describe('calcularPago - adelanto_parcial', () => {
  test('excedente sobre interes reduce capital', () => {
    const result = calcularPago({
      tipoPago: 'adelanto_parcial',
      montoPagado: 13000,
      saldoCapitalActual: 100000,
      tasaMensual: 10,
      cuotaBase: 10000,
    });
    // interes = 100000 * 10/100 = 10000
    // capital_amortizado = 13000 - 10000 = 3000
    expect(result.interesPagado).toBeCloseTo(10000);
    expect(result.capitalAmortizado).toBeCloseTo(3000);
    expect(result.saldoCapitalPostPago).toBeCloseTo(97000);
    expect(result.cuotasRestantesPostPago).toBe(10); // ceil(97000/10000)
  });

  test('cancela el prestamo cuando paga todo el capital', () => {
    const result = calcularPago({
      tipoPago: 'adelanto_parcial',
      montoPagado: 12000,
      saldoCapitalActual: 10000,
      tasaMensual: 10,
      cuotaBase: 10000,
    });
    // interes = 1000, capital = 11000 pero saldo solo es 10000
    expect(result.saldoCapitalPostPago).toBe(0);
    expect(result.cuotasRestantesPostPago).toBe(0);
  });
});

describe('calcularProyeccion', () => {
  test('proyeccion de 3 cuotas con capital 30000 y tasa 10%', () => {
    const tabla = calcularProyeccion({
      montoCapital: 30000,
      tasaMensual: 10,
      totalCuotas: 3,
    });
    expect(tabla).toHaveLength(3);
    expect(tabla[0].cuota).toBe(1);
    expect(tabla[0].capitalAmortizado).toBeCloseTo(10000);
    expect(tabla[0].interes).toBeCloseTo(3000);
    expect(tabla[0].cuotaTotal).toBeCloseTo(13000);
    expect(tabla[0].saldoRestante).toBeCloseTo(20000);
    expect(tabla[2].saldoRestante).toBeCloseTo(0);
  });
});

describe('saldoCapitalActual', () => {
  test('retorna monto original si no hay pagos', () => {
    expect(saldoCapitalActual(100000, [])).toBe(100000);
  });

  test('retorna el saldo del ultimo pago', () => {
    const pagos = [
      { saldo_capital_post_pago: 90000 },
      { saldo_capital_post_pago: 80000 },
    ];
    expect(saldoCapitalActual(100000, pagos)).toBe(80000);
  });
});
