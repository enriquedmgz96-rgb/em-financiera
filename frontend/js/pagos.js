async function renderPagos() {
  const app = document.getElementById('app');
  const prestamos = await api.get('/prestamos?estado=activo').catch(() => []);

  app.innerHTML = `
    <h2>Registrar pago</h2>
    <form id="formBuscar" style="margin-bottom:1.5rem;display:flex;gap:.75rem;align-items:flex-end">
      <div class="form-group" style="flex:1;margin:0">
        <label>Préstamo activo</label>
        <select name="id_prestamo" required>
          <option value="">Seleccionar préstamo...</option>
          ${prestamos.map(p => `<option value="${p.id}">#${p.id} — ${esc(p.apellido)}, ${esc(p.nombre)} | DNI ${esc(p.dni)}</option>`).join('')}
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

  const saldo     = parseFloat(p.saldo_capital_actual);
  const interes   = parseFloat(p.interes_proximo_mes);
  const cuotaBase = parseFloat(p.valor_cuota_base);
  const esFrances = p.tipo_amortizacion === 'frances';

  // Deuda total máxima pagable: no se puede pagar más que esto
  const maxPagable = parseFloat((saldo + interes).toFixed(2));

  // Capital que corresponde a ESTA cuota específica
  // Si el saldo es menor que la cuota base, es la última cuota (ajustada)
  const capitalEstaCuota = esFrances
    ? Math.min(saldo, Math.max(0, cuotaBase - interes))   // PMT: capital = PMT - interés
    : Math.min(saldo, cuotaBase);                          // flat/alemán: capital fijo, limitado al saldo

  // Cuota real de este mes (puede ser menor en la última)
  const cuotaCompleta = parseFloat((capitalEstaCuota + interes).toFixed(2));

  const esUltimaCuota = saldo < cuotaBase;
  // La cuota que se está cobrando = cantidad de cuotas completas ya pagadas + 1
  const cuotasCompletasPagadas = p.pagos.filter(pg => pg.tipo_pago === 'cuota_completa').length;
  const nroCuotaActual = cuotasCompletasPagadas + 1;
  // Fecha en que vence/vencía esta cuota (para ver si paga adelantado)
  const _fechaSolo = s => { const [y,m,d] = String(s).split('T')[0].split('-').map(Number); return new Date(y, m-1, d); };
  const venceEstaCuota = (() => {
    const dt = _fechaSolo(p.primer_vencimiento);
    if (p.periodicidad === 'semanal') dt.setDate(dt.getDate() + (nroCuotaActual - 1) * 7);
    else dt.setMonth(dt.getMonth() + (nroCuotaActual - 1));
    return dt;
  })();
  const venceEstaCuotaStr = venceEstaCuota.toLocaleDateString('es-AR');

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Registrar pago — ${esc(p.apellido)}, ${esc(p.nombre)}</h2>
      <button class="btn-secondary" onclick="renderPrestamoDetalle(${prestamoId})">← Volver</button>
    </div>

    <div style="background:${esUltimaCuota ? 'var(--gold-light)' : 'var(--verde-tint)'};border-left:3px solid ${esUltimaCuota ? 'var(--gold)' : 'var(--verde-mid)'};padding:.65rem 1rem;border-radius:var(--radius);margin-bottom:1.25rem;font-size:.875rem;color:var(--ink-2)">
      ${esUltimaCuota
        ? `<strong>Última cuota</strong> — El cliente adeuda menos de una cuota completa. El monto sugerido es el saldo total con intereses.`
        : `Registrando <strong>${p.periodicidad === 'semanal' ? 'semana' : 'cuota'} ${nroCuotaActual} de ${p.total_cuotas}</strong> — vence el <strong>${venceEstaCuotaStr}</strong>`
      }
    </div>

    <div class="cards" style="margin-bottom:1.5rem">
      <div class="card">
        <div class="label">Saldo capital</div>
        <div class="value">$${fmt(saldo)}</div>
      </div>
      <div class="card">
        <div class="label">Interés ${p.periodicidad === 'semanal' ? 'de la semana' : 'del mes'}</div>
        <div class="value">$${fmt(interes)}</div>
        <div style="font-size:.72rem;color:var(--ink-4);margin-top:.3rem">${p.tipo_amortizacion === 'flat' ? 'sobre capital original' : 'sobre saldo actual'}</div>
      </div>
      <div class="card">
        <div class="label">Capital esta cuota</div>
        <div class="value">$${fmt(capitalEstaCuota)}</div>
        ${esUltimaCuota ? `<div style="font-size:.72rem;color:var(--gold);margin-top:.3rem;font-weight:600">Cuota ajustada</div>` : ''}
      </div>
      <div class="card" style="${esUltimaCuota ? 'border-color:rgba(154,123,63,.4);background:var(--gold-light)' : ''}">
        <div class="label">Próxima cuota</div>
        <div class="value" style="color:${esUltimaCuota ? 'var(--gold)' : 'var(--ink)'}">$${fmt(cuotaCompleta)}</div>
        <div style="font-size:.72rem;color:var(--ink-4);margin-top:.3rem">máx. pagable: $${fmt(maxPagable)}</div>
      </div>
    </div>

    <form id="formPago" style="max-width:500px">
      <div class="form-group">
        <label>Fecha del pago *</label>
        <input name="fecha_pago_real" type="date" required value="${new Date().toISOString().split('T')[0]}" />
      </div>

      <div class="form-group">
        <label>Tipo de pago</label>
        <select name="tipo_pago" id="tipoPago">
          <option value="cuota_completa">${p.periodicidad === 'semanal' ? 'Semana completa' : 'Cuota completa'} — $${fmt(cuotaCompleta)}</option>
          <option value="solo_interes">Solo interés — $${fmt(interes)}</option>
          <option value="adelanto_parcial">Monto libre (adelanto de capital)</option>
        </select>
      </div>

      <div class="form-group">
        <label>Monto a pagar</label>
        <input name="monto_pagado" id="montoPagado" type="text" value="$ ${Math.round(cuotaCompleta).toLocaleString('es-AR')}" />
        <input type="hidden" id="montoPagadoRaw" value="${cuotaCompleta.toFixed(2)}" />
        <div id="montoMsg" style="font-size:.78rem;margin-top:.3rem;display:none"></div>
      </div>

      <div class="form-group">
        <label>Forma de pago</label>
        <select name="forma_pago">
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
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
        <button type="submit" class="btn-primary" id="btnConfirmar" style="margin-left:0">Confirmar pago</button>
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
      capitalAmort = 0;
      saldoPost    = saldo;
    } else if (tipo === 'cuota_completa') {
      capitalAmort = Math.min(capitalEstaCuota, saldo);
      saldoPost    = Math.max(0, saldo - capitalAmort);
    } else {
      // adelanto_parcial — validar tope
      if (monto > maxPagable) {
        error = `El monto máximo pagable es $${fmt(maxPagable)} (saldo + intereses). No se puede cobrar más de lo que se debe.`;
      }
      const montoEfectivo = Math.min(monto, maxPagable);
      capitalAmort = Math.min(Math.max(0, montoEfectivo - interes), saldo);
      saldoPost    = Math.max(0, saldo - capitalAmort);
    }

    // Mostrar/ocultar error de monto
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
      Capital amortizado: <strong>$${fmt(capitalAmort)}</strong> &nbsp;|&nbsp;
      Interés pagado: <strong>$${fmt(interes)}</strong> &nbsp;|&nbsp;
      Saldo post-pago: <strong style="color:${saldoPost === 0 ? 'var(--verde)' : 'var(--ink)'}">$${fmt(saldoPost)}</strong>
      ${saldoPost === 0 ? ' &nbsp;<span style="color:var(--verde);font-weight:600">✓ Cancela el préstamo</span>' : ''}
    `;
  }

  function setMonto(valor, editable = false) {
    const v = Math.min(valor, maxPagable); // nunca proponer más del máximo
    montoPagadoEl.value = '$ ' + Math.round(v).toLocaleString('es-AR');
    montoRawEl.value    = v.toFixed(2);
    montoPagadoEl.readOnly = !editable;
    montoPagadoEl.style.background = editable ? '' : 'var(--bg)';
    montoPagadoEl.style.cursor     = editable ? '' : 'default';
    montoPagadoEl.style.color      = editable ? '' : 'var(--ink-2)';
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
    else {
      // adelanto_parcial: editable, valor inicial = cuota completa pero sin bloquear
      setMonto(cuotaCompleta, true);
    }
    actualizarPreview();
  });

  // Estado inicial
  setMonto(cuotaCompleta, false);
  actualizarPreview();

  document.getElementById('formPago').addEventListener('submit', async e => {
    e.preventDefault();
    if (btnConfirmar.disabled) return;

    const raw = parseFloat(montoRawEl.value) || 0;
    if (raw > maxPagable) {
      document.getElementById('pagoMsg').innerHTML = `<span class="msg-error">El monto no puede superar la deuda total de $${fmt(maxPagable)}.</span>`;
      return;
    }

    const fd = Object.fromEntries(new FormData(e.target).entries());
    fd.id_prestamo  = prestamoId;
    fd.monto_pagado = montoRawEl.value;
    const msg = document.getElementById('pagoMsg');
    try {
      await api.post('/pagos', fd);
      msg.innerHTML = '<span class="msg-ok">✓ Pago registrado correctamente. Redirigiendo...</span>';
      setTimeout(() => renderPrestamoDetalle(prestamoId), 1500);
    } catch (err) {
      if (err._auth) return;
      msg.innerHTML = `<span class="msg-error">${err.message}</span>`;
    }
  });
}
