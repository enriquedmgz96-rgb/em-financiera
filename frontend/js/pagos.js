async function renderPagos() {
  const app = document.getElementById('app');
  const prestamos = await api.get('/prestamos?estado=activo').catch(() => []);

  app.innerHTML = `
    <h2>Registrar Pago</h2>
    <form id="formBuscar" style="margin-bottom:1.5rem;display:flex;gap:.75rem;align-items:flex-end">
      <div class="form-group" style="flex:1;margin:0">
        <label>Préstamo activo</label>
        <select name="id_prestamo" required>
          <option value="">Seleccionar préstamo...</option>
          ${prestamos.map(p => `<option value="${p.id}">#${p.id} — ${p.apellido}, ${p.nombre} | DNI ${p.dni}</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="btn-primary" style="margin:0">Cargar</button>
    </form>
    <div id="detallePago"></div>
  `;

  document.getElementById('formBuscar').addEventListener('submit', async e => {
    e.preventDefault();
    const id = parseInt(new FormData(e.target).get('id_prestamo'));
    if (!id) return;
    await renderPagoForm(id);
  });
}

async function renderPagoForm(prestamoId) {
  const app = document.getElementById('app');
  const p = await api.get(`/prestamos/${prestamoId}`).catch(() => null);
  if (!p) { app.innerHTML = '<p class="msg-error">Préstamo no encontrado.</p>'; return; }

  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  const cuotaCompleta = parseFloat(p.valor_cuota_base) + p.interes_proximo_mes;

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Registrar pago — ${p.apellido}, ${p.nombre}</h2>
      <button class="btn-secondary" onclick="renderPagos()">← Volver</button>
    </div>
    <div class="cards" style="margin-bottom:1.5rem">
      <div class="card"><div class="label">Saldo capital</div><div class="value">$${fmt(p.saldo_capital_actual)}</div></div>
      <div class="card"><div class="label">Interés del mes</div><div class="value">$${fmt(p.interes_proximo_mes)}</div></div>
      <div class="card"><div class="label">Cuota base (capital)</div><div class="value">$${fmt(p.valor_cuota_base)}</div></div>
      <div class="card"><div class="label">Cuota completa</div><div class="value">$${fmt(cuotaCompleta)}</div></div>
    </div>

    <form id="formPago" style="max-width:500px">
      <div class="form-group">
        <label>Fecha del pago *</label>
        <input name="fecha_pago_real" type="date" required value="${new Date().toISOString().split('T')[0]}" />
      </div>
      <div class="form-group">
        <label>Tipo de pago</label>
        <select name="tipo_pago" id="tipoPago">
          <option value="cuota_completa">Cuota completa ($${fmt(cuotaCompleta)})</option>
          <option value="solo_interes">Solo interés ($${fmt(p.interes_proximo_mes)})</option>
          <option value="adelanto_parcial">Monto libre (adelanto)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Monto a pagar</label>
        <input name="monto_pagado" id="montoPagado" type="number" step="0.01" value="${cuotaCompleta.toFixed(2)}" />
      </div>
      <div class="form-group"><label>Observaciones</label><textarea name="observaciones"></textarea></div>

      <div id="preview" class="preview-box" style="display:none"></div>

      <button type="submit" class="btn-primary" style="margin-left:0">Confirmar pago</button>
      <div id="pagoMsg"></div>
    </form>
  `;

  const tipoPagoEl = document.getElementById('tipoPago');
  const montoPagadoEl = document.getElementById('montoPagado');
  const previewEl = document.getElementById('preview');

  function actualizarPreview() {
    const tipo = tipoPagoEl.value;
    const monto = parseFloat(montoPagadoEl.value) || 0;
    const saldo = p.saldo_capital_actual;
    const interes = p.interes_proximo_mes;
    const cuotaBase = parseFloat(p.valor_cuota_base);

    let capitalAmort, saldoPost;
    if (tipo === 'solo_interes') {
      capitalAmort = 0; saldoPost = saldo;
    } else if (tipo === 'cuota_completa') {
      capitalAmort = cuotaBase; saldoPost = Math.max(0, saldo - cuotaBase);
    } else {
      capitalAmort = Math.max(0, Math.min(monto - interes, saldo));
      saldoPost = Math.max(0, saldo - capitalAmort);
    }

    previewEl.style.display = 'block';
    previewEl.innerHTML = `
      <strong>Vista previa:</strong><br>
      Capital amortizado: <strong>$${fmt(capitalAmort)}</strong> &nbsp;|&nbsp;
      Interés pagado: <strong>$${fmt(interes)}</strong> &nbsp;|&nbsp;
      Saldo post-pago: <strong>$${fmt(saldoPost)}</strong>
    `;
  }

  tipoPagoEl.addEventListener('change', () => {
    if (tipoPagoEl.value === 'cuota_completa') montoPagadoEl.value = cuotaCompleta.toFixed(2);
    else if (tipoPagoEl.value === 'solo_interes') montoPagadoEl.value = p.interes_proximo_mes.toFixed(2);
    actualizarPreview();
  });
  montoPagadoEl.addEventListener('input', actualizarPreview);
  actualizarPreview();

  document.getElementById('formPago').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    fd.id_prestamo = prestamoId;
    const msg = document.getElementById('pagoMsg');
    try {
      await api.post('/pagos', fd);
      msg.innerHTML = '<span class="msg-ok">✓ Pago registrado correctamente. Redirigiendo...</span>';
      setTimeout(() => renderPrestamoDetalle(prestamoId), 1500);
    } catch (err) {
      msg.innerHTML = `<span class="msg-error">${err.message}</span>`;
    }
  });
}
