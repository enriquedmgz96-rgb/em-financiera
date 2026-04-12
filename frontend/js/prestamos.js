async function renderPrestamos() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  const prestamos = await api.get('/prestamos').catch(() => []);

  const semaforo = p => {
    if (p.estado === 'cancelado') return '<span class="badge badge-verde">Cancelado</span>';
    if (p.estado === 'mora')      return '<span class="badge badge-rojo">Mora</span>';
    return '<span class="badge badge-verde">Activo</span>';
  };
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Préstamos</h2>
      <button class="btn-primary" onclick="renderPrestamoForm()">+ Nuevo préstamo</button>
    </div>
    <table>
      <thead>
        <tr><th>Cliente</th><th>Capital</th><th>Tasa</th><th>Cuotas</th><th>1er Vcto</th><th>Estado</th><th></th></tr>
      </thead>
      <tbody>
        ${prestamos.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#999">Sin préstamos registrados</td></tr>' :
          prestamos.map(p => `
            <tr>
              <td>${p.apellido}, ${p.nombre}</td>
              <td>$${fmt(p.monto_capital)} ${p.moneda}</td>
              <td>${parseFloat(p.tasa_interes_mensual)}% m.</td>
              <td>${p.total_cuotas}</td>
              <td>${String(p.primer_vencimiento).split('T')[0]}</td>
              <td>${semaforo(p)}</td>
              <td><button class="btn-secondary" style="margin:0" onclick="renderPrestamoDetalle(${p.id})">Ver</button></td>
            </tr>`).join('')}
      </tbody>
    </table>
  `;
}

async function renderPrestamoDetalle(id) {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  const p = await api.get(`/prestamos/${id}`).catch(err => { app.innerHTML = `<p class="msg-error">${err.message}</p>`; return null; });
  if (!p) return;

  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Préstamo #${p.id} — ${p.apellido}, ${p.nombre}</h2>
      <button class="btn-secondary" onclick="renderPrestamos()">← Volver</button>
    </div>
    <div class="cards" style="margin-bottom:1.5rem">
      <div class="card"><div class="label">Capital original</div><div class="value">$${fmt(p.monto_capital)}</div></div>
      <div class="card"><div class="label">Saldo actual</div><div class="value">$${fmt(p.saldo_capital_actual)}</div></div>
      <div class="card"><div class="label">Total con intereses</div><div class="value">$${fmt(parseFloat(p.monto_capital) * (1 + parseFloat(p.tasa_interes_mensual) * p.total_cuotas / 100))}</div></div>
      <div class="card"><div class="label">Interés próx. mes</div><div class="value">$${fmt(p.interes_proximo_mes)}</div></div>
      <div class="card"><div class="label">Tasa mensual</div><div class="value">${parseFloat(p.tasa_interes_mensual)}%</div></div>
      <div class="card"><div class="label">Cuotas</div><div class="value">${p.total_cuotas}</div></div>
      <div class="card"><div class="label">Cuota según contrato</div><div class="value">$${fmt(
        p.tipo_amortizacion === 'frances'
          ? parseFloat(p.valor_cuota_base)  // PMT
          : p.tipo_amortizacion === 'flat'
            ? parseFloat(p.valor_cuota_base) + parseFloat(p.monto_capital) * parseFloat(p.tasa_interes_mensual) / 100  // capital/n + capital×tasa
            : parseFloat(p.valor_cuota_base) + parseFloat(p.monto_capital) * parseFloat(p.tasa_interes_mensual) / 100  // alemán: primer mes
      )}</div><div style="font-size:.7rem;color:#999;margin-top:.2rem">${
        p.tipo_amortizacion === 'frances' ? 'Cuota fija (PMT)' : p.tipo_amortizacion === 'flat' ? 'Cuota fija clásica' : 'Primera cuota (decreciente)'
      }</div></div>
      <div class="card"><div class="label">Moneda</div><div class="value">${p.moneda}</div></div>
    </div>

    <h3>Historial de pagos</h3>
    ${p.pagos.length === 0 ? '<p style="margin-bottom:1rem;color:#999">Sin pagos registrados.</p>' : `
    <table style="margin-bottom:1.5rem">
      <thead><tr><th>Fecha pago</th><th>Registrado</th><th>Tipo</th><th>Forma</th><th>Monto pagado</th><th>Capital amort.</th><th>Interés</th><th>Saldo post-pago</th><th></th></tr></thead>
      <tbody>
        ${p.pagos.map(pg => `
          <tr>
            <td>${String(pg.fecha_pago_real).split('T')[0].split('-').reverse().join('/')}</td>
            <td style="font-size:.8rem;color:#999">${new Date(pg.fecha_registro).toLocaleDateString('es-AR')}</td>
            <td>${pg.tipo_pago.replace(/_/g, ' ')}</td>
            <td>${pg.forma_pago || 'efectivo'}</td>
            <td>$${fmt(pg.monto_pagado)}</td>
            <td>$${fmt(pg.capital_amortizado)}</td>
            <td>$${fmt(pg.interes_pagado)}</td>
            <td>$${fmt(pg.saldo_capital_post_pago)}</td>
            <td style="display:flex;gap:.3rem">
              <a href="/api/pagos/${pg.id}/recibo" target="_blank"><button class="btn-secondary" style="margin:0;padding:.3rem .7rem;font-size:.8rem">PDF</button></a>
              <button class="btn-secondary" style="margin:0;padding:.3rem .7rem;font-size:.8rem;color:var(--rojo)" onclick="eliminarPago(${pg.id}, ${p.id})">✕</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`}

    <div style="display:flex;gap:.75rem">
      <button class="btn-primary" onclick="renderPagoForm(${p.id})">Registrar pago</button>
      <a href="/api/prestamos/${p.id}/contrato" target="_blank">
        <button class="btn-secondary">Descargar contrato</button>
      </a>
      <a href="/api/prestamos/${p.id}/resumen" target="_blank">
        <button class="btn-secondary">Estado de cuenta</button>
      </a>
    </div>
  `;
}

async function renderPrestamoForm() {
  const app = document.getElementById('app');
  const clientes = await api.get('/clientes').catch(() => []);

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Nuevo préstamo</h2>
      <button class="btn-secondary" onclick="renderPrestamos()">← Volver</button>
    </div>
    <form id="formPrestamo">
      <div class="form-group">
        <label>Cliente *</label>
        <select name="id_cliente" required>
          <option value="">Seleccionar...</option>
          ${clientes.map(c => `<option value="${c.id}">${c.apellido}, ${c.nombre} — DNI ${c.dni}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Moneda</label>
        <select name="moneda" id="monedaSelect">
          <option value="ARS">ARS (Pesos)</option>
          <option value="USD">USD (Dólares)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Sistema de amortización *</label>
        <select name="tipo_amortizacion" id="tipoAmortizacion">
          <option value="flat">Cuota fija clásica — interés sobre capital original (recomendado)</option>
          <option value="frances">Cuota fija francesa — interés sobre saldo (PMT)</option>
          <option value="aleman">Cuota decreciente — interés sobre saldo</option>
        </select>
        <small id="infoAmortizacion" style="color:#555;margin-top:.3rem;display:block">
          Clásica: siempre la misma cuota, interés calculado sobre el capital original · Francesa: cuota fija pero menor, interés sobre saldo · Decreciente: primer mes más caro, luego baja
        </small>
      </div>
      <div class="form-group">
        <label>Monto capital *</label>
        <input name="monto_capital" id="montoCapital" type="number" step="0.01" required />
      </div>
      <div class="form-group">
        <label>Cuotas y tasa *</label>
        <select name="total_cuotas" id="selectorCuotas" required>
          <option value="">Seleccionar...</option>
        </select>
        <small id="infoTasa" style="color:#555;margin-top:.3rem;display:block"></small>
      </div>
      <input type="hidden" name="tasa_interes_mensual" id="tasaHidden" />
      <div class="form-group">
        <label>Primer vencimiento *</label>
        <input name="primer_vencimiento" type="date" required />
      </div>
      <div class="form-group">
        <label>Motivo del préstamo</label>
        <select name="motivo">
          <option value="">Sin especificar</option>
          <option value="Negocio/Emprendimiento">Negocio / Emprendimiento</option>
          <option value="Grandes Compras">Grandes Compras</option>
          <option value="Gastos personales">Gastos personales</option>
          <option value="Viaje">Viaje</option>
          <option value="Salud">Salud</option>
          <option value="Otro">Otro</option>
        </select>
      </div>
      <div class="form-group">
        <label><input type="checkbox" name="pagare_firmado" value="true" style="width:auto;margin-right:.4rem" /> Pagaré firmado</label>
      </div>
      <div class="form-group"><label>Nombre garantía</label><input name="nombre_garantia" /></div>
      <div class="form-group"><label>Teléfono garantía</label><input name="telefono_garantia" /></div>
      <div class="form-group"><label>DNI garantía</label><input name="dni_garantia" /></div>
      <div class="form-group"><label>Observaciones</label><textarea name="observaciones"></textarea></div>

      <div id="proyeccion" style="margin:1rem 0"></div>

      <button type="submit" class="btn-primary">Crear préstamo</button>
      <button type="button" class="btn-secondary" onclick="renderPrestamos()">Cancelar</button>
      <div id="formMsg"></div>
    </form>
  `;

  async function cargarTasas(moneda) {
    try {
      const tasas = await api.get(`/tasas?moneda=${moneda}`);
      const sel = document.getElementById('selectorCuotas');
      sel.innerHTML = '<option value="">Seleccionar...</option>' +
        tasas.map(t => `<option value="${t.total_cuotas}" data-tasa="${t.tasa_mensual}" data-total="${t.tasa_total_pct}">
          ${t.total_cuotas} cuota${t.total_cuotas > 1 ? 's' : ''} — Interés total: ${t.tasa_total_pct}%
        </option>`).join('');
      document.getElementById('tasaHidden').value = '';
      document.getElementById('infoTasa').textContent = '';
    } catch (_) {}
  }

  await cargarTasas('ARS');

  document.getElementById('monedaSelect').addEventListener('change', async e => {
    await cargarTasas(e.target.value);
  });

  document.getElementById('tipoAmortizacion').addEventListener('change', actualizarProyeccion);

  document.getElementById('selectorCuotas').addEventListener('change', e => {
    const opt = e.target.selectedOptions[0];
    if (!opt.dataset.tasa) return;
    document.getElementById('tasaHidden').value = opt.dataset.tasa;
    document.getElementById('infoTasa').textContent = `Tasa mensual: ${opt.dataset.tasa}%  |  Tasa total: ${opt.dataset.total}%`;
    actualizarProyeccion();
  });

  document.getElementById('montoCapital').addEventListener('input', actualizarProyeccion);

  async function actualizarProyeccion() {
    const cap = parseFloat(document.getElementById('montoCapital').value);
    const tasa = parseFloat(document.getElementById('tasaHidden').value);
    const cuotas = parseInt(document.getElementById('selectorCuotas').value);
    const tipoAmort = document.getElementById('tipoAmortizacion').value;
    if (!cap || !tasa || !cuotas) return;
    try {
      const { tabla, total_intereses } = await api.post('/calcular', {
        monto_capital: cap, tasa_interes_mensual: tasa, total_cuotas: cuotas, tipo_amortizacion: tipoAmort
      });
      const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
      document.getElementById('proyeccion').innerHTML = `
        <h4 style="margin-bottom:.5rem">Proyección de cuotas</h4>
        <table>
          <thead><tr><th>Cuota</th><th>Capital</th><th>Interés</th><th>Total cuota</th><th>Saldo</th></tr></thead>
          <tbody>${tabla.map(r => `
            <tr>
              <td>${r.cuota}</td>
              <td>$${fmt(r.capitalAmortizado)}</td>
              <td>$${fmt(r.interes)}</td>
              <td>$${fmt(r.cuotaTotal)}</td>
              <td>$${fmt(r.saldoRestante)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <p style="margin-top:.5rem;font-size:.9rem">Total intereses: <strong>$${fmt(total_intereses)}</strong></p>
      `;
    } catch (_) {}
  }

  document.getElementById('formPrestamo').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    fd.pagare_firmado = fd.pagare_firmado === 'true';
    const msg = document.getElementById('formMsg');
    try {
      await api.post('/prestamos', fd);
      renderPrestamos();
    } catch (err) {
      msg.innerHTML = `<span class="msg-error">${err.message}</span>`;
    }
  });
}

async function eliminarPago(pagoId, prestamoId) {
  if (!confirm('¿Eliminar este pago? Esta acción no se puede deshacer.')) return;
  try {
    await api.delete(`/pagos/${pagoId}`);
    renderPrestamoDetalle(prestamoId);
  } catch (err) {
    alert('Error al eliminar: ' + err.message);
  }
}
