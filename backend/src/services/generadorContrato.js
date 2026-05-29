/**
 * Generador de Contrato de Mutuo — EM Financiera
 * Enrique Ruben Dominguez, DNI 39.613.450
 * Rivadavia 1065, Arroyito, Córdoba
 */
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, BorderStyle, UnderlineType
} = require('docx');

const ACREEDOR = {
  nombre:    'Enrique Ruben Dominguez',
  dni:       '39.613.450',
  domicilio: 'Rivadavia 1065',
  localidad: 'Arroyito (Pcia. de Córdoba)',
  localidad_corta: 'Arroyito',
};

const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];

function numALetras(n) {
  const unidades = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
                    'diez','once','doce','trece','catorce','quince','dieciséis',
                    'diecisiete','dieciocho','diecinueve'];
  const decenas  = ['','diez','veinte','treinta','cuarenta','cincuenta',
                    'sesenta','setenta','ochenta','noventa'];
  const centenas = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos',
                    'seiscientos','setecientos','ochocientos','novecientos'];
  n = Math.round(n);
  if (n === 0) return 'cero';
  if (n === 100) return 'cien';
  if (n < 20) return unidades[n];
  if (n < 100) {
    const d = Math.floor(n/10), u = n%10;
    return u === 0 ? decenas[d] : decenas[d] + ' y ' + unidades[u];
  }
  if (n < 1000) {
    const c = Math.floor(n/100), r = n%100;
    return r === 0 ? centenas[c] : centenas[c] + ' ' + numALetras(r);
  }
  if (n < 2000) return 'mil' + (n%1000 === 0 ? '' : ' ' + numALetras(n%1000));
  if (n < 1000000) {
    const m = Math.floor(n/1000), r = n%1000;
    return numALetras(m) + ' mil' + (r === 0 ? '' : ' ' + numALetras(r));
  }
  const m = Math.floor(n/1000000), r = n%1000000;
  return numALetras(m) + (m === 1 ? ' millón' : ' millones') + (r === 0 ? '' : ' ' + numALetras(r));
}

function fmtMonto(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0 },
    children: [new TextRun({
      text,
      bold:      opts.bold      ?? false,
      size:      opts.size      ?? 22,
      font:      'Times New Roman',
      underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
    })]
  });
}

function pMixed(runs, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0 },
    children: runs.map(r => new TextRun({
      text:      r.text,
      bold:      r.bold  ?? false,
      size:      r.size  ?? 22,
      font:      'Times New Roman',
      underline: r.underline ? { type: UnderlineType.SINGLE } : undefined,
    }))
  });
}

async function generarContratoMutuo(prestamo) {
  const fecha      = new Date(prestamo.fecha);
  const dia        = fecha.getDate();
  const mes        = MESES[fecha.getMonth()];
  const anio       = fecha.getFullYear();
  const primerVcto = new Date(prestamo.primer_vencimiento);
  const fmtVcto    = `${String(primerVcto.getDate()).padStart(2,'0')}/${String(primerVcto.getMonth()+1).padStart(2,'0')}/${primerVcto.getFullYear()}`;

  const capital    = parseFloat(prestamo.monto_capital);
  const tasa       = parseFloat(prestamo.tasa_interes_mensual);
  const cuotas     = parseInt(prestamo.total_cuotas);
  const cuotaBase  = capital / cuotas;
  const interes    = capital * tasa / 100;
  const cuotaTotal = cuotaBase + interes;
  const periodo    = prestamo.periodicidad === 'semanal' ? 'semanal' : 'mensual';
  const periodoAdj = prestamo.periodicidad === 'semanal' ? 'semanales' : 'mensuales';
  const periodoSig = prestamo.periodicidad === 'semanal'
    ? 'semanas subsiguientes'
    : 'meses subsiguientes';

  const capitalLetras = numALetras(capital);
  const cuotaLetras   = numALetras(Math.round(cuotaTotal));

  const deudor = {
    nombre:    `${prestamo.apellido}, ${prestamo.nombre}`,
    dni:       prestamo.dni,
    cuit:      prestamo.cuit || '—',
    domicilio: prestamo.domicilio_cliente || '—',
    localidad: prestamo.localidad_cliente || '—',
  };
  const garante = {
    nombre:    prestamo.nombre_garantia  || '—',
    dni:       prestamo.dni_garantia     || '—',
    cuil:      prestamo.cuil_garantia    || '—',
    domicilio: prestamo.domicilio_garantia || '—',
  };

  const children = [
    // Título
    p('CONTRATO DE MUTUO', { bold: true, center: true, size: 28, after: 240 }),

    // Encabezado
    pMixed([
      { text: `En ${ACREEDOR.localidad_corta}, Departamento San Justo, Provincia de Córdoba, a los ` },
      { text: `${dia}`, bold: true },
      { text: ` días del mes de ` },
      { text: mes, bold: true },
      { text: ` del año ` },
      { text: String(anio), bold: true },
      { text: `, entre ` },
      { text: ACREEDOR.nombre, bold: true },
      { text: `, DNI: ` },
      { text: ACREEDOR.dni, bold: true },
      { text: `, con domicilio en calle ` },
      { text: ACREEDOR.domicilio, bold: true },
      { text: `, de la localidad de ` },
      { text: ACREEDOR.localidad, bold: true },
      { text: ` por una parte y en adelante "El acreedor", y por la otra el/la Sra/Sr. ` },
      { text: deudor.nombre, bold: true },
      { text: `, CUIT: ` },
      { text: deudor.cuit, bold: true },
      { text: `, DNI: ` },
      { text: deudor.dni, bold: true },
      { text: `, con domicilio en ` },
      { text: deudor.domicilio, bold: true },
      { text: `, en adelante "el deudor", se conviene la celebración del presente CONTRATO DE MUTUO, que se regirá por las normas legales vigentes, y en especial por las cláusulas y condiciones siguientes:` },
    ]),

    pMixed([
      { text: 'PRIMERO: ', bold: true, underline: true },
      { text: `El acreedor entrega, "al deudor", en este acto, en calidad de mutuo, la cantidad de ` },
      { text: `PESOS ${capitalLetras.toUpperCase()} ($ ${fmtMonto(capital)})`, bold: true },
      { text: `, quien lo recibe a entera conformidad y satisfacción, sirviendo la firma del presente de suficiente recibo y carta de adeudo en forma.` },
    ]),

    pMixed([
      { text: 'SEGUNDO: ', bold: true, underline: true },
      { text: `De común acuerdo entre acreedor y "el deudor" se conviene que el capital solicitado y adeudado devengará, a cargo "del deudor", por la espera en la devolución, una tasa por servicio del ` },
      { text: `${tasa}% efectivo ${periodo} directo`, bold: true },
      { text: `.` },
    ]),

    pMixed([
      { text: 'TERCERO: ', bold: true, underline: true },
      { text: `"El deudor" se obliga y compromete a devolver y/o restituir al "acreedor", la suma recibida en calidad de mutuo, de la siguiente manera, a saber: en ` },
      { text: `${cuotas} cuotas ${periodoAdj}`, bold: true },
      { text: `, iguales y consecutivas de ` },
      { text: `PESOS ${cuotaLetras.toUpperCase()} ($ ${fmtMonto(cuotaTotal)})`, bold: true },
      { text: ` cada una, venciendo la primera el día ` },
      { text: fmtVcto, bold: true },
      { text: ` y las restantes en igual día de los ${periodoSig}. Cuando dicho/s vencimiento/s coincidieren con un día inhábil, la/s cuota/s deberá/n ser pagada/s el primer día hábil siguiente, sin que ello altere el término de los vencimientos posteriores. Acuerdan expresamente las partes firmantes que la/s cuota/s estipulada/s precedentemente incluye/n: capital y tasa por servicio. Suscribe "el deudor" y sus codeudores un pagaré "SIN PROTESTO" (Art. 50 Decreto-Ley 5965/63), en garantía del cumplimiento de las obligaciones asumidas a través del presente contrato, considerándoselo parte integrante del presente instrumento.` },
    ]),

    pMixed([
      { text: 'CUARTO: ', bold: true, underline: true },
      { text: `Presente en este acto el/la Sr/a. ` },
      { text: garante.nombre, bold: true },
      { text: `, DNI: ` },
      { text: garante.dni, bold: true },
      { text: `, CUIL: ` },
      { text: garante.cuil, bold: true },
      { text: `, con domicilio en ` },
      { text: garante.domicilio, bold: true },
      { text: `, suscribe/n el presente constituyéndose en "codeudor solidario, liso, llano y principal pagador" de todas y cada una de las obligaciones asumidas por "el deudor" emergentes del presente contrato, renunciando expresamente a los beneficios de excusión, división de los bienes e interpelación previa "del deudor".` },
    ]),

    pMixed([
      { text: 'QUINTO: ', bold: true, underline: true },
      { text: `El pago de la/s cuota/s pactada/s precedentemente deberá efectuarse en el domicilio del acreedor, sito en calle ` },
      { text: `${ACREEDOR.domicilio} de la localidad de ${ACREEDOR.localidad}`, bold: true },
      { text: `, o donde éste lo indicare en lo sucesivo.` },
    ]),

    pMixed([
      { text: 'SEXTO: ', bold: true, underline: true },
      { text: `Dado el hecho de haber "el deudor" y sus codeudores suscripto un pagaré "SIN PROTESTO" (Art. 50 Decreto-Ley 5965/63) en garantía del cumplimiento de la obligación asumida, y atento a que el lugar de pago es el domicilio del "acreedor" (` },
      { text: `${ACREEDOR.domicilio} — ${ACREEDOR.localidad}`, bold: true },
      { text: `), se considerará presentado el pagaré para el cobro en cada uno de los días pactados como vencimiento de cada cuota, obligándose "el deudor" y sus codeudores a concurrir en tales fechas al domicilio del "acreedor".` },
    ]),

    pMixed([
      { text: 'SÉPTIMO: ', bold: true, underline: true },
      { text: `La falta de pago en término de una cualquiera de las cuotas estipuladas hará incurrir "al deudor" en mora automática, de pleno derecho y sin necesidad de interpelación previa, produciéndose la caducidad total de todos los términos otorgados. Para el supuesto de mora, "el deudor" y sus codeudores se obligan a pagar una tasa punitoria equivalente al cincuenta por ciento (50%) adicional sobre la tasa pactada, calculada desde la fecha de mora hasta el efectivo pago total.` },
    ]),

    pMixed([
      { text: 'OCTAVO: ', bold: true, underline: true },
      { text: `Todos los gastos, comisiones, sellados, tasas e impuestos actuales y/o a crearse que graven este contrato y el pagaré que lo integra, serán a cargo y costo exclusivo "del deudor" y sus codeudores.` },
    ]),

    pMixed([
      { text: 'NOVENO: ', bold: true, underline: true },
      { text: `Para todos los efectos contractuales, legales y judiciales emergentes del presente contrato, las partes fijan domicilio en los denunciados precedentemente, acordando voluntariamente someterse en caso de litigio judicial a la jurisdicción ordinaria de los Tribunales de la ciudad de ` },
      { text: 'Arroyito', bold: true },
      { text: `, renunciando al fuero Federal y a todo otro que pudiere corresponderles.` },
    ]),

    p(`Para su constancia, y fiel cumplimiento, previa lectura y ratificación de todos sus términos, se firma el presente en sendos ejemplares de un mismo tenor y solo efecto en lugar y fecha arriba indicados.`, { after: 320 }),

    p(`ARROYITO (Pcia. de Córdoba), ${dia} de ${mes} de ${anio}.`, { center: true, bold: true, after: 480 }),

    // Firmas
    pMixed([
      { text: '______________________________          ______________________________' },
    ], { center: true, after: 80 }),
    pMixed([
      { text: `      ACREEDOR: ${ACREEDOR.nombre}          DEUDOR: ${deudor.nombre}` },
    ], { center: true, after: 80 }),
    pMixed([
      { text: `      DNI: ${ACREEDOR.dni}                               DNI: ${deudor.dni}` },
    ], { center: true, after: 480 }),

    pMixed([
      { text: '______________________________' },
    ], { center: true, after: 80 }),
    pMixed([
      { text: `      CODEUDOR: ${garante.nombre}` },
    ], { center: true, after: 80 }),
    pMixed([
      { text: `      DNI: ${garante.dni}` },
    ], { center: true, after: 640 }),

    // Separador pagaré
    p('— — — — — — — — — — — — — — — — — — — — — — — — — CORTAR AQUÍ — — — — — — — — — — — — — — — — — — — — — — — — —', { center: true, size: 18, after: 320 }),

    // Pagaré
    p('PAGARÉ — SIN PROTESTO (Art. 50 Decreto-Ley 5965/63)', { bold: true, center: true, size: 26, after: 200 }),

    pMixed([
      { text: `TRÁNSITO (Pcia. de Córdoba), ${dia} de ${mes} de ${anio}.` },
    ], { after: 160 }),

    pMixed([
      { text: `Pagaré/mos, "SIN PROTESTO", en forma solidaria, a ` },
      { text: ACREEDOR.nombre, bold: true },
      { text: `, DNI: ` },
      { text: ACREEDOR.dni, bold: true },
      { text: `, o a su orden, en su domicilio ` },
      { text: `${ACREEDOR.domicilio}, ${ACREEDOR.localidad}`, bold: true },
      { text: `, o donde éste posteriormente indique, la cantidad de ` },
      { text: `PESOS ${capitalLetras.toUpperCase()} ($ ${fmtMonto(capital)})`, bold: true },
      { text: ` por igual valor recibido en este acto en calidad de préstamo de dinero. Acepto/amos la jurisdicción de los tribunales ordinarios de la ciudad de Arroyito, renunciando expresamente al fuero federal o a cualquier excepción que pudiere corresponder.` },
    ], { after: 480 }),

    pMixed([
      { text: 'DEUDOR: ______________________________          CODEUDOR: ______________________________' },
    ], { center: true, after: 80 }),
    pMixed([
      { text: `DNI: ${deudor.dni}                                              DNI: ${garante.dni}` },
    ], { center: true, after: 80 }),
    pMixed([
      { text: `DOMICILIO: ${deudor.domicilio}          DOMICILIO: ${garante.domicilio}` },
    ], { center: true }),
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1134, bottom: 1134, left: 1418, right: 1134 }, // 2cm margins
        }
      },
      children,
    }]
  });

  return Packer.toBuffer(doc);
}

// Contrato de mutuo para una CAPTACIÓN. Roles invertidos respecto a un préstamo:
// el INVERSOR es el ACREEDOR (entrega la plata) y EM Financiera (Enrique) es el
// DEUDOR (la recibe y se obliga a devolverla con interés).
async function generarContratoMutuoCaptacion(captacion) {
  const fecha      = new Date(captacion.fecha_aporte);
  const dia        = fecha.getDate();
  const mes        = MESES[fecha.getMonth()];
  const anio       = fecha.getFullYear();
  const primerVcto = new Date(captacion.primer_vencimiento);
  const fmtVcto    = `${String(primerVcto.getDate()).padStart(2,'0')}/${String(primerVcto.getMonth()+1).padStart(2,'0')}/${primerVcto.getFullYear()}`;

  const capital    = parseFloat(captacion.monto_capital);
  const tasa       = parseFloat(captacion.tasa_interes_mensual);
  const cuotas     = parseInt(captacion.total_cuotas);
  const cuotaBase  = capital / cuotas;
  const interes    = capital * tasa / 100;
  const cuotaTotal = cuotaBase + interes;
  const periodo    = captacion.periodicidad === 'semanal' ? 'semanal' : 'mensual';
  const periodoAdj = captacion.periodicidad === 'semanal' ? 'semanales' : 'mensuales';
  const periodoSig = captacion.periodicidad === 'semanal' ? 'semanas subsiguientes' : 'meses subsiguientes';

  const capitalLetras = numALetras(capital);
  const cuotaLetras   = numALetras(Math.round(cuotaTotal));

  // ACREEDOR = el inversor (entrega el dinero)
  const acreedor = {
    nombre:    `${captacion.apellido}, ${captacion.nombre}`,
    dni:       captacion.dni,
    cuit:      captacion.cuit || '—',
    domicilio: captacion.domicilio || '—',
  };
  // DEUDOR = EM Financiera (recibe el dinero y debe devolverlo)
  const deudor = ACREEDOR;

  const children = [
    p('CONTRATO DE MUTUO', { bold: true, center: true, size: 28, after: 240 }),

    pMixed([
      { text: `En ${deudor.localidad_corta}, Departamento San Justo, Provincia de Córdoba, a los ` },
      { text: `${dia}`, bold: true },
      { text: ` días del mes de ` },
      { text: mes, bold: true },
      { text: ` del año ` },
      { text: String(anio), bold: true },
      { text: `, entre el/la Sr/a. ` },
      { text: acreedor.nombre, bold: true },
      { text: `, DNI: ` },
      { text: acreedor.dni, bold: true },
      { text: `, CUIT: ` },
      { text: acreedor.cuit, bold: true },
      { text: `, con domicilio en ` },
      { text: acreedor.domicilio, bold: true },
      { text: `, por una parte y en adelante "El acreedor", y por la otra ` },
      { text: deudor.nombre, bold: true },
      { text: `, DNI: ` },
      { text: deudor.dni, bold: true },
      { text: `, con domicilio en calle ` },
      { text: deudor.domicilio, bold: true },
      { text: `, de la localidad de ` },
      { text: deudor.localidad, bold: true },
      { text: `, en adelante "el deudor", se conviene la celebración del presente CONTRATO DE MUTUO, que se regirá por las normas legales vigentes, y en especial por las cláusulas y condiciones siguientes:` },
    ]),

    pMixed([
      { text: 'PRIMERO: ', bold: true, underline: true },
      { text: `El acreedor entrega "al deudor", en este acto, en calidad de mutuo, la cantidad de ` },
      { text: `PESOS ${capitalLetras.toUpperCase()} ($ ${fmtMonto(capital)})`, bold: true },
      { text: `, quien lo recibe a entera conformidad y satisfacción, sirviendo la firma del presente de suficiente recibo y carta de adeudo en forma.` },
    ]),

    pMixed([
      { text: 'SEGUNDO: ', bold: true, underline: true },
      { text: `De común acuerdo entre acreedor y "el deudor" se conviene que el capital recibido y adeudado devengará, a cargo "del deudor", por la espera en la devolución, una tasa por servicio del ` },
      { text: `${tasa}% efectivo ${periodo} directo`, bold: true },
      { text: `.` },
    ]),

    pMixed([
      { text: 'TERCERO: ', bold: true, underline: true },
      { text: `"El deudor" se obliga y compromete a devolver y/o restituir al "acreedor", la suma recibida en calidad de mutuo, de la siguiente manera, a saber: en ` },
      { text: `${cuotas} cuotas ${periodoAdj}`, bold: true },
      { text: `, iguales y consecutivas de ` },
      { text: `PESOS ${cuotaLetras.toUpperCase()} ($ ${fmtMonto(cuotaTotal)})`, bold: true },
      { text: ` cada una, venciendo la primera el día ` },
      { text: fmtVcto, bold: true },
      { text: ` y las restantes en igual día de los ${periodoSig}. Cuando dicho/s vencimiento/s coincidieren con un día inhábil, la/s cuota/s deberá/n ser pagada/s el primer día hábil siguiente. Acuerdan expresamente las partes que la/s cuota/s estipulada/s incluye/n: capital y tasa por servicio.` },
    ]),

    pMixed([
      { text: 'CUARTO: ', bold: true, underline: true },
      { text: `El pago de la/s cuota/s pactada/s deberá efectuarse mediante transferencia a la cuenta que el "acreedor" indique, o en el domicilio que las partes acuerden.` },
    ]),

    pMixed([
      { text: 'QUINTO: ', bold: true, underline: true },
      { text: `La falta de pago en término de una cualquiera de las cuotas estipuladas hará incurrir "al deudor" en mora automática, de pleno derecho y sin necesidad de interpelación previa, produciéndose la caducidad total de todos los términos otorgados.` },
    ]),

    pMixed([
      { text: 'SEXTO: ', bold: true, underline: true },
      { text: `Para todos los efectos contractuales, legales y judiciales emergentes del presente contrato, las partes fijan domicilio en los denunciados precedentemente, acordando voluntariamente someterse en caso de litigio judicial a la jurisdicción ordinaria de los Tribunales de la ciudad de ` },
      { text: 'Arroyito', bold: true },
      { text: `, renunciando al fuero Federal y a todo otro que pudiere corresponderles.` },
    ]),

    p(`Para su constancia, y fiel cumplimiento, previa lectura y ratificación de todos sus términos, se firma el presente en sendos ejemplares de un mismo tenor y solo efecto en lugar y fecha arriba indicados.`, { after: 320 }),

    p(`ARROYITO (Pcia. de Córdoba), ${dia} de ${mes} de ${anio}.`, { center: true, bold: true, after: 480 }),

    pMixed([
      { text: '______________________________          ______________________________' },
    ], { center: true, after: 80 }),
    pMixed([
      { text: `      ACREEDOR: ${acreedor.nombre}          DEUDOR: ${deudor.nombre}` },
    ], { center: true, after: 80 }),
    pMixed([
      { text: `      DNI: ${acreedor.dni}                               DNI: ${deudor.dni}` },
    ], { center: true, after: 480 }),
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, bottom: 1134, left: 1418, right: 1134 },
        }
      },
      children,
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generarContratoMutuo, generarContratoMutuoCaptacion };
