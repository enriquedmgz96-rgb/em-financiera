async function renderSimulador() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';

  const [tasas, categoriasMensual, categoriasSemanal] = await Promise.all([
    api.get('/tasas?moneda=ARS').catch(() => []),
    api.get('/categorias?periodicidad=mensual').catch(() => []),
    api.get('/categorias?periodicidad=semanal').catch(() => [])
  ]);
  let categorias = categoriasMensual;

  const colorBadge = c => ({ verde: '#27ae60', amarillo: '#f39c12', rojo: '#e74c3c', azul: '#2980b9' }[c] || '#2980b9');

  app.innerHTML = `
    <h2>Tasas & Simulador</h2>

    <div style="background:white;padding:1.2rem;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:1.5rem">
      <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem">
        <div class="form-group" style="margin-bottom:0;flex:1;min-width:180px">
          <label>Nombre del cliente (opcional)</label>
          <input type="text" id="nombreSim" placeholder="Ej: Juan Pérez" />
        </div>
        <div class="form-group" style="margin-bottom:0;flex:1;min-width:180px">
          <label>Monto a prestar</label>
          <input type="text" id="montoSim" placeholder="Ej: $ 1.100.000" style="font-size:1.1rem;font-weight:600" />
        </div>
      </div>
      <div style="display:flex;gap:.5rem;margin-bottom:.75rem">
        <button id="simBtnMensual" onclick="simCambiarPeriodo('mensual')"
          style="flex:1;padding:.45rem;border:2px solid #1b4332;background:#1b4332;color:white;border-radius:7px;font-weight:700;cursor:pointer;font-family:inherit">
          Mensual
        </button>
        <button id="simBtnSemanal" onclick="simCambiarPeriodo('semanal')"
          style="flex:1;padding:.45rem;border:2px solid #1b4332;background:white;color:#1b4332;border-radius:7px;font-weight:700;cursor:pointer;font-family:inherit">
          Semanal
        </button>
      </div>

      <div id="simSeccionTasa" class="form-group" style="margin-bottom:0">
        <label>Tasa de interés mensual</label>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem" id="btnsCategorias">
          ${categoriasMensual.map((c, i) => `
            <button onclick="seleccionarCategoria(${c.tasa_mensual}, this)"
              style="border:2px solid ${colorBadge(c.color)};background:${i===0?colorBadge(c.color):'white'};color:${i===0?'white':colorBadge(c.color)};padding:.4rem 1rem;border-radius:20px;cursor:pointer;font-weight:600;transition:.2s">
              ${parseFloat(c.tasa_mensual)}% mensual
            </button>`).join('')}
        </div>
      </div>
    </div>

    <div style="margin:.75rem 0;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
      <span style="font-size:.85rem;color:#555;font-weight:600">Sistema:</span>
      <button id="btnFlat" onclick="seleccionarSistema('flat',this)" style="border:2px solid #27ae60;background:#27ae60;color:white;padding:.3rem .9rem;border-radius:20px;cursor:pointer;font-size:.85rem;font-weight:600">Clásico (interés plano)</button>
      <button id="btnFrances" onclick="seleccionarSistema('frances',this)" style="border:2px solid #2980b9;background:white;color:#2980b9;padding:.3rem .9rem;border-radius:20px;cursor:pointer;font-size:.85rem;font-weight:600">Francés (PMT)</button>
      <button id="btnAleman" onclick="seleccionarSistema('aleman',this)" style="border:2px solid #e67e22;background:white;color:#e67e22;padding:.3rem .9rem;border-radius:20px;cursor:pointer;font-size:.85rem;font-weight:600">Decreciente</button>
    </div>

    <div id="tablaSim"></div>

    <div style="margin-top:2rem;border-top:1px solid #eee;padding-top:1rem">
      <h4 style="margin-bottom:.75rem;color:#666;font-size:.9rem">Administrar categorías</h4>
      <div style="margin-bottom:.5rem;font-size:.8rem;font-weight:600;color:#1b4332">Mensuales</div>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.75rem">
        ${categoriasMensual.map(c => `
          <div style="display:flex;align-items:center;gap:.3rem;background:#f8f9fa;padding:.3rem .6rem;border-radius:8px">
            <span style="background:${colorBadge(c.color)};color:white;padding:.2rem .6rem;border-radius:10px;font-size:.8rem">${esc(c.nombre)}</span>
            <span style="font-size:.85rem;font-weight:600">${parseFloat(c.tasa_mensual)}% m.</span>
            <button class="btn-secondary" style="margin:0;padding:.15rem .4rem;font-size:.75rem" onclick="editarCategoria(${c.id}, '${escJs(c.nombre)}', ${c.tasa_mensual}, '${escJs(c.color)}', 'mensual')">✎</button>
            <button class="btn-secondary" style="margin:0;padding:.15rem .4rem;font-size:.75rem;color:var(--rojo)" onclick="eliminarCategoria(${c.id})">✕</button>
          </div>`).join('')}
        <button class="btn-secondary" style="font-size:.85rem" onclick="nuevaCategoria('mensual')">+ Nueva mensual</button>
      </div>
      <div style="margin-bottom:.5rem;font-size:.8rem;font-weight:600;color:#2980b9">Semanales</div>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center">
        ${categoriasSemanal.map(c => `
          <div style="display:flex;align-items:center;gap:.3rem;background:#f8f9fa;padding:.3rem .6rem;border-radius:8px">
            <span style="background:${colorBadge(c.color)};color:white;padding:.2rem .6rem;border-radius:10px;font-size:.8rem">${esc(c.nombre)}</span>
            <span style="font-size:.85rem;font-weight:600">${parseFloat(c.tasa_mensual)}% sem.</span>
            <button class="btn-secondary" style="margin:0;padding:.15rem .4rem;font-size:.75rem" onclick="editarCategoria(${c.id}, '${escJs(c.nombre)}', ${c.tasa_mensual}, '${escJs(c.color)}', 'semanal')">✎</button>
            <button class="btn-secondary" style="margin:0;padding:.15rem .4rem;font-size:.75rem;color:var(--rojo)" onclick="eliminarCategoria(${c.id})">✕</button>
          </div>`).join('')}
        <button class="btn-secondary" style="font-size:.85rem" onclick="nuevaCategoria('semanal')">+ Nueva semanal</button>
      </div>
    </div>
  `;

  // Tasa seleccionada por defecto: primera categoría mensual
  let tasaSeleccionada = categoriasMensual.length > 0 ? parseFloat(categoriasMensual[0].tasa_mensual) : 7.5;
  window._sistemaSimulador = 'flat';

  window.seleccionarSistema = (sistema, btn) => {
    window._sistemaSimulador = sistema;
    const colores = { flat: '#27ae60', frances: '#2980b9', aleman: '#e67e22' };
    ['btnFlat','btnFrances','btnAleman'].forEach(id => {
      const b = document.getElementById(id);
      if (!b) return;
      b.style.background = 'white';
      b.style.color = b.style.borderColor;
    });
    btn.style.background = btn.style.borderColor;
    btn.style.color = 'white';
    const raw = document.getElementById('montoSim').value.replace(/\D/g, '');
    if (raw) simular(parseInt(raw), tasaSeleccionada, sistema, _simPeriodicidad === 'semanal');
  };

  window.seleccionarCategoria = (tasa, btn) => {
    document.querySelectorAll('#btnsCategorias button').forEach(b => {
      const color = b.style.borderColor;
      b.style.background = 'white';
      b.style.color = color;
    });
    btn.style.background = btn.style.borderColor;
    btn.style.color = 'white';
    tasaSeleccionada = tasa;
    const raw = document.getElementById('montoSim').value.replace(/\D/g, '');
    if (raw) simular(parseInt(raw), tasaSeleccionada, window._sistemaSimulador, _simPeriodicidad === 'semanal');
  };

  let _simPeriodicidad = 'mensual';

  // Guardar HTML original de categorías (mensual)
  const _htmlCatsMensual = document.getElementById('btnsCategorias').innerHTML;
  const _labelTasaEl = document.querySelector('#simSeccionTasa label');
  const _labelTasaOriginal = _labelTasaEl ? _labelTasaEl.textContent : 'Tasa de interés mensual';

  window.simCambiarPeriodo = async (p) => {
    _simPeriodicidad = p;
    const isSem = p === 'semanal';
    const btnM = document.getElementById('simBtnMensual');
    const btnS = document.getElementById('simBtnSemanal');
    if (btnM) { btnM.style.background = isSem ? 'white' : '#1b4332'; btnM.style.color = isSem ? '#1b4332' : 'white'; }
    if (btnS) { btnS.style.background = isSem ? '#1b4332' : 'white'; btnS.style.color = isSem ? 'white' : '#1b4332'; }

    const labelEl = document.querySelector('#simSeccionTasa label');
    if (labelEl) labelEl.textContent = isSem ? 'Tasa de interés semanal' : _labelTasaOriginal;

    const contenedor = document.getElementById('btnsCategorias');
    if (isSem) {
      categorias = categoriasSemanal;
      const colorMap = { verde: '#27ae60', amarillo: '#f39c12', rojo: '#e74c3c', azul: '#2980b9' };
      contenedor.innerHTML = categoriasSemanal.map((c, i) => `
        <button onclick="seleccionarCategoria(${parseFloat(c.tasa_mensual)}, this)"
          style="border:2px solid ${colorMap[c.color]||'#2980b9'};background:${i===0?colorMap[c.color]||'#2980b9':'white'};color:${i===0?'white':colorMap[c.color]||'#2980b9'};padding:.4rem 1rem;border-radius:20px;cursor:pointer;font-weight:600;transition:.2s">
          ${parseFloat(c.tasa_mensual)}% semanal
        </button>`).join('') || '<span style="color:#888;font-size:.85rem">Sin categorías semanales configuradas</span>';
      tasaSeleccionada = categoriasSemanal.length > 0 ? parseFloat(categoriasSemanal[0].tasa_mensual) : 3;
    } else {
      categorias = categoriasMensual;
      contenedor.innerHTML = _htmlCatsMensual;
      tasaSeleccionada = categoriasMensual.length > 0 ? parseFloat(categoriasMensual[0].tasa_mensual) : 7.5;
    }

    const raw = document.getElementById('montoSim').value.replace(/\D/g, '');
    if (raw) simular(parseInt(raw), tasaSeleccionada, window._sistemaSimulador, isSem);
  };

  document.getElementById('montoSim').addEventListener('input', e => {
    const raw = e.target.value.replace(/\D/g, '');
    e.target.value = raw ? '$ ' + Number(raw).toLocaleString('es-AR') : '';
    simular(parseInt(raw) || 0, tasaSeleccionada, window._sistemaSimulador, _simPeriodicidad === 'semanal');
  });
}

function calcPMT(capital, tasa, n) {
  const r = tasa / 100;
  if (r === 0) return capital / n;
  return capital * r / (1 - Math.pow(1 + r, -n));
}

function simular(monto, tasaMensual, sistema = 'flat', isSemanal = false) {
  const contenedor = document.getElementById('tablaSim');
  if (!monto || monto <= 0) { contenedor.innerHTML = ''; return; }

  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const cuotas = isSemanal ? [1,2,3,4,5,6,7,8,9,10,11,12] : [1,2,3,4,5,6,7,8,9,10,11,12,18];
  const unidad = isSemanal ? 'semana' : 'cuota';
  const unidadPlural = isSemanal ? 'semanas' : 'cuotas';

  const filas = cuotas.map(n => {
    let precioCuota, totalFinanciado, tasaTotal;
    const r = tasaMensual / 100;
    tasaTotal = tasaMensual * n;

    if (sistema === 'flat') {
      // Interés fijo sobre capital original: (capital/n) + capital×tasa
      precioCuota = (monto / n) + monto * r;
      totalFinanciado = precioCuota * n;
    } else if (sistema === 'frances') {
      // PMT: cuota fija con interés sobre saldo
      precioCuota = calcPMT(monto, tasaMensual, n);
      totalFinanciado = precioCuota * n;
    } else {
      // Alemán: primer mes (el más caro), interés sobre saldo
      precioCuota = (monto / n) + monto * r; // = mismo que flat para mes 1
      totalFinanciado = monto / n * n + monto * r * n * (n + 1) / 2 / n; // aprox. total intereses
      // Total real = suma de todas las cuotas decrecientes
      let totalReal = 0, saldo = monto;
      for (let i = 1; i <= n; i++) {
        totalReal += (monto / n) + saldo * r;
        saldo -= monto / n;
      }
      totalFinanciado = totalReal;
    }
    return { n, tasaTotal, totalFinanciado, precioCuota };
  });

  const labels = { flat: 'Clásico — Interés plano', frances: 'Francés — PMT', aleman: 'Decreciente — 1ª cuota' };
  const colHeader = isSemanal
    ? { flat: 'Cuota semanal (fija)', frances: 'Cuota semanal (fija)', aleman: '1ª cuota (decrece)' }
    : { flat: 'Cuota mensual (fija)', frances: 'Cuota mensual (fija)', aleman: '1ª cuota (decrece)' };

  contenedor.innerHTML = `
    <table>
      <thead>
        <tr><th>${isSemanal ? 'Semanas' : 'Cuotas'}</th><th>${isSemanal ? 'Tasa semanal' : 'Tasa mensual'}</th><th>${colHeader[sistema] || 'Cuota'}</th><th>Total a pagar</th></tr>
      </thead>
      <tbody>
        ${filas.map(f => `
          <tr>
            <td><strong>${f.n} ${isSemanal ? (f.n === 1 ? 'semana' : 'semanas') : (f.n === 1 ? 'cuota' : 'cuotas')}</strong></td>
            <td>${parseFloat(tasaMensual)}%</td>
            <td>$ ${fmt(f.precioCuota)}</td>
            <td>$ ${fmt(f.totalFinanciado)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:1rem">
      <button class="btn-primary" onclick="generarPresupuesto(${monto}, ${tasaMensual}, '${sistema}', ${isSemanal})">Generar presupuesto</button>
    </div>
  `;
}

async function nuevaCategoria(periodicidad = 'mensual') {
  const esSem = periodicidad === 'semanal';
  const nombre = prompt(`Nombre de la categoría ${esSem ? 'semanal' : 'mensual'} (ej: Riesgo alto):`);
  if (!nombre) return;
  const tasa = prompt(`Tasa ${esSem ? 'semanal' : 'mensual'} (ej: ${esSem ? '3.5' : '10'}):`);
  if (!tasa || isNaN(tasa)) { alert('Tasa inválida'); return; }
  const color = prompt('Color (verde / amarillo / rojo / azul):', 'azul');
  try {
    await api.post('/categorias', { nombre, tasa_mensual: parseFloat(tasa), color: color || 'azul', periodicidad });
    renderSimulador();
  } catch (err) { if (err._auth) return; alert('Error: ' + err.message); }
}

async function editarCategoria(id, nombreActual, tasaActual, colorActual, periodicidad = 'mensual') {
  const esSem = periodicidad === 'semanal';
  const nombre = prompt('Nombre:', nombreActual);
  if (nombre === null) return;
  const tasa = prompt(`Tasa ${esSem ? 'semanal' : 'mensual'}:`, tasaActual);
  if (tasa === null) return;
  if (!confirm(`¿Guardar cambios en "${nombre}" con tasa ${tasa}%?`)) return;
  try {
    await api.put(`/categorias/${id}`, { nombre, tasa_mensual: parseFloat(tasa) });
    renderSimulador();
  } catch (err) { if (err._auth) return; alert('Error: ' + err.message); }
}

async function eliminarCategoria(id) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  try {
    await api.delete(`/categorias/${id}`);
    renderSimulador();
  } catch (err) { if (err._auth) return; alert('Error: ' + err.message); }
}

function generarPresupuesto(monto, tasaMensual, sistema = 'flat', isSemanal = false) {
  const nombre = document.getElementById('nombreSim').value.trim() || 'Cliente';
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const cuotas = isSemanal ? [1,2,3,4,5,6,7,8,9,10,11,12] : [1,2,3,4,5,6,7,8,9,10,11,12,18];
  const sistemaLabel = { flat: 'Cuota fija clásica (interés plano)', frances: 'Cuota fija francesa (PMT)', aleman: 'Cuota decreciente' }[sistema] || '';
  const r = tasaMensual / 100;

  const filas = cuotas.map(n => {
    let precioCuota, totalFinanciado;
    if (sistema === 'frances') {
      precioCuota = calcPMT(monto, tasaMensual, n);
      totalFinanciado = precioCuota * n;
    } else if (sistema === 'aleman') {
      let totalReal = 0, saldo = monto;
      for (let i = 1; i <= n; i++) { totalReal += (monto / n) + saldo * r; saldo -= monto / n; }
      precioCuota = (monto / n) + monto * r; // primera cuota
      totalFinanciado = totalReal;
    } else {
      precioCuota = (monto / n) + monto * r;
      totalFinanciado = precioCuota * n;
    }
    return { n, tasaTotal: tasaMensual * n, totalFinanciado, precioCuota };
  });

  const colCuota = sistema === 'aleman' ? '1ª cuota' : (isSemanal ? 'Cuota semanal' : 'Cuota mensual');
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Presupuesto — ${esc(nombre)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #2c3e50; padding: 2rem; max-width: 640px; margin: 0 auto; }
    .header { border-bottom: 3px solid #1b4332; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 1.6rem; font-weight: 700; color: #1b4332; }
    .meta { text-align: right; font-size: .88rem; color: #666; line-height: 1.6; }
    .monto-box { background: #f0faf2; border: 2px solid #1b4332; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; }
    .monto-label { font-size: .82rem; color: #666; text-transform: uppercase; letter-spacing: .05em; }
    .monto-valor { font-size: 2rem; font-weight: 700; color: #1b4332; margin-top: .2rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    th { background: #1b4332; color: white; padding: .65rem 1rem; text-align: left; font-size: .85rem; font-weight: 600; }
    td { padding: .65rem 1rem; border-bottom: 1px solid #e8f5e9; font-size: .95rem; }
    tr:nth-child(even) td { background: #f8fdf9; }
    td:first-child { font-weight: 700; }
    .footer { font-size: .78rem; color: #aaa; border-top: 1px solid #e0e0e0; padding-top: .85rem; margin-top: .5rem; }
    @media print {
      body { padding: .8rem; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">EM Financiera</div>
    <div class="meta">
      Presupuesto para: <strong>${esc(nombre)}</strong><br>
      Fecha: ${esc(fecha)}
    </div>
  </div>
  <div class="monto-box">
    <div class="monto-label">Monto solicitado</div>
    <div class="monto-valor">$ ${fmt(monto)}</div>
  </div>
  <table>
    <thead>
      <tr><th>${isSemanal ? 'Semanas' : 'Cuotas'}</th><th>${isSemanal ? 'Tasa semanal' : 'Tasa mensual'}</th><th>${colCuota}</th><th>Total a pagar</th></tr>
    </thead>
    <tbody>
      ${filas.map(f => `
        <tr>
          <td>${f.n} ${isSemanal ? (f.n === 1 ? 'semana' : 'semanas') : (f.n === 1 ? 'cuota' : 'cuotas')}</td>
          <td>${tasaMensual}%</td>
          <td>$ ${fmt(f.precioCuota)}</td>
          <td>$ ${fmt(f.totalFinanciado)}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">
    Presupuesto válido por 7 días &nbsp;·&nbsp; ${isSemanal ? 'Tasa semanal' : 'Tasa mensual'}: ${tasaMensual}% &nbsp;·&nbsp; Valores en pesos argentinos (ARS).
  </div>
  <script>window.print();<\/script>
</body>
</html>`;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
}
