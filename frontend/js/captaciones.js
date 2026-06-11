// Captaciones — capital recibido del inversor, a devolver con interés.
// Espejo simétrico de prestamos.js.

async function renderCaptaciones(verArchivadas = false) {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  const url = verArchivadas ? '/captaciones?estado=archivada' : '/captaciones';
  const captaciones = await api.get(url).catch(() => []);

  const semaforo = c => {
    if (c.estado === 'devuelta')  return '<span class="badge badge-verde">Devuelta</span>';
    if (c.estado === 'mora')      return '<span class="badge badge-rojo">Mora</span>';
    if (c.estado === 'archivada') return '<span class="badge" style="background:#f0f0f0;color:#888">Archivada</span>';
    return '<span class="badge badge-verde">Activa</span>';
  };
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const badgePer = c => c.periodicidad === 'semanal'
    ? '<span class="badge" style="background:#d6eaf8;color:#2980b9;font-size:.72rem;margin-left:.3rem">SEMANAL</span>'
    : '';

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Captaciones</h2>
      <div style="display:flex;gap:.5rem;align-items:center">
        <button class="btn-secondary" style="font-size:.85rem" onclick="renderCaptaciones(${!verArchivadas})">
          ${verArchivadas ? '← Ver activas' : 'Ver archivadas'}
        </button>
        <button class="btn-primary" onclick="renderCaptacionForm()">+ Nueva captación</button>
      </div>
    </div>
    ${verArchivadas ? '<p style="color:#888;font-size:.85rem;margin-bottom:1rem">Mostrando captaciones archivadas</p>' : ''}
    <table>
      <thead>
        <tr><th>Legajo</th><th>Inversor</th><th>Capital</th><th>Tasa</th><th>Cuotas/Sem.</th><th>1er Vcto</th><th>Tipo</th><th>Estado</th><th></th></tr>
      </thead>
      <tbody>
        ${captaciones.length === 0
          ? `<tr><td colspan="9" style="text-align:center;color:#999">${verArchivadas ? 'No hay captaciones archivadas' : 'Sin captaciones registradas'}</td></tr>`
          : captaciones.map(c => `
            <tr>
              <td><span style="font-family:var(--font-mono);font-size:.82rem;color:#888">K-${String(c.id).padStart(4,'0')}</span></td>
              <td>${esc(c.apellido)}, ${esc(c.nombre)}</td>
              <td>$${fmt(c.monto_capital)} ${esc(c.moneda)}</td>
              <td>${parseFloat(c.tasa_interes_mensual)}% ${c.periodicidad === 'semanal' ? 's.' : 'm.'}</td>
              <td>${c.total_cuotas}</td>
              <td>${String(c.primer_vencimiento).split('T')[0]}</td>
              <td style="font-size:.85rem">${esc((c.tipo || '').replace(/_/g, ' '))}</td>
              <td>${semaforo(c)} ${badgePer(c)}</td>
              <td><button class="btn-secondary" style="margin:0" onclick="renderCaptacionDetalle(${c.id})">Ver</button></td>
            </tr>`).join('')}
      </tbody>
    </table>
  `;
}

async function renderCaptacionDetalle(id) {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  const c = await api.get(`/captaciones/${id}`).catch(err => {
    app.innerHTML = `<p class="msg-error">${esc(err.message)}</p>`; return null;
  });
  if (!c) return;

  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });

  const labelTipo = d => {
    const tipo = d.tipo_pago;
    if (tipo === 'cuota_completa') return '<span class="badge" style="background:#d5f5e3;color:#27ae60">Cuota completa</span>';
    if (tipo === 'solo_interes')   return '<span class="badge" style="background:#fef9e7;color:#f39c12">Solo interés</span>';
    const cuotaEsperada = parseFloat(c.valor_cuota_base) + parseFloat(d.interes_pagado);
    const monto = parseFloat(d.monto_pagado);
    if (monto > cuotaEsperada + 0.5) return '<span class="badge" style="background:#d6eaf8;color:#2980b9">Adelanto parcial</span>';
    if (monto < cuotaEsperada - 0.5) return '<span class="badge" style="background:#fdecea;color:#c0392b">Pago parcial</span>';
    return '<span class="badge" style="background:#d5f5e3;color:#27ae60">Cuota completa</span>';
  };

  // ── Número de cuota + si se devolvió adelantado / en término / con atraso ──
  const fechaSolo = s => { const [y,m,d] = String(s).split('T')[0].split('-').map(Number); return new Date(y, m-1, d); };
  const esSemanal = c.periodicidad === 'semanal';
  const venceCuota = n => {
    const dt = fechaSolo(c.primer_vencimiento);
    if (esSemanal) dt.setDate(dt.getDate() + (n - 1) * 7);
    else dt.setMonth(dt.getMonth() + (n - 1));
    return dt;
  };
  const cronologico = [...c.devoluciones].sort((a, b) => {
    const fa = String(a.fecha_pago_real), fb = String(b.fecha_pago_real);
    return fa < fb ? -1 : fa > fb ? 1 : (a.id - b.id);
  });
  const cuotaDe = {};
  let _cc = 0;
  cronologico.forEach(d => { if (d.tipo_pago === 'cuota_completa') cuotaDe[d.id] = ++_cc; });

  const sello = (d, n) => {
    if (!d.fecha_pago_real) return '';
    const dias = Math.round((fechaSolo(d.fecha_pago_real) - venceCuota(n)) / 86400000);
    if (dias <= -1) return `<span style="color:#27ae60;font-weight:600">🟢 adelantado ${-dias}d</span>`;
    if (dias === 0) return `<span style="color:#888;font-weight:600">⚪ en término</span>`;
    return `<span style="color:#c0392b;font-weight:600">🔴 ${dias}d tarde</span>`;
  };
  const infoCuota = d => {
    const n = cuotaDe[d.id];
    if (!n) return '';
    return `<div style="font-size:.72rem;color:#888;margin-top:.25rem;white-space:nowrap">Cuota ${n}/${c.total_cuotas} · ${sello(d, n)} <span style="color:#aaa">(vencía ${venceCuota(n).toLocaleDateString('es-AR')})</span></div>`;
  };

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>
        <span style="font-family:var(--font-mono);font-size:.82rem;font-weight:400;color:#888;display:block;margin-bottom:.2rem">
          Legajo K-${String(c.id).padStart(4,'0')} · Socio S-${String(c.id_inversor).padStart(4,'0')}
        </span>
        ${esc(c.apellido)}, ${esc(c.nombre)}
        <span style="font-size:.75rem;font-weight:600;padding:.2rem .7rem;border-radius:12px;margin-left:.75rem;vertical-align:middle;${
          c.tipo_amortizacion === 'flat' ? 'background:#d5f5e3;color:#27ae60' :
          c.tipo_amortizacion === 'frances' ? 'background:#d6eaf8;color:#2980b9' :
          'background:#fef9e7;color:#e67e22'
        }">${
          c.tipo_amortizacion === 'flat' ? 'Cuota fija clásica' :
          c.tipo_amortizacion === 'frances' ? 'Cuota fija francesa' :
          'Cuota decreciente'
        }</span>
      </h2>
      <button class="btn-secondary" onclick="renderCaptaciones()">← Volver</button>
    </div>

    <div class="cards" style="margin-bottom:1.5rem">
      <div class="card"><div class="label">Capital original</div><div class="value">$${fmt(c.monto_capital)}</div></div>
      <div class="card"><div class="label">Saldo a devolver</div><div class="value">$${fmt(c.saldo_capital_actual)}</div></div>
      <div class="card"><div class="label">Total con intereses</div><div class="value">$${fmt(parseFloat(c.monto_capital) * (1 + parseFloat(c.tasa_interes_mensual) * c.total_cuotas / 100))}</div></div>
      <div class="card"><div class="label">Interés próx. ${c.periodicidad === 'semanal' ? 'semana' : 'mes'}</div><div class="value">$${fmt(c.interes_proximo_mes)}</div></div>
      <div class="card"><div class="label">Tasa ${c.periodicidad === 'semanal' ? 'semanal' : 'mensual'}</div><div class="value">${parseFloat(c.tasa_interes_mensual)}%</div></div>
      <div class="card"><div class="label">Cuotas</div><div class="value">${c.total_cuotas}</div></div>
      <div class="card"><div class="label">Tipo</div><div class="value" style="font-size:.95rem">${esc((c.tipo || '').replace(/_/g, ' '))}</div></div>
      <div class="card"><div class="label">Moneda</div><div class="value">${esc(c.moneda)}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
      <div style="background:white;border-radius:8px;padding:1rem 1.2rem;box-shadow:0 1px 4px rgba(0,0,0,.05)">
        <div style="font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:#888">Contrato de mutuo (físico)</div>
        <div style="font-size:1rem;margin-top:.3rem;font-family:var(--font-mono)">${esc(c.nro_contrato_mutuo || '—')}</div>
      </div>
      <div style="background:white;border-radius:8px;padding:1rem 1.2rem;box-shadow:0 1px 4px rgba(0,0,0,.05)">
        <div style="font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:#888">Pagaré</div>
        <div style="font-size:1rem;margin-top:.3rem;font-family:var(--font-mono)">${esc(c.nro_pagare || '—')}</div>
      </div>
    </div>

    <h3>Historial de devoluciones</h3>
    ${c.devoluciones.length === 0 ? '<p style="margin-bottom:1rem;color:#999">Sin devoluciones registradas.</p>' : `
    <table style="margin-bottom:1.5rem">
      <thead><tr><th>Fecha pago</th><th>Registrado</th><th>Tipo</th><th>Forma</th><th>Monto pagado</th><th>Capital devuelto</th><th>Interés</th><th>Saldo post-pago</th><th>Por</th><th></th></tr></thead>
      <tbody>
        ${c.devoluciones.map(d => `
          <tr>
            <td>${String(d.fecha_pago_real).split('T')[0].split('-').reverse().join('/')}</td>
            <td style="font-size:.8rem;color:#999">${new Date(d.fecha_registro).toLocaleDateString('es-AR')}</td>
            <td>${labelTipo(d)}${infoCuota(d)}</td>
            <td>${esc(d.forma_pago || 'transferencia')}</td>
            <td>$${fmt(d.monto_pagado)}</td>
            <td>$${fmt(d.capital_amortizado)}</td>
            <td>$${fmt(d.interes_pagado)}</td>
            <td>$${fmt(d.saldo_capital_post_pago)}</td>
            <td style="font-size:.8rem;color:#888">${esc(d.creado_por_nombre || '-')}</td>
            <td>
              <button class="btn-secondary" style="margin:0;padding:.3rem .7rem;font-size:.8rem" onclick="descargarPDF('/api/devoluciones/${d.id}/recibo','recibo-devolucion-${d.id}.pdf')">PDF</button>
              <button class="btn-secondary" style="margin:0;padding:.3rem .7rem;font-size:.8rem;color:var(--rojo)" onclick="eliminarDevolucion(${d.id}, ${c.id})">✕</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`}

    <div style="display:flex;gap:.75rem;flex-wrap:wrap">
      ${c.estado !== 'archivada' ? `<button class="btn-primary" onclick="renderDevolucionForm(${c.id})">Registrar devolución</button>` : ''}
      <button class="btn-secondary" onclick="descargarPDF('/api/captaciones/${c.id}/contrato-mutuo','mutuo-captacion-${c.id}.docx')">Descargar contrato de mutuo</button>
      ${c.estado === 'archivada'
        ? `<button class="btn-secondary" style="color:var(--verde-mid)" onclick="desarchivarCaptacion(${c.id})">Desarchivar</button>`
        : `<button class="btn-secondary" style="color:#888;margin-left:auto" onclick="archivarCaptacion(${c.id})">Archivar</button>`
      }
    </div>
  `;
}

async function renderCaptacionForm(idInversorPreseleccionado = null) {
  const app = document.getElementById('app');
  // Registro unificado: el inversor es un socio (BP) del registro de personas.
  const inversores = await api.get('/clientes').catch(() => []);

  const CUOTAS_OPTS = [1,2,3,4,5,6,7,8,9,10,11,12,18];

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Nueva captación</h2>
      <button class="btn-secondary" onclick="renderCaptaciones()">← Volver</button>
    </div>

    <div style="background:#fef9e7;border-left:3px solid #f39c12;padding:.65rem .85rem;border-radius:6px;font-size:.85rem;margin-bottom:1.25rem;max-width:700px">
      <strong>📌 Antes de registrar:</strong> el contrato de mutuo físico debe estar firmado por el inversor y por vos.
      Cargá su número en este formulario para vincular el registro con el documento legal.
    </div>

    <form id="formCaptacion" style="max-width:700px">
      <div class="form-group">
        <label>Inversor (socio) *</label>
        <select name="id_inversor" required>
          <option value="">Seleccionar...</option>
          ${inversores.map(i => `<option value="${i.id}" ${idInversorPreseleccionado == i.id ? 'selected' : ''}>${esc(i.apellido)}, ${esc(i.nombre)} — DNI ${esc(i.dni)} (S-${String(i.id).padStart(4,'0')})</option>`).join('')}
        </select>
        <small style="color:#888">¿No aparece? Cargalo primero en <strong>Socios</strong> y volvé acá.</small>
      </div>

      <div class="form-group">
        <label>Sistema de amortización *</label>
        <select name="tipo_amortizacion" id="tipoAmort">
          <option value="flat">Cuota fija clásica — interés sobre capital original (recomendado)</option>
          <option value="frances">Cuota fija francesa — interés sobre saldo (PMT)</option>
          <option value="aleman">Cuota decreciente — interés sobre saldo</option>
        </select>
      </div>

      <div class="form-group">
        <label>Tipo de captación</label>
        <select name="tipo">
          <option value="plazo_fijo">Plazo fijo — devuelvo en cuotas hasta cancelar</option>
          <option value="renovable">Renovable — al vencer el inversor puede renovar</option>
          <option value="a_la_vista">A la vista — devolución cuando el inversor lo pida</option>
        </select>
      </div>

      <div class="form-group">
        <label>Periodicidad de devolución</label>
        <div style="display:flex;gap:.5rem">
          <button type="button" id="btnMensual"
            style="flex:1;padding:.55rem;border:2px solid #1b4332;background:#1b4332;color:white;border-radius:7px;font-weight:700;cursor:pointer;font-family:inherit">
            Mensual
          </button>
          <button type="button" id="btnSemanal"
            style="flex:1;padding:.55rem;border:2px solid #1b4332;background:white;color:#1b4332;border-radius:7px;font-weight:700;cursor:pointer;font-family:inherit">
            Semanal
          </button>
        </div>
      </div>
      <input type="hidden" name="periodicidad" id="inputPeriodicidad" value="mensual" />

      <div class="form-group">
        <label>Monto capital *</label>
        <div style="display:flex;gap:.5rem">
          <input id="montoCapital" type="text" inputmode="numeric" required placeholder="$ 0" style="flex:1" />
          <select name="moneda" style="width:120px">
            <option value="ARS">ARS $</option>
            <option value="USD">USD $</option>
          </select>
        </div>
        <input type="hidden" name="monto_capital" id="montoCapitalRaw" />
      </div>

      <div class="form-group">
        <label>Tasa pactada * (% por periodo)</label>
        <input name="tasa_interes_mensual" type="number" step="0.01" required placeholder="ej: 5" />
        <small style="color:#888">La tasa la negociás directamente con cada inversor. Es la tasa por periodo (mensual o semanal según elijas arriba).</small>
      </div>

      <div class="form-group">
        <label id="labelCuotas">Cantidad de cuotas *</label>
        <select name="total_cuotas" id="selectorCuotas" required>
          <option value="">Seleccionar...</option>
          ${CUOTAS_OPTS.map(n => `<option value="${n}">${n} cuota${n>1?'s':''}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>Primer vencimiento *</label>
        <input name="primer_vencimiento" type="date" required />
      </div>

      <h4 style="margin-top:1.5rem;margin-bottom:.5rem;color:#1b4332;font-size:1rem">Documentación legal</h4>
      <div class="form-group">
        <label>N° contrato de mutuo (físico) *</label>
        <input name="nro_contrato_mutuo" required placeholder="ej: MUT-2026-001" />
      </div>
      <div class="form-group">
        <label>N° pagaré (físico)</label>
        <input name="nro_pagare" placeholder="ej: PAG-2026-001" />
      </div>

      <div class="form-group"><label>Observaciones</label><textarea name="observaciones"></textarea></div>

      <div style="margin-top:1.5rem;display:flex;gap:.5rem">
        <button type="submit" class="btn-primary">Crear captación</button>
        <button type="button" class="btn-secondary" onclick="renderCaptaciones()">Cancelar</button>
      </div>
      <div id="formMsg" style="margin-top:.5rem"></div>
    </form>
  `;

  // Formato de monto
  const montoInput = document.getElementById('montoCapital');
  const montoRaw   = document.getElementById('montoCapitalRaw');
  montoInput.addEventListener('input', () => {
    const digits = montoInput.value.replace(/\D/g, '');
    montoRaw.value = digits;
    montoInput.value = digits ? '$ ' + Number(digits).toLocaleString('es-AR') : '';
  });

  function cambiarPeriodo(p) {
    const isSem = p === 'semanal';
    document.getElementById('inputPeriodicidad').value = p;
    const btnM = document.getElementById('btnMensual');
    const btnS = document.getElementById('btnSemanal');
    btnM.style.background = isSem ? 'white' : '#1b4332';
    btnM.style.color = isSem ? '#1b4332' : 'white';
    btnS.style.background = isSem ? '#1b4332' : 'white';
    btnS.style.color = isSem ? 'white' : '#1b4332';
    const lbl = document.getElementById('labelCuotas');
    if (lbl) lbl.textContent = isSem ? 'Cantidad de semanas *' : 'Cantidad de cuotas *';
    const sel = document.getElementById('selectorCuotas');
    const opts = isSem ? [1,2,3,4,5,6,7,8,9,10,11,12] : [1,2,3,4,5,6,7,8,9,10,11,12,18];
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      opts.map(n => '<option value="' + n + '">' + n + (isSem ? (' semana' + (n>1?'s':'')) : (' cuota' + (n>1?'s':''))) + '</option>').join('');
    sel.value = '';
  }
  document.getElementById('btnMensual').addEventListener('click', () => cambiarPeriodo('mensual'));
  document.getElementById('btnSemanal').addEventListener('click', () => cambiarPeriodo('semanal'));

  document.getElementById('formCaptacion').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const msg = document.getElementById('formMsg');
    try {
      await api.post('/captaciones', fd);
      renderCaptaciones();
    } catch (err) {
      if (err._auth) return;
      msg.innerHTML = `<span class="msg-error">${esc(err.message)}</span>`;
    }
  });
}

async function archivarCaptacion(id) {
  if (!confirm('¿Archivar esta captación?')) return;
  try {
    await api.put(`/captaciones/${id}`, { estado: 'archivada' });
    renderCaptaciones();
  } catch (err) { if (err._auth) return; alert('Error: ' + err.message); }
}

async function desarchivarCaptacion(id) {
  if (!confirm('¿Restaurar esta captación?')) return;
  try {
    await api.put(`/captaciones/${id}`, { estado: 'activa' });
    renderCaptacionDetalle(id);
  } catch (err) { if (err._auth) return; alert('Error: ' + err.message); }
}

async function eliminarDevolucion(devId, captacionId) {
  if (!confirm('¿Eliminar esta devolución? Esta acción no se puede deshacer.')) return;
  try {
    await api.delete(`/devoluciones/${devId}`);
    renderCaptacionDetalle(captacionId);
  } catch (err) { if (err._auth) return; alert('Error: ' + err.message); }
}
