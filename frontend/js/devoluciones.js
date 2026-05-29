// Devoluciones — pagos al inversor por una captación. Espejo de pagos.js.

async function renderDevoluciones() {
  const app = document.getElementById('app');
  const captaciones = await api.get('/captaciones?estado=activa').catch(() => []);

  app.innerHTML = `
    <h2>Registrar devolución</h2>
    <form id="formBuscarCap" style="margin-bottom:1.5rem;display:flex;gap:.75rem;align-items:flex-end">
      <div class="form-group" style="flex:1;margin:0">
        <label>Captación activa</label>
        <select name="id_captacion" required>
          <option value="">Seleccionar captación...</option>
          ${captaciones.map(c => `<option value="${c.id}">K-${String(c.id).padStart(4,'0')} — ${esc(c.apellido)}, ${esc(c.nombre)} | DNI ${esc(c.dni)}</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="btn-primary" style="margin:0">Cargar</button>
    </form>
    <div id="detalleDevolucion"></div>
  `;

  document.getElementById('formBuscarCap').addEventListener('submit', async e => {
    e.preventDefault();
    const id = parseInt(new FormData(e.target).get('id_captacion'));
    if (!id) return;
    await renderDevolucionForm(id);
  });
}

async function renderDevolucionForm(captacionId) {
  const app = document.getElementById('app');
  const c = await api.get(`/captaciones/${captacionId}`).catch(() => null);
  if (!c) { app.innerHTML = '<p class="msg-error">Captación no encontrada.</p>'; return; }

  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });

  const saldo     = parseFloat(c.saldo_capital_actual);
  const interes   = parseFloat(c.interes_proximo_mes);
  const cuotaBase = parseFloat(c.valor_cuota_base);
  const esFrances = c.tipo_amortizacion === 'frances';

  const maxPagable = parseFloat((saldo + interes).toFixed(2));
  const capitalEstaCuota = esFrances
    ? Math.min(saldo, Math.max(0, cuotaBase - interes))
    : Math.min(saldo, cuotaBase);
  const cuotaCompleta = parseFloat((capitalEstaCuota + interes).toFixed(2));
  const esUltimaCuota = saldo < cuotaBase;
  const nroCuotaActual = c.devoluciones.length + 1;

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Registrar devolución — ${esc(c.apellido)}, ${esc(c.nombre)}</h2>
      <button class="btn-secondary" onclick="renderCaptacionDetalle(${captacionId})">← Volver</button>
    </div>

    <div style="background:${esUltimaCuota ? 'var(--gold-light)' : 'var(--verde-tint)'};border-left:3px solid ${esUltimaCuota ? 'var(--gold)' : 'var(--verde-mid)'};padding:.65rem 1rem;border-radius:var(--radius);margin-bottom:1.25rem;font-size:.875rem;color:var(--ink-2)">
      ${esUltimaCuota
        ? `<strong>Última cuota</strong> — Resta menos de una cuota completa. El monto sugerido es el saldo total con intereses.`
        : `Registrando <strong>${c.periodicidad === 'semanal' ? 'semana' : 'cuota'} ${nroCuotaActual} de ${c.total_cuotas}</strong>`
      }
      ${c.banco_cbu ? `<br><span style="font-size:.78rem;color:#666">💳 CBU del inversor: <code>${esc(c.banco_cbu)}</code> ${c.banco_alias ? `· Alias: <code>${esc(c.banco_alias)}</code>` : ''}</span>` : ''}
    </div>

    <div class="cards" style="margin-bottom:1.5rem">
      <div class="card"><div class="label">Saldo a devolver</div><div class="value">$${fmt(saldo)}</div></div>
      <div class="card"><div class="label">Interés ${c.periodicidad === 'semanal' ? 'de la semana' : 'del mes'}</div><div class="value">$${fmt(interes)}</div></div>
      <div class="card"><div class="label">Capital esta cuota</div><div class="value">$${fmt(capitalEstaCuota)}</div></div>
      <div class="card"><div class="label">Próxima cuota</div><div class="value">$${fmt(cuotaCompleta)}</div></div>
    </div>

    <form id="formDevolucion" style="max-width:500px">
      <div class="form-group">
        <label>Fecha de la devolución *</label>
        <input name="fecha_pago_real" type="date" required value="${new Date().toISOString().split('T')[0]}" />
      </div>
      <div class="form-group">
        <label>Tipo de devolución</label>
        <select name="tipo_pago" id="tipoPago">
          <option value="cuota_completa">${c.periodicidad === 'semanal' ? 'Semana completa' : 'Cuota completa'} — $${fmt(cuotaCompleta)}</option>
          <option value="solo_interes">Solo interés — $${fmt(interes)}</option>
          <option value="adelanto_parcial">Monto libre (cancelación anticipada parcial)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Monto a devolver</label>
        <input name="monto_pagado" id="montoPagado" type="text" value="$ ${Math.round(cuotaCompleta).toLocaleString('es-AR')}" />
        <input type="hidden" id="montoPagadoRaw" value="${cuotaCompleta.toFixed(2)}" />
        <div id="montoMsg" style="font-size:.78rem;margin-top:.3rem;display:none"></div>
      </div>
      <div class="form-group">
        <label>Forma de pago</label>
        <select name="forma_pago">
          <option value="transferencia">Transferencia</option>
          <option value="efectivo">Efectivo</option>
          <option value="cheque">Cheque</option>
          <option value="debito">Débito</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      <div class="form-group">
        <label>Observaciones</label>
        <textarea name="observaciones"></textarea>
      </div>
      <div id="preview" class="preview-box" style="display:none"></div>
      <div style="margin-top:1rem">
        <button type="submit" class="btn-primary" id="btnConfirmar" style="margin-left:0">Confirmar devolución</button>
      </div>
      <div id="pagoMsg" style="margin-top:.5rem"></div>
    </form>
  `;

  const tipoPagoEl   = document.getElementById('tipoPago');
  const montoPagadoEl = document.getElementById('montoPagado');
  const montoRawEl   = document.getElementById('montoPagadoRaw');
  const previewEl    = document.getElementById('preview');
  const montoMsgEl   = document.getElementById('montoMsg');
  const btnConfirmar = document.getElementById('btnConfirmar');

  function actualizarPreview() {
    const tipo  = tipoPagoEl.value;
    const monto = parseFloat(montoRawEl.value) || 0;
    let capitalAmort, saldoPost, error = null;

    if (tipo === 'solo_interes') {
      capitalAmort = 0; saldoPost = saldo;
    } else if (tipo === 'cuota_completa') {
      capitalAmort = Math.min(capitalEstaCuota, saldo);
      saldoPost = Math.max(0, saldo - capitalAmort);
    } else {
      if (monto > maxPagable) {
        error = `El monto máximo es $${fmt(maxPagable)} (saldo + intereses).`;
      }
      const montoEf = Math.min(monto, maxPagable);
      capitalAmort = Math.min(Math.max(0, montoEf - interes), saldo);
      saldoPost = Math.max(0, saldo - capitalAmort);
    }

    if (error) {
      montoMsgEl.style.display = 'block';
      montoMsgEl.style.color = 'var(--rojo)';
      montoMsgEl.textContent = error;
      btnConfirmar.disabled = true;
      btnConfirmar.style.opacity = '0.5';
    } else {
      montoMsgEl.style.display = 'none';
      btnConfirmar.disabled = false;
      btnConfirmar.style.opacity = '';
    }

    previewEl.style.display = 'block';
    previewEl.innerHTML = `
      <strong>Vista previa del registro:</strong><br>
      Capital devuelto: <strong>$${fmt(capitalAmort)}</strong> &nbsp;|&nbsp;
      Interés pagado: <strong>$${fmt(interes)}</strong> &nbsp;|&nbsp;
      Saldo post-pago: <strong style="color:${saldoPost === 0 ? 'var(--verde)' : 'var(--ink)'}">$${fmt(saldoPost)}</strong>
      ${saldoPost === 0 ? ' &nbsp;<span style="color:var(--verde);font-weight:600">✓ Cancela la captación</span>' : ''}
    `;
  }

  function setMonto(valor, editable = false) {
    const v = Math.min(valor, maxPagable);
    montoPagadoEl.value = '$ ' + Math.round(v).toLocaleString('es-AR');
    montoRawEl.value = v.toFixed(2);
    montoPagadoEl.readOnly = !editable;
    montoPagadoEl.style.background = editable ? '' : 'var(--bg)';
    montoPagadoEl.style.cursor = editable ? '' : 'default';
    montoPagadoEl.style.color = editable ? '' : 'var(--ink-2)';
    montoMsgEl.style.display = 'none';
    btnConfirmar.disabled = false;
    btnConfirmar.style.opacity = '';
  }

  montoPagadoEl.addEventListener('input', e => {
    if (montoPagadoEl.readOnly) return;
    const raw = e.target.value.replace(/\D/g, '');
    e.target.value = raw ? '$ ' + Number(raw).toLocaleString('es-AR') : '';
    montoRawEl.value = raw || '0';
    actualizarPreview();
  });

  tipoPagoEl.addEventListener('change', () => {
    const tipo = tipoPagoEl.value;
    if (tipo === 'cuota_completa')    setMonto(cuotaCompleta, false);
    else if (tipo === 'solo_interes') setMonto(interes, false);
    else                              setMonto(cuotaCompleta, true);
    actualizarPreview();
  });

  setMonto(cuotaCompleta, false);
  actualizarPreview();

  document.getElementById('formDevolucion').addEventListener('submit', async e => {
    e.preventDefault();
    if (btnConfirmar.disabled) return;
    const raw = parseFloat(montoRawEl.value) || 0;
    if (raw > maxPagable) {
      document.getElementById('pagoMsg').innerHTML = `<span class="msg-error">El monto no puede superar $${fmt(maxPagable)}.</span>`;
      return;
    }
    const fd = Object.fromEntries(new FormData(e.target).entries());
    fd.id_captacion = captacionId;
    fd.monto_pagado = montoRawEl.value;
    const msg = document.getElementById('pagoMsg');
    try {
      await api.post('/devoluciones', fd);
      msg.innerHTML = '<span class="msg-ok">✓ Devolución registrada. Redirigiendo...</span>';
      setTimeout(() => renderCaptacionDetalle(captacionId), 1500);
    } catch (err) {
      if (err._auth) return;
      msg.innerHTML = `<span class="msg-error">${esc(err.message)}</span>`;
    }
  });
}
