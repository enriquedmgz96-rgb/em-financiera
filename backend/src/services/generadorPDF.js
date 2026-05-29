const PDFDocument = require('pdfkit');

const FINANCIERA = 'EM Financiera';
const FINANCIERA_CUIT = 'CUIT: XX-XXXXXXXX-X';

function generarContrato(prestamo, tablaCuotas) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 30, bottom: 30, left: 40, right: 40 } });
  const midY = doc.page.height / 2;
  _escribirContrato(doc, prestamo, tablaCuotas, 30, 'COPIA FINANCIERA');
  doc.moveTo(40, midY).lineTo(doc.page.width - 40, midY).dash(4, { space: 4 }).stroke('#999');
  doc.undash();
  doc.font('Helvetica').fontSize(7).fillColor('#999').text('✂ cortar aquí', 0, midY - 9, { align: 'center' });
  _escribirContrato(doc, prestamo, tablaCuotas, midY + 12, 'COPIA CLIENTE');
  doc.end();
  return doc;
}

function _fmtFecha(f) {
  if (!f) return '-';
  const iso = (f instanceof Date) ? f.toISOString() : String(f);
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function _fmtFechaTS(f) {
  if (!f) return '-';
  return new Date(f).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Etiqueta legible del tipo de pago.
// "adelanto_parcial" se distingue según monto vs. cuota completa teórica:
//   monto > cuota_base+interés → "Adelanto parcial"
//   monto < cuota_base+interés → "Pago parcial"
//   monto ≈ cuota_base+interés → "Cuota completa"
function _labelTipoPago(pago, prestamo) {
  const tipo = pago.tipo_pago;
  if (tipo === 'cuota_completa') return 'Cuota completa';
  if (tipo === 'solo_interes')   return 'Solo interés';
  const cuotaBase = parseFloat(prestamo.valor_cuota_base || 0);
  const cuotaEsperada = cuotaBase + parseFloat(pago.interes_pagado || 0);
  const monto = parseFloat(pago.monto_pagado || 0);
  const tol = 0.5;
  if (monto > cuotaEsperada + tol) return 'Adelanto parcial';
  if (monto < cuotaEsperada - tol) return 'Pago parcial';
  return 'Cuota completa';
}

function _escribirContrato(doc, p, tabla, startY, titulo) {
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  const fecha = _fmtFechaTS(p.fecha);
  const colH = doc.page.height / 2 - 20;
  const col1 = 40, col2 = 300;

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000')
    .text(`${FINANCIERA} — CONTRATO DE PRÉSTAMO PERSONAL`, 40, startY, { align: 'center' });
  doc.font('Helvetica').fontSize(8).fillColor('#555')
    .text(`${FINANCIERA_CUIT}   |   ${titulo}`, 40, startY + 14, { align: 'center' });
  doc.moveTo(40, startY + 26).lineTo(doc.page.width - 40, startY + 26).lineWidth(0.5).stroke('#000');

  let y = startY + 32;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000').text('DATOS DEL CLIENTE', col1, y);
  doc.font('Helvetica').fontSize(8.5); y += 12;
  doc.text(`Apellido y nombre: ${p.apellido}, ${p.nombre}`, col1, y);
  doc.text(`DNI: ${p.dni}`, col2, y); y += 11;
  doc.text(`CUIT: ${p.cuit || '-'}`, col1, y);
  doc.text(`Teléfono: ${p.telefono || '-'}`, col2, y); y += 11;

  doc.font('Helvetica-Bold').text('CONDICIONES DEL PRÉSTAMO', col1, y); y += 12;
  doc.font('Helvetica');
  doc.text(`Fecha: ${fecha}`, col1, y); doc.text(`Moneda: ${p.moneda}`, col2, y); y += 11;
  doc.text(`Capital prestado: $${fmt(p.monto_capital)}`, col1, y);
  doc.text(`Tasa mensual: ${p.tasa_interes_mensual}%`, col2, y); y += 11;
  doc.text(`Total cuotas: ${p.total_cuotas}`, col1, y);
  doc.text(`Cuota base (capital): $${fmt(p.valor_cuota_base)}`, col2, y); y += 11;
  doc.text(`Primer vencimiento: ${_fmtFecha(p.primer_vencimiento)}`, col1, y); y += 14;

  const maxFilas = Math.min(tabla.length, 8);
  doc.font('Helvetica-Bold').fontSize(7.5).text('TABLA DE CUOTAS (PROYECTADA)', col1, y); y += 10;
  const headers = ['N°', 'Capital', 'Interés', 'Total', 'Saldo'];
  const colWidths = [25, 85, 75, 75, 90];
  let x = col1;
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#fff');
  doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), 12).fill('#2c3e50');
  headers.forEach((h, i) => { doc.text(h, x + 3, y + 3, { width: colWidths[i] }); x += colWidths[i]; });
  y += 12;
  doc.fillColor('#000');
  tabla.slice(0, maxFilas).forEach((r, idx) => {
    x = col1;
    if (idx % 2 === 0) doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), 11).fill('#f8f9fa');
    doc.fillColor('#000').font('Helvetica').fontSize(7);
    const vals = [r.cuota, `$${fmt(r.capitalAmortizado)}`, `$${fmt(r.interes)}`, `$${fmt(r.cuotaTotal)}`, `$${fmt(r.saldoRestante)}`];
    vals.forEach((v, i) => { doc.text(String(v), x + 3, y + 2, { width: colWidths[i] }); x += colWidths[i]; });
    y += 11;
  });
  if (tabla.length > maxFilas) {
    doc.font('Helvetica').fontSize(7).fillColor('#555').text(`(+${tabla.length - maxFilas} cuotas adicionales)`, col1, y + 2);
    y += 10;
  }
  y += 8;
  if (p.nombre_garantia) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000').text('GARANTÍA', col1, y); y += 11;
    doc.font('Helvetica').fontSize(8)
      .text(`Nombre: ${p.nombre_garantia}   DNI: ${p.dni_garantia || '-'}   Tel: ${p.telefono_garantia || '-'}`, col1, y);
    y += 12;
  }

  const firmaY = startY + colH - 42;
  doc.moveTo(col1, firmaY).lineTo(col1 + 150, firmaY).lineWidth(0.5).stroke('#000');
  doc.moveTo(col2, firmaY).lineTo(col2 + 150, firmaY).lineWidth(0.5).stroke('#000');
  doc.font('Helvetica').fontSize(7.5).fillColor('#000')
    .text('Firma, aclaración y DNI del cliente', col1, firmaY + 3)
    .text('Firma, aclaración y DNI del prestamista', col2, firmaY + 3);
  doc.font('Helvetica').fontSize(7).fillColor('#555')
    .text('El cliente declara haber leído y aceptado las condiciones del presente contrato.', col1, firmaY + 16, { width: 510 });
}

function generarRecibo(pago, prestamo) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 20, bottom: 20, left: 40, right: 40 } });
  const midY = doc.page.height / 2;
  _escribirRecibo(doc, pago, prestamo, 20, 'COPIA FINANCIERA');
  doc.moveTo(40, midY).lineTo(doc.page.width - 40, midY).dash(4, { space: 4 }).stroke('#999');
  doc.undash();
  doc.font('Helvetica').fontSize(7).fillColor('#999').text('✂ cortar aquí', 0, midY - 9, { align: 'center' });
  _escribirRecibo(doc, pago, prestamo, midY + 12, 'COPIA CLIENTE');
  doc.end();
  return doc;
}

function _escribirRecibo(doc, pago, p, startY, titulo) {
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  // fecha_pago_real es DATE — pg la devuelve como objeto Date (medianoche UTC)
  const fechaPago = _fmtFecha(pago.fecha_pago_real);
  const horaRegistro = pago.fecha_registro
    ? new Date(pago.fecha_registro).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Cordoba', hour: '2-digit', minute: '2-digit' })
    : '';
  const col1 = 40, col2 = 310;

  doc.font('Helvetica-Bold').fontSize(13).fillColor('#000')
    .text(`RECIBO DE PAGO — ${FINANCIERA}`, 40, startY, { align: 'center' });
  doc.font('Helvetica').fontSize(8).fillColor('#555')
    .text(`${FINANCIERA_CUIT}   |   ${titulo}`, 40, startY + 16, { align: 'center' });
  doc.moveTo(40, startY + 28).lineTo(doc.page.width - 40, startY + 28).lineWidth(0.5).stroke('#000');

  let y = startY + 35;
  doc.font('Helvetica').fontSize(9.5).fillColor('#000');
  doc.text(`Cliente: ${p.apellido}, ${p.nombre}`, col1, y); doc.text(`Recibo N°: ${pago.id}`, col2, y); y += 14;
  doc.text(`DNI: ${p.dni}`, col1, y); doc.text(`Fecha de pago: ${fechaPago}`, col2, y); y += 14;
  doc.text(`Préstamo N°: ${p.id}`, col1, y); doc.text(`Saldo post-pago: $${fmt(pago.saldo_capital_post_pago)}`, col2, y); y += 18;

  doc.rect(col1, y, doc.page.width - 80, 38).fill('#f0f9f4').stroke('#27ae60');
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(10)
    .text(`MONTO PAGADO: $${fmt(pago.monto_pagado)} ${p.moneda}`, col1 + 10, y + 5);
  doc.font('Helvetica').fontSize(8.5)
    .text(`Tipo: ${_labelTipoPago(pago, p)}   |   Forma: ${pago.forma_pago || 'efectivo'}   |   Capital amort.: $${fmt(pago.capital_amortizado)}   |   Interés: $${fmt(pago.interes_pagado)}`, col1 + 10, y + 20);
  y += 50;

  if (pago.observaciones) {
    doc.font('Helvetica').fontSize(8).fillColor('#555').text(`Observaciones: ${pago.observaciones}`, col1, y);
    y += 14;
  }

  const firmaY = startY + (doc.page.height / 2) - 55;
  doc.font('Helvetica').fontSize(7.5).fillColor('#333').text('Este recibo es válido como constancia de pago.', col1, firmaY - 14);
  doc.moveTo(col2, firmaY).lineTo(col2 + 160, firmaY).lineWidth(0.5).stroke('#000');
  doc.font('Helvetica').fontSize(7.5).fillColor('#000').text('Firma, aclaración y DNI del prestamista', col2, firmaY + 3);
}

function generarResumen(prestamo, pagos, saldoActual, interesProxMes) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  // Maneja tanto objetos Date (pg los devuelve así para DATE) como strings ISO
  const fmtFecha = f => {
    if (!f) return '-';
    const iso = (f instanceof Date) ? f.toISOString() : String(f);
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  };
  // Para TIMESTAMPTZ: solo mostrar la parte de fecha sin hora
  const fmtFechaTS = f => {
    if (!f) return '-';
    const d = new Date(f);
    return d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba', day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const hoy = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba', day: '2-digit', month: '2-digit', year: 'numeric' });
  const W = doc.page.width - 80;

  // Encabezado
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#000')
    .text(`${FINANCIERA} — ESTADO DE CUENTA`, 40, 40, { align: 'center' });
  doc.font('Helvetica').fontSize(8.5).fillColor('#555')
    .text(`${FINANCIERA_CUIT}   |   Generado: ${hoy}`, 40, 57, { align: 'center' });
  doc.moveTo(40, 70).lineTo(doc.page.width - 40, 70).lineWidth(0.5).stroke('#2c3e50');

  let y = 80;

  // Datos del cliente y préstamo
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#2c3e50').text('DATOS DEL CLIENTE', 40, y);
  y += 13;
  doc.font('Helvetica').fontSize(9).fillColor('#000');
  doc.text(`Cliente: ${prestamo.apellido}, ${prestamo.nombre}`, 40, y);
  doc.text(`DNI: ${prestamo.dni}`, 320, y); y += 12;
  doc.text(`CUIT: ${prestamo.cuit || '-'}`, 40, y);
  doc.text(`Teléfono: ${prestamo.telefono || '-'}`, 320, y); y += 18;

  // Resumen del préstamo — cajas de estado
  // Calcular cuota mensual según sistema
  const tasa = parseFloat(prestamo.tasa_interes_mensual) / 100;
  const cuotaBaseNum = parseFloat(prestamo.valor_cuota_base);
  const capitalOrig  = parseFloat(prestamo.monto_capital);
  let cuotaMensualStr;
  if (prestamo.tipo_amortizacion === 'flat') {
    const c = cuotaBaseNum + capitalOrig * tasa;
    cuotaMensualStr = `$${fmt(c)} fija (interés plano)`;
  } else if (prestamo.tipo_amortizacion === 'frances') {
    cuotaMensualStr = `$${fmt(cuotaBaseNum)} fija (sistema francés)`;
  } else {
    cuotaMensualStr = `$${fmt(cuotaBaseNum + capitalOrig * tasa)} 1ª cuota, decreciente (sistema alemán)`;
  }

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#2c3e50').text('CONDICIONES DEL PRÉSTAMO', 40, y); y += 13;
  doc.font('Helvetica').fontSize(9).fillColor('#000');
  doc.text(`Préstamo N°: ${prestamo.id}`, 40, y); doc.text(`Moneda: ${prestamo.moneda}`, 200, y); doc.text(`Fecha otorgamiento: ${fmtFechaTS(prestamo.fecha)}`, 320, y); y += 12;
  doc.text(`Capital original: $${fmt(prestamo.monto_capital)}`, 40, y); doc.text(`Tasa mensual: ${parseFloat(prestamo.tasa_interes_mensual)}%`, 200, y); doc.text(`Total cuotas: ${prestamo.total_cuotas}`, 320, y); y += 12;
  doc.text(`Primer vencimiento: ${fmtFecha(prestamo.primer_vencimiento)}`, 40, y);
  // Cuota mensual en negrita destacada
  doc.font('Helvetica-Bold').fillColor('#1a5c3a').text(`Cuota mensual: ${cuotaMensualStr}`, 250, y); y += 20;
  doc.font('Helvetica').fillColor('#000');

  // Cajas de estado actual
  const cajas = [
    { label: 'SALDO ACTUAL', valor: `$${fmt(saldoActual)}`, color: '#e74c3c' },
    { label: 'CUOTAS PAGADAS', valor: `${pagos.length} / ${prestamo.total_cuotas}`, color: '#27ae60' },
    { label: 'INTERÉS PRÓX. MES', valor: `$${fmt(interesProxMes)}`, color: '#f39c12' },
    { label: 'ESTADO', valor: prestamo.estado.toUpperCase(), color: prestamo.estado === 'activo' ? '#27ae60' : prestamo.estado === 'mora' ? '#e74c3c' : '#7f8c8d' },
  ];
  const cajaW = (W - 15) / 4;
  cajas.forEach((c, i) => {
    const cx = 40 + i * (cajaW + 5);
    doc.rect(cx, y, cajaW, 40).fill('#f8f9fa').stroke('#dee2e6');
    doc.font('Helvetica').fontSize(7).fillColor('#666').text(c.label, cx + 5, y + 5, { width: cajaW - 10 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(c.color).text(c.valor, cx + 5, y + 17, { width: cajaW - 10 });
  });
  y += 55;

  // Historial de pagos
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#2c3e50').text('HISTORIAL DE PAGOS', 40, y); y += 13;

  if (pagos.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor('#999').text('Sin pagos registrados.', 40, y);
    y += 15;
  } else {
    const cols = [
      { label: 'N°',          w: 25  },
      { label: 'Fecha',       w: 60  },
      { label: 'Tipo',        w: 80  },
      { label: 'Forma',       w: 65  },
      { label: 'Monto',       w: 75  },
      { label: 'Capital',     w: 75  },
      { label: 'Interés',     w: 65  },
      { label: 'Saldo',       w: 75  },
    ];
    // Header
    let x = 40;
    doc.rect(x, y, W, 12).fill('#2c3e50');
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#fff');
    cols.forEach(c => { doc.text(c.label, x + 2, y + 3, { width: c.w }); x += c.w; });
    y += 12;

    pagos.forEach((pg, idx) => {
      x = 40;
      if (idx % 2 === 0) doc.rect(x, y, W, 11).fill('#f8f9fa').stroke('');
      doc.font('Helvetica').fontSize(7.5).fillColor('#000');
      const vals = [
        idx + 1,
        fmtFecha(pg.fecha_pago_real),
        _labelTipoPago(pg, prestamo),
        pg.forma_pago || 'efectivo',
        `$${fmt(pg.monto_pagado)}`,
        `$${fmt(pg.capital_amortizado)}`,
        `$${fmt(pg.interes_pagado)}`,
        `$${fmt(pg.saldo_capital_post_pago)}`,
      ];
      cols.forEach((c, i) => { doc.text(String(vals[i]), x + 2, y + 2, { width: c.w }); x += c.w; });
      y += 11;
    });
    y += 8;
  }

  // Próximo vencimiento
  if (prestamo.estado !== 'cancelado') {
    // Calcular próximo vencimiento usando partes de fecha para evitar problemas de timezone
    const pvISO = (prestamo.primer_vencimiento instanceof Date)
      ? prestamo.primer_vencimiento.toISOString().split('T')[0]
      : String(prestamo.primer_vencimiento).split('T')[0];
    const [pvY, pvM, pvD] = pvISO.split('-').map(Number);
    const proxDate = new Date(pvY, pvM - 1 + pagos.length, pvD);
    const proxVctoStr = `${String(proxDate.getDate()).padStart(2,'0')}/${String(proxDate.getMonth()+1).padStart(2,'0')}/${proxDate.getFullYear()}`;
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).lineWidth(0.5).stroke('#dee2e6'); y += 8;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#2c3e50')
      .text(`Próximo vencimiento estimado: ${proxVctoStr}   |   Interés estimado: $${fmt(interesProxMes)}`, 40, y);
    y += 18;
  }

  doc.font('Helvetica').fontSize(7.5).fillColor('#999')
    .text('Este documento es informativo y no reemplaza el contrato original.', 40, y);

  doc.end();
  return doc;
}

module.exports = { generarContrato, generarRecibo, generarResumen };
