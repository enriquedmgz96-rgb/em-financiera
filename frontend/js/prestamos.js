async function descargarPDF(url, filename) {
  try {
    const token = localStorage.getItem('em_token');
    const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) { alert('Error al generar el archivo'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch(e) { alert("Error: " + e.message); }
}

async function renderPrestamos(verArchivados = false) {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  const url = verArchivados ? '/prestamos?estado=archivado' : '/prestamos';
  const prestamos = await api.get(url).catch(() => []);

  const semaforo = p => {
    if (p.estado === 'cancelado')  return '<span class="badge badge-verde">Cancelado</span>';
    if (p.estado === 'mora')       return '<span class="badge badge-rojo">Mora</span>';
    if (p.estado === 'archivado')  return '<span class="badge" style="background:#f0f0f0;color:#888">Archivado</span>';
    return '<span class="badge badge-verde">Activo</span>';
  };
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const badgePer = p => p.periodicidad === 'semanal'
    ? '<span class="badge" style="background:#d6eaf8;color:#2980b9;font-size:.72rem;margin-left:.3rem">SEMANAL</span>'
    : '';

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Préstamos</h2>
      <div style="display:flex;gap:.5rem;align-items:center">
        <button class="btn-secondary" style="font-size:.85rem" onclick="renderPrestamos(${!verArchivados})">
          ${verArchivados ? '← Ver activos' : 'Ver archivados'}
        </button>
        <button class="btn-primary" onclick="renderPrestamoForm()">+ Nuevo préstamo</button>
      </div>
    </div>
    ${verArchivados ? '<p style="color:#888;font-size:.85rem;margin-bottom:1rem">Mostrando préstamos archivados (ocultos de la lista principal)</p>' : ''}
    <table>
      <thead>
        <tr><th>Legajo</th><th>Cliente</th><th>Capital</th><th>Tasa</th><th>Cuotas/Sem.</th><th>1er Vcto</th><th>Estado</th><th>Creado por</th><th></th></tr>
      </thead>
      <tbody>
        ${prestamos.length === 0 ? `<tr><td colspan="8" style="text-align:center;color:#999">${verArchivados ? 'No hay préstamos archivados' : 'Sin préstamos registrados'}</td></tr>` :
          prestamos.map(p => `
            <tr>
              <td><span style="font-family:var(--font-mono);font-size:.82rem;color:#888">P-${String(p.id).padStart(4,'0')}</span></td>
              <td>${esc(p.apellido)}, ${esc(p.nombre)}</td>
              <td>$${fmt(p.monto_capital)} ${p.moneda}</td>
              <td>${parseFloat(p.tasa_interes_mensual)}% m.</td>
              <td>${p.total_cuotas}</td>
              <td>${String(p.primer_vencimiento).split('T')[0]}</td>
              <td>${semaforo(p)} ${badgePer(p)}</td>
              <td style="font-size:.82rem;color:#888">${esc(p.creado_por_nombre || '-')}</td>
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

  // Etiqueta del tipo de pago con badge de color.
  // - "cuota_completa" / "solo_interes" → siempre el mismo nombre.
  // - "adelanto_parcial" se distingue según monto vs. cuota completa teórica:
  //     · monto > cuota+interés → Adelanto parcial (paga de más, acelera capital)
  //     · monto < cuota+interés → Pago parcial   (cobertura incompleta)
  //     · monto ≈ cuota+interés → Cuota completa (igualó exacto un pago libre)
  const labelTipo = pg => {
    const tipo = pg.tipo_pago;
    if (tipo === 'cuota_completa') return '<span class="badge" style="background:#d5f5e3;color:#27ae60">Cuota completa</span>';
    if (tipo === 'solo_interes')   return '<span class="badge" style="background:#fef9e7;color:#f39c12">Solo interés</span>';
    const cuotaEsperada = parseFloat(p.valor_cuota_base) + parseFloat(pg.interes_pagado);
    const monto = parseFloat(pg.monto_pagado);
    const tol = 0.5;
    if (monto > cuotaEsperada + tol) return '<span class="badge" style="background:#d6eaf8;color:#2980b9">Adelanto parcial</span>';
    if (monto < cuotaEsperada - tol) return '<span class="badge" style="background:#fdecea;color:#c0392b">Pago parcial</span>';
    return '<span class="badge" style="background:#d5f5e3;color:#27ae60">Cuota completa</span>';
  };

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>
        <span style="font-family:var(--font-mono);font-size:.82rem;font-weight:400;color:#888;display:block;margin-bottom:.2rem">
          Legajo P-${String(p.id).padStart(4,'0')} · Cliente C-${String(p.id_cliente).padStart(4,'0')}
        </span>
        ${esc(p.apellido)}, ${esc(p.nombre)}
        <span style="font-size:.75rem;font-weight:600;padding:.2rem .7rem;border-radius:12px;margin-left:.75rem;vertical-align:middle;${
          p.tipo_amortizacion === 'flat' ? 'background:#d5f5e3;color:#27ae60' :
          p.tipo_amortizacion === 'frances' ? 'background:#d6eaf8;color:#2980b9' :
          'background:#fef9e7;color:#e67e22'
        }">${
          p.tipo_amortizacion === 'flat' ? 'Cuota fija clásica' :
          p.tipo_amortizacion === 'frances' ? 'Cuota fija francesa' :
          'Cuota decreciente'
        }</span>
      </h2>
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
      <thead><tr><th>Fecha pago</th><th>Registrado</th><th>Tipo</th><th>Forma</th><th>Monto pagado</th><th>Capital amort.</th><th>Interés</th><th>Saldo post-pago</th><th>Por</th><th></th></tr></thead>
      <tbody>
        ${p.pagos.map(pg => `
          <tr>
            <td>${String(pg.fecha_pago_real).split('T')[0].split('-').reverse().join('/')}</td>
            <td style="font-size:.8rem;color:#999">${new Date(pg.fecha_registro).toLocaleDateString('es-AR')}</td>
            <td>${labelTipo(pg)}</td>
            <td>${esc(pg.forma_pago || 'efectivo')}</td>
            <td>$${fmt(pg.monto_pagado)}</td>
            <td>$${fmt(pg.capital_amortizado)}</td>
            <td>$${fmt(pg.interes_pagado)}</td>
            <td>$${fmt(pg.saldo_capital_post_pago)}</td>
            <td style="font-size:.8rem;color:#888">${esc(pg.creado_por_nombre || '-')}</td>
            <td style="display:flex;gap:.3rem">
              <button class="btn-secondary" style="margin:0;padding:.3rem .7rem;font-size:.8rem" onclick="descargarPDF('/api/pagos/${pg.id}/recibo','recibo-${pg.id}.pdf')">PDF</button>
              <button class="btn-secondary" style="margin:0;padding:.3rem .7rem;font-size:.8rem;color:var(--rojo)" onclick="eliminarPago(${pg.id}, ${p.id})">✕</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`}

    <div style="display:flex;gap:.75rem;flex-wrap:wrap">
      ${p.estado !== 'archivado' ? `<button class="btn-primary" onclick="renderPagoForm(${p.id})">Registrar pago</button>` : ''}
      <button class="btn-secondary" onclick="descargarPDF('/api/prestamos/${p.id}/contrato-mutuo','mutuo-prestamo-${p.id}.docx')">Descargar contrato</button>
      <button class="btn-secondary" onclick="descargarPDF('/api/prestamos/${p.id}/resumen','estado-cuenta-${p.id}.pdf')">Estado de cuenta</button>
      ${p.estado === 'archivado'
        ? `<button class="btn-secondary" style="color:var(--verde-mid)" onclick="desarchivarPrestamo(${p.id})">Desarchivar</button>`
        : `<button class="btn-secondary" style="color:#888;margin-left:auto" onclick="archivarPrestamo(${p.id})">Archivar</button>`
      }
    </div>
  `;
}

async function renderPrestamoForm(idClientePreseleccionado = null) {
  const app = document.getElementById('app');
  const [clientes, categoriasMensual, categoriasSemanal] = await Promise.all([
    api.get('/clientes').catch(() => []),
    api.get('/categorias?periodicidad=mensual').catch(() => []),
    api.get('/categorias?periodicidad=semanal').catch(() => [])
  ]);

  const colorBadge = c => ({ verde: '#1b4332', amarillo: '#9a7b3f', rojo: '#c0392b', azul: '#2980b9' }[c] || '#2980b9');
  const CUOTAS_OPTS = [1,2,3,4,5,6,7,8,9,10,11,12,18];

  const botonesCategorias = (cats, isSem) => cats.map((c, i) => `
    <button type="button" onclick="_selCat(${parseFloat(c.tasa_mensual)}, this)"
      style="border:2px solid ${colorBadge(c.color)};background:${i===0 ? colorBadge(c.color) : 'white'};color:${i===0 ? 'white' : colorBadge(c.color)};padding:.35rem 1rem;border-radius:20px;cursor:pointer;font-weight:600;font-size:.9rem;transition:.15s">
      ${parseFloat(c.tasa_mensual)}% ${isSem ? 'semanal' : 'mensual'}
    </button>`).join('');

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
          ${clientes.map(c => `<option value="${c.id}" ${idClientePreseleccionado == c.id ? 'selected' : ''}>${esc(c.apellido)}, ${esc(c.nombre)} — DNI ${esc(c.dni)} (C-${String(c.id).padStart(4,'0')})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Sistema de amortización *</label>
        <select name="tipo_amortizacion" id="tipoAmortizacion">
          <option value="flat">Cuota fija clásica — interés sobre capital original (recomendado)</option>
          <option value="frances">Cuota fija francesa — interés sobre saldo (PMT)</option>
          <option value="aleman">Cuota decreciente — interés sobre saldo</option>
        </select>
        <small style="color:#555;margin-top:.3rem;display:block">
          Clásica: siempre la misma cuota, interés calculado sobre el capital original · Francesa: cuota fija pero menor, interés sobre saldo · Decreciente: primer mes más caro, luego baja
        </small>
      </div>
      <div class="form-group">
        <label>Periodicidad de cuotas</label>
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
          <select name="moneda" id="monedaSelect" style="width:120px">
            <option value="ARS">ARS $</option>
            <option value="USD">USD $</option>
          </select>
        </div>
        <input type="hidden" name="monto_capital" id="montoCapitalRaw" />
      </div>

      <div class="form-group">
        <label>Tasa de interés *</label>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.4rem" id="btnsCategorias">
          ${botonesCategorias(categoriasMensual, false)}
          <span style="font-size:.8rem;color:#888;align-self:center" id="labelTasaPersonalizada"></span>
        </div>
        <div style="margin-top:.6rem;display:flex;gap:.5rem;align-items:center">
          <small style="color:#888">O ingresar tasa manual:</small>
          <input type="number" id="tasaManual" step="0.01" min="0" placeholder="ej: 8.5"
            style="width:90px;padding:.3rem .5rem;font-size:.85rem;border:1px solid #ddd;border-radius:6px" />
          <small style="color:#888" id="labelTasaManualUnidad">% mensual</small>
        </div>
      </div>
      <input type="hidden" name="tasa_interes_mensual" id="tasaHidden"
        value="${categoriasMensual.length > 0 ? parseFloat(categoriasMensual[0].tasa_mensual) : ''}" />

      <div class="form-group">
        <label id="labelCuotas">Cantidad de cuotas *</label>
        <select name="total_cuotas" id="selectorCuotas" required>
          <option value="">Seleccionar...</option>
          ${CUOTAS_OPTS.map(n => `<option value="${n}">${n} cuota${n>1?'s':''}</option>`).join('')}
        </select>
        <small id="infoTasa" style="color:#555;margin-top:.3rem;display:block"></small>
      </div>

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
      <div class="form-group"><label>CUIL garantía *</label><input name="cuil_garantia" required /></div>
      <div class="form-group"><label>Domicilio garantía *</label><input name="domicilio_garantia" required /></div>
      <div class="form-group"><label>Observaciones</label><textarea name="observaciones"></textarea></div>

      <div id="proyeccion" style="margin:1rem 0"></div>

      <button type="submit" class="btn-primary">Crear préstamo</button>
      <button type="button" class="btn-secondary" onclick="renderPrestamos()">Cancelar</button>
      <div id="formMsg"></div>
    </form>
  `;

  // Selección de categoría
  window._selCat = (tasa, btn) => {
    document.querySelectorAll('#btnsCategorias button').forEach(b => {
      b.style.background = 'white';
      b.style.color = b.style.borderColor;
    });
    btn.style.background = btn.style.borderColor;
    btn.style.color = 'white';
    document.getElementById('tasaHidden').value = tasa;
    document.getElementById('tasaManual').value = '';
    document.getElementById('labelTasaPersonalizada').textContent = '';
    actualizarInfoTasa();
    actualizarProyeccion();
  };

  // Tasa manual
  document.getElementById('tasaManual').addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    if (!val || val <= 0) return;
    // Deselect all category buttons
    document.querySelectorAll('#btnsCategorias button').forEach(b => {
      b.style.background = 'white';
      b.style.color = b.style.borderColor;
    });
    document.getElementById('tasaHidden').value = val;
    document.getElementById('labelTasaPersonalizada').textContent = `→ ${val}% aplicado`;
    actualizarInfoTasa();
    actualizarProyeccion();
  });

  document.getElementById('tipoAmortizacion').addEventListener('change', actualizarProyeccion);

  document.getElementById('selectorCuotas').addEventListener('change', () => {
    actualizarInfoTasa();
    actualizarProyeccion();
  });

  function actualizarInfoTasa() {
    const tasa = parseFloat(document.getElementById('tasaHidden').value);
    const cuotas = parseInt(document.getElementById('selectorCuotas').value);
    const isSem = document.getElementById('inputPeriodicidad').value === 'semanal';
    const info = document.getElementById('infoTasa');
    if (tasa && cuotas) {
      const palabra = isSem ? 'semanal' : 'mensual';
      info.textContent = `Tasa ${palabra}: ${tasa}%  |  Tasa total: ${parseFloat((tasa * cuotas).toFixed(2))}%`;
    } else {
      info.textContent = '';
    }
  }

  // Formato de monto: separador de miles y signo $, sin decimales
  const montoInput = document.getElementById('montoCapital');
  const montoRaw   = document.getElementById('montoCapitalRaw');
  montoInput.addEventListener('input', () => {
    const digits = montoInput.value.replace(/\D/g, '');
    montoRaw.value = digits;
    montoInput.value = digits ? '$ ' + Number(digits).toLocaleString('es-AR') : '';
    actualizarProyeccion();
  });

  async function actualizarProyeccion() {
    const cap = parseFloat(document.getElementById('montoCapitalRaw').value);
    const tasa = parseFloat(document.getElementById('tasaHidden').value);
    const cuotas = parseInt(document.getElementById('selectorCuotas').value);
    const tipoAmort = document.getElementById('tipoAmortizacion').value;
    if (!cap || !tasa || !cuotas) return;
    try {
      const { tabla, total_intereses } = await api.post('/calcular', {
        monto_capital: cap, tasa_interes_mensual: tasa, total_cuotas: cuotas, tipo_amortizacion: tipoAmort
      });
      const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
      const totalPagar = parseFloat(cap) + parseFloat(total_intereses);
      document.getElementById('proyeccion').innerHTML = `
        <h4 style="margin-bottom:.75rem">Proyección de cuotas</h4>

        <!-- Leyenda de columnas -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.5rem;margin-bottom:.9rem">
          <div style="background:#f0f4f0;border-left:3px solid #1b4332;padding:.45rem .7rem;border-radius:4px;font-size:.78rem">
            <strong style="display:block;color:#1b4332">N° Cuota</strong>
            <span style="color:#555">Número de pago mensual</span>
          </div>
          <div style="background:#f0f4f0;border-left:3px solid #1b4332;padding:.45rem .7rem;border-radius:4px;font-size:.78rem">
            <strong style="display:block;color:#1b4332">Capital</strong>
            <span style="color:#555">Parte que reduce la deuda</span>
          </div>
          <div style="background:#fdf6ec;border-left:3px solid #9a7b3f;padding:.45rem .7rem;border-radius:4px;font-size:.78rem">
            <strong style="display:block;color:#9a7b3f">Interés</strong>
            <span style="color:#555">Costo del préstamo ese mes</span>
          </div>
          <div style="background:#f5f0ff;border-left:3px solid #6c5ce7;padding:.45rem .7rem;border-radius:4px;font-size:.78rem">
            <strong style="display:block;color:#6c5ce7">Total cuota</strong>
            <span style="color:#555">Lo que paga el cliente ese mes</span>
          </div>
          <div style="background:#f8f8f8;border-left:3px solid #888;padding:.45rem .7rem;border-radius:4px;font-size:.78rem">
            <strong style="display:block;color:#444">Saldo restante</strong>
            <span style="color:#555">Deuda de capital que queda</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>N° Cuota</th>
              <th>Capital</th>
              <th>Interés</th>
              <th>Total cuota</th>
              <th>Saldo restante</th>
            </tr>
          </thead>
          <tbody>${tabla.map(r => `
            <tr>
              <td style="font-weight:600;color:#888">${r.cuota}</td>
              <td style="color:#1b4332;font-weight:600">$${fmt(r.capitalAmortizado)}</td>
              <td style="color:#9a7b3f">$${fmt(r.interes)}</td>
              <td style="font-weight:700">$${fmt(r.cuotaTotal)}</td>
              <td style="color:#666">$${fmt(r.saldoRestante)}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <!-- Resumen totales -->
        <div style="display:flex;gap:.75rem;margin-top:.9rem;flex-wrap:wrap">
          <div style="background:#f0f4f0;border:1px solid #c8dbd0;padding:.55rem 1rem;border-radius:6px;font-size:.88rem">
            Capital prestado: <strong>$${fmt(cap)}</strong>
          </div>
          <div style="background:#fdf6ec;border:1px solid #e8d5b0;padding:.55rem 1rem;border-radius:6px;font-size:.88rem">
            Total intereses: <strong style="color:#9a7b3f">$${fmt(total_intereses)}</strong>
          </div>
          <div style="background:#f5f0ff;border:1px solid #c9bff5;padding:.55rem 1rem;border-radius:6px;font-size:.88rem">
            Total a devolver: <strong style="color:#6c5ce7">$${fmt(totalPagar)}</strong>
          </div>
        </div>
      `;
    } catch (_) {}
  }

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
    const lblUnidad = document.getElementById('labelTasaManualUnidad');
    if (lblUnidad) lblUnidad.textContent = isSem ? '% semanal' : '% mensual';
    const sel = document.getElementById('selectorCuotas');
    const opts = isSem ? [1,2,3,4,5,6,7,8,9,10,11,12] : [1,2,3,4,5,6,7,8,9,10,11,12,18];
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      opts.map(n => '<option value="' + n + '">' + n + (isSem ? (' semana' + (n>1?'s':'')) : (' cuota' + (n>1?'s':''))) + '</option>').join('');
    sel.value = '';
    document.getElementById('tasaManual').value = '';
    rebuildCategorias(isSem);
    document.getElementById('infoTasa').textContent = '';
    actualizarProyeccion();
  }

  function rebuildCategorias(isSem) {
    const cats = isSem ? categoriasSemanal : categoriasMensual;
    const cont = document.getElementById('btnsCategorias');
    cont.innerHTML = botonesCategorias(cats, isSem) +
      '<span style="font-size:.8rem;color:#888;align-self:center" id="labelTasaPersonalizada"></span>';
    const first = cont.querySelector('button');
    if (first) {
      first.click();
    } else {
      document.getElementById('tasaHidden').value = '';
      actualizarInfoTasa();
    }
  }

  document.getElementById('btnMensual').addEventListener('click', () => cambiarPeriodo('mensual'));
  document.getElementById('btnSemanal').addEventListener('click', () => cambiarPeriodo('semanal'));

  document.getElementById('formPrestamo').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    fd.pagare_firmado = fd.pagare_firmado === 'true';
    const msg = document.getElementById('formMsg');
    try {
      await api.post('/prestamos', fd);
      renderPrestamos();
    } catch (err) {
      if (err._auth) return;
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
    if (err._auth) return;
    alert('Error al eliminar: ' + err.message);
  }
}

async function archivarPrestamo(id) {
  if (!confirm('¿Archivar este préstamo? Va a quedar oculto de la lista principal pero podés verlo en "Ver archivados".')) return;
  try {
    await api.put(`/prestamos/${id}`, { estado: 'archivado' });
    renderPrestamos();
  } catch (err) {
    if (err._auth) return;
    alert('Error al archivar: ' + err.message);
  }
}

async function desarchivarPrestamo(id) {
  if (!confirm('¿Restaurar este préstamo a la lista principal?')) return;
  try {
    await api.put(`/prestamos/${id}`, { estado: 'activo' });
    renderPrestamoDetalle(id);
  } catch (err) {
    if (err._auth) return;
    alert('Error al desarchivar: ' + err.message);
  }
}
