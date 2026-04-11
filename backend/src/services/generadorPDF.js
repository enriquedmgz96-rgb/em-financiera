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

function _escribirContrato(doc, p, tabla, startY, titulo) {
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  const fecha = new Date(p.fecha).toLocaleDateString('es-AR');
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
  doc.text(`Primer vencimiento: ${p.primer_vencimiento}`, col1, y); y += 14;

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
    .text('Firma y aclaración del cliente', col1, firmaY + 3)
    .text('Firma y sello de la financiera', col2, firmaY + 3);
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
  // fecha_pago_real es DATE (sin hora), fecha_registro es TIMESTAMPTZ
  const fechaPago = pago.fecha_pago_real
    ? String(pago.fecha_pago_real).split('T')[0].split('-').reverse().join('/')
    : '-';
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
    .text(`Tipo: ${pago.tipo_pago.replace(/_/g, ' ')}   |   Forma: ${pago.forma_pago || 'efectivo'}   |   Capital amort.: $${fmt(pago.capital_amortizado)}   |   Interés: $${fmt(pago.interes_pagado)}`, col1 + 10, y + 20);
  y += 50;

  if (pago.observaciones) {
    doc.font('Helvetica').fontSize(8).fillColor('#555').text(`Observaciones: ${pago.observaciones}`, col1, y);
    y += 14;
  }

  const firmaY = startY + (doc.page.height / 2) - 55;
  doc.font('Helvetica').fontSize(7.5).fillColor('#333').text('Este recibo es válido como constancia de pago.', col1, firmaY - 14);
  doc.moveTo(col2, firmaY).lineTo(col2 + 160, firmaY).lineWidth(0.5).stroke('#000');
  doc.font('Helvetica').fontSize(7.5).fillColor('#000').text('Firma y sello de la financiera', col2, firmaY + 3);
}

module.exports = { generarContrato, generarRecibo };
