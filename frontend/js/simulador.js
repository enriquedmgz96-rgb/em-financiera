// Dos simuladores dedicados (sin modo mezclado):
//   • renderSimuladorPrestamos  → vive en el grupo Préstamos. Tasa desde el
//     catálogo de categorías (lo que le cobrás al cliente) + campo editable.
//   • renderSimuladorCaptaciones → vive en Plata de terceros. Tasa con atajos
//     típicos (3/4/5% mensual) + campo editable: lo que le pagás al inversor.
// Ambos comparten la misma forma. El motor de cálculo (simular / generar
// Presupuesto / calcPMT) es común y distingue el modo por window._simModo.

async function renderSimuladorBase(modo) {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';

  const esCapt = modo === 'captacion';
  window._simModo = modo;
  window._sistemaSimulador = 'flat';

  // Préstamos usa el catálogo guardado de categorías; captaciones usa atajos
  // fijos (los % típicos que se le pagan al inversor) + el campo editable.
  let categoriasMensual = [], categoriasSemanal = [];
  if (!esCapt) {
    [categoriasMensual, categoriasSemanal] = await Promise.all([
      api.get('/categorias?periodicidad=mensual').catch(() => []),
      api.get('/categorias?periodicidad=semanal').catch(() => []),
    ]);
  }

  const colorBadge = c => ({ verde: '#27ae60', amarillo: '#f39c12', rojo: '#e74c3c', azul: '#2980b9' }[c] || '#2980b9');
  const chipsCapt = { mensual: [3, 4, 5], semanal: [1, 1.5, 2] };
  const accent = esCapt ? '#2980b9' : '#1b4332';

  // Estado de la simulación (cierre de este render; sólo hay un simulador activo)
  let _periodo = 'mensual';
  let tasaSel = esCapt ? 3 : (categoriasMensual.length ? parseFloat(categoriasMensual[0].tasa_mensual) : 7.5);

  // Atajos de tasa (chips) según el periodo
  const chipsHtml = (periodo) => {
    const unidad = periodo === 'semanal' ? 'semanal' : 'mensual';
    if (esCapt) {
      return chipsCapt[periodo].map((t, i) => `
        <button type="button" onclick="simSelTasa(${t}, this)"
          style="border:2px solid #2980b9;background:${i === 0 ? '#2980b9' : 'white'};color:${i === 0 ? 'white' : '#2980b9'};padding:.4rem 1rem;border-radius:20px;cursor:pointer;font-weight:600;font-family:inherit">
          ${t}% ${unidad}</button>`).join('');
    }
    const cats = periodo === 'semanal' ? categoriasSemanal : categoriasMensual;
    return cats.map((c, i) => `
      <button type="button" onclick="simSelTasa(${parseFloat(c.tasa_mensual)}, this)"
        style="border:2px solid ${colorBadge(c.color)};background:${i === 0 ? colorBadge(c.color) : 'white'};color:${i === 0 ? 'white' : colorBadge(c.color)};padding:.4rem 1rem;border-radius:20px;cursor:pointer;font-weight:600;font-family:inherit">
        ${parseFloat(c.tasa_mensual)}% ${unidad}</button>`).join('')
      || '<span style="color:#888;font-size:.85rem">Sin categorías configuradas — usá el campo de tasa</span>';
  };

  // Administrar categorías de tasa: sólo en el simulador de préstamos
  const adminCatsHtml = esCapt ? '' : `
    <div style="margin-top:2rem;border-top:1px solid #eee;padding-top:1rem">
      <h4 style="margin-bottom:.75rem;color:#666;font-size:.9rem">Administrar categorías de tasa</h4>
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
    </div>`;

  app.innerHTML = `
    <h2 style="margin-bottom:.2rem">Tasas &amp; Simulador <span style="color:${accent}">· ${esCapt ? 'Captaciones' : 'Préstamos'}</span></h2>
    <p style="margin:.1rem 0 1rem;color:#666;font-size:.9rem">
      ${esCapt
        ? 'Simulá cuánto le devolvés a un inversor según el plazo y la tasa que le pagás.'
        : 'Simulá la cuota y el total que le cobrás a un cliente según el plazo, la tasa y el sistema.'}
    </p>

    <div style="background:white;padding:1.2rem;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:1.5rem">
      <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem">
        <div class="form-group" style="margin-bottom:0;flex:1;min-width:180px">
          <label>${esCapt ? 'Nombre del inversor (opcional)' : 'Nombre del cliente (opcional)'}</label>
          <input type="text" id="nombreSim" placeholder="${esCapt ? 'Ej: María Gómez' : 'Ej: Juan Pérez'}" />
        </div>
        <div class="form-group" style="margin-bottom:0;flex:1;min-width:180px">
          <label>${esCapt ? 'Capital que aporta el inversor' : 'Monto a prestar'}</label>
          <input type="text" id="montoSim" placeholder="Ej: $ 1.100.000" style="font-size:1.1rem;font-weight:600" />
        </div>
      </div>

      <div style="display:flex;gap:.5rem;margin-bottom:.75rem">
        <button id="simBtnMensual" type="button" onclick="simCambiarPeriodo('mensual')"
          style="flex:1;padding:.45rem;border:2px solid ${accent};background:${accent};color:white;border-radius:7px;font-weight:700;cursor:pointer;font-family:inherit">Mensual</button>
        <button id="simBtnSemanal" type="button" onclick="simCambiarPeriodo('semanal')"
          style="flex:1;padding:.45rem;border:2px solid ${accent};background:white;color:${accent};border-radius:7px;font-weight:700;cursor:pointer;font-family:inherit">Semanal</button>
      </div>

      <div class="form-group" style="margin-bottom:0">
        <label id="simLblTasa">${esCapt ? 'Tasa que le pagás al inversor (mensual)' : 'Tasa de interés mensual'}</label>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;align-items:center" id="btnsCategorias">
          ${chipsHtml('mensual')}
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;margin-top:.7rem">
          <span style="font-size:.85rem;color:#555;font-weight:600">Otra tasa:</span>
          <input type="number" id="tasaCustom" value="${tasaSel}" step="0.1" min="0.1"
            style="width:90px;padding:.4rem .6rem;border:2px solid ${accent};border-radius:7px;font-weight:700;font-family:inherit;text-align:right" />
          <span id="simUnidadTasa" style="font-size:.9rem;color:#555;font-weight:600">% mensual</span>
        </div>
      </div>
    </div>

    <div style="margin:.75rem 0;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
      <span style="font-size:.85rem;color:#555;font-weight:600">Sistema:</span>
      <button id="btnFlat" type="button" onclick="seleccionarSistema('flat',this)" style="border:2px solid #27ae60;background:#27ae60;color:white;padding:.3rem .9rem;border-radius:20px;cursor:pointer;font-size:.85rem;font-weight:600">Clásico (interés plano)</button>
      <button id="btnFrances" type="button" onclick="seleccionarSistema('frances',this)" style="border:2px solid #2980b9;background:white;color:#2980b9;padding:.3rem .9rem;border-radius:20px;cursor:pointer;font-size:.85rem;font-weight:600">Francés (PMT)</button>
      <button id="btnAleman" type="button" onclick="seleccionarSistema('aleman',this)" style="border:2px solid #e67e22;background:white;color:#e67e22;padding:.3rem .9rem;border-radius:20px;cursor:pointer;font-size:.85rem;font-weight:600">Decreciente</button>
    </div>

    <div id="tablaSim"></div>

    ${adminCatsHtml}
  `;

  // ── Handlers (se reasignan en cada render; sólo hay un simulador activo) ──
  const reSimular = () => {
    const raw = (document.getElementById('montoSim').value || '').replace(/\D/g, '');
    simular(parseInt(raw) || 0, tasaSel, window._sistemaSimulador, _periodo === 'semanal');
  };

  // Atajo de tasa (chip) → setea la tasa y refleja en el campo editable
  window.simSelTasa = (tasa, btn) => {
    document.querySelectorAll('#btnsCategorias button').forEach(b => {
      b.style.background = 'white';
      b.style.color = b.style.borderColor;
    });
    if (btn) { btn.style.background = btn.style.borderColor; btn.style.color = 'white'; }
    tasaSel = tasa;
    const inp = document.getElementById('tasaCustom');
    if (inp) inp.value = tasa;
    reSimular();
  };

  window.seleccionarSistema = (sistema, btn) => {
    window._sistemaSimulador = sistema;
    ['btnFlat', 'btnFrances', 'btnAleman'].forEach(id => {
      const b = document.getElementById(id);
      if (!b) return;
      b.style.background = 'white';
      b.style.color = b.style.borderColor;
    });
    btn.style.background = btn.style.borderColor;
    btn.style.color = 'white';
    reSimular();
  };

  window.simCambiarPeriodo = (p) => {
    _periodo = p;
    const isSem = p === 'semanal';
    const bM = document.getElementById('simBtnMensual');
    const bS = document.getElementById('simBtnSemanal');
    if (bM) { bM.style.background = isSem ? 'white' : accent; bM.style.color = isSem ? accent : 'white'; }
    if (bS) { bS.style.background = isSem ? accent : 'white'; bS.style.color = isSem ? 'white' : accent; }

    const lbl = document.getElementById('simLblTasa');
    if (lbl) lbl.textContent = esCapt
      ? `Tasa que le pagás al inversor (${isSem ? 'semanal' : 'mensual'})`
      : (isSem ? 'Tasa de interés semanal' : 'Tasa de interés mensual');
    const uni = document.getElementById('simUnidadTasa');
    if (uni) uni.textContent = isSem ? '% semanal' : '% mensual';

    document.getElementById('btnsCategorias').innerHTML = chipsHtml(p);
    if (esCapt) {
      tasaSel = chipsCapt[p][0];
    } else {
      const cats = isSem ? categoriasSemanal : categoriasMensual;
      tasaSel = cats.length ? parseFloat(cats[0].tasa_mensual) : (isSem ? 3 : 7.5);
    }
    const inp = document.getElementById('tasaCustom');
    if (inp) inp.value = tasaSel;
    reSimular();
  };

  // Campo de tasa editable → "que solo pueda modificar"
  document.getElementById('tasaCustom').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0) {
      tasaSel = v;
      document.querySelectorAll('#btnsCategorias button').forEach(b => {
        b.style.background = 'white';
        b.style.color = b.style.borderColor;
      });
      reSimular();
    }
  });

  document.getElementById('montoSim').addEventListener('input', e => {
    const raw = e.target.value.replace(/\D/g, '');
    e.target.value = raw ? '$ ' + Number(raw).toLocaleString('es-AR') : '';
    simular(parseInt(raw) || 0, tasaSel, window._sistemaSimulador, _periodo === 'semanal');
  });
}

function renderSimuladorPrestamos() { return renderSimuladorBase('prestamo'); }
function renderSimuladorCaptaciones() { return renderSimuladorBase('captacion'); }

function calcPMT(capital, tasa, n) {
  const r = tasa / 100;
  if (r === 0) return capital / n;
  return capital * r / (1 - Math.pow(1 + r, -n));
}

function simular(monto, tasaMensual, sistema = 'flat', isSemanal = false) {
  const contenedor = document.getElementById('tablaSim');
  if (!monto || monto <= 0) { contenedor.innerHTML = ''; return; }

  const esCapt = (window._simModo || 'prestamo') === 'captacion';
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const cuotas = isSemanal ? [1,2,3,4,5,6,7,8,9,10,11,12] : [1,2,3,4,5,6,7,8,9,10,11,12,18];

  const filas = cuotas.map(n => {
    let precioCuota, totalFinanciado;
    const r = tasaMensual / 100;

    if (sistema === 'flat') {
      // Interés fijo sobre capital original: (capital/n) + capital×tasa
      precioCuota = (monto / n) + monto * r;
      totalFinanciado = precioCuota * n;
    } else if (sistema === 'frances') {
      // PMT: cuota fija con interés sobre saldo
      precioCuota = calcPMT(monto, tasaMensual, n);
      totalFinanciado = precioCuota * n;
    } else {
      // Decreciente (alemán): capital constante, interés sobre saldo
      let totalReal = 0, saldo = monto;
      for (let i = 1; i <= n; i++) {
        totalReal += (monto / n) + saldo * r;
        saldo -= monto / n;
      }
      precioCuota = (monto / n) + monto * r; // primera cuota (la más alta)
      totalFinanciado = totalReal;
    }
    return { n, totalFinanciado, precioCuota, retorno: totalFinanciado - monto };
  });

  const colHeaderPrest = isSemanal
    ? { flat: 'Cuota semanal (fija)', frances: 'Cuota semanal (fija)', aleman: '1ª cuota (decrece)' }
    : { flat: 'Cuota mensual (fija)', frances: 'Cuota mensual (fija)', aleman: '1ª cuota (decrece)' };

  const thPlazo = esCapt ? (isSemanal ? 'Semanas' : 'Meses') : (isSemanal ? 'Semanas' : 'Cuotas');
  const thTasa = isSemanal ? 'Tasa semanal' : 'Tasa mensual';
  const thCuota = esCapt ? (isSemanal ? 'Devolución semanal' : 'Devolución mensual') : (colHeaderPrest[sistema] || 'Cuota');
  const thTotal = esCapt ? 'Total a devolver' : 'Total a pagar';
  const unidadFila = n => isSemanal ? (n === 1 ? 'semana' : 'semanas') : (esCapt ? (n === 1 ? 'mes' : 'meses') : (n === 1 ? 'cuota' : 'cuotas'));

  contenedor.innerHTML = `
    ${esCapt ? '<p style="margin:0 0 .6rem;color:#2980b9;font-size:.88rem;font-weight:600">Cuánto le devolvés al inversor según el plazo. El <strong>retorno</strong> es su ganancia (el interés que cobra).</p>' : ''}
    <table>
      <thead>
        <tr><th>${thPlazo}</th><th>${thTasa}</th><th>${thCuota}</th><th>${thTotal}</th>${esCapt ? '<th>Retorno (interés)</th>' : ''}</tr>
      </thead>
      <tbody>
        ${filas.map(f => `
          <tr>
            <td><strong>${f.n} ${unidadFila(f.n)}</strong></td>
            <td>${parseFloat(tasaMensual)}%</td>
            <td>$ ${fmt(f.precioCuota)}</td>
            <td>$ ${fmt(f.totalFinanciado)}</td>
            ${esCapt ? `<td style="color:#1b7a3d;font-weight:700">$ ${fmt(f.retorno)}</td>` : ''}
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:1rem">
      <button class="btn-primary" onclick="generarPresupuesto(${monto}, ${tasaMensual}, '${sistema}', ${isSemanal})">${esCapt ? 'Generar proyección para el inversor' : 'Generar presupuesto'}</button>
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
    renderSimuladorPrestamos();
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
    renderSimuladorPrestamos();
  } catch (err) { if (err._auth) return; alert('Error: ' + err.message); }
}

async function eliminarCategoria(id) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  try {
    await api.delete(`/categorias/${id}`);
    renderSimuladorPrestamos();
  } catch (err) { if (err._auth) return; alert('Error: ' + err.message); }
}

function generarPresupuesto(monto, tasaMensual, sistema = 'flat', isSemanal = false) {
  const esCapt = (window._simModo || 'prestamo') === 'captacion';
  const nombre = document.getElementById('nombreSim').value.trim() || (esCapt ? 'Inversor' : 'Cliente');
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
    return { n, totalFinanciado, precioCuota, retorno: totalFinanciado - monto };
  });

  const accent = esCapt ? '#2980b9' : '#1b4332';
  const accentBg = esCapt ? '#eef6fc' : '#f0faf2';
  const accentBorder = esCapt ? '#dbeefb' : '#e8f5e9';
  const accentRow = esCapt ? '#f5fafd' : '#f8fdf9';
  const colCuotaPrest = sistema === 'aleman' ? '1ª cuota' : (isSemanal ? 'Cuota semanal' : 'Cuota mensual');
  const thPlazo = esCapt ? (isSemanal ? 'Semanas' : 'Meses') : (isSemanal ? 'Semanas' : 'Cuotas');
  const thCuota = esCapt ? (isSemanal ? 'Devolución semanal' : 'Devolución mensual') : colCuotaPrest;
  const thTotal = esCapt ? 'Total a devolver' : 'Total a pagar';
  const tituloDoc = esCapt ? 'Proyección de retorno' : 'Presupuesto';
  const montoLabel = esCapt ? 'Capital aportado' : 'Monto solicitado';
  const destinatarioLabel = esCapt ? 'Proyección para' : 'Presupuesto para';
  const unidadFila = n => isSemanal ? (n === 1 ? 'semana' : 'semanas') : (esCapt ? (n === 1 ? 'mes' : 'meses') : (n === 1 ? 'cuota' : 'cuotas'));

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${tituloDoc} — ${esc(nombre)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #2c3e50; padding: 2rem; max-width: 680px; margin: 0 auto; }
    .header { border-bottom: 3px solid ${accent}; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 1.6rem; font-weight: 700; color: ${accent}; }
    .doc-tipo { font-size: .8rem; color: #888; text-transform: uppercase; letter-spacing: .08em; }
    .meta { text-align: right; font-size: .88rem; color: #666; line-height: 1.6; }
    .monto-box { background: ${accentBg}; border: 2px solid ${accent}; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; }
    .monto-label { font-size: .82rem; color: #666; text-transform: uppercase; letter-spacing: .05em; }
    .monto-valor { font-size: 2rem; font-weight: 700; color: ${accent}; margin-top: .2rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    th { background: ${accent}; color: white; padding: .65rem 1rem; text-align: left; font-size: .85rem; font-weight: 600; }
    td { padding: .65rem 1rem; border-bottom: 1px solid ${accentBorder}; font-size: .95rem; }
    tr:nth-child(even) td { background: ${accentRow}; }
    td:first-child { font-weight: 700; }
    td.retorno { color: #1b7a3d; font-weight: 700; }
    .footer { font-size: .78rem; color: #aaa; border-top: 1px solid #e0e0e0; padding-top: .85rem; margin-top: .5rem; }
    @media print {
      body { padding: .8rem; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">EM Financiera</div>
      <div class="doc-tipo">${tituloDoc}</div>
    </div>
    <div class="meta">
      ${destinatarioLabel}: <strong>${esc(nombre)}</strong><br>
      Fecha: ${esc(fecha)}
    </div>
  </div>
  <div class="monto-box">
    <div class="monto-label">${montoLabel}</div>
    <div class="monto-valor">$ ${fmt(monto)}</div>
  </div>
  <table>
    <thead>
      <tr><th>${thPlazo}</th><th>${isSemanal ? 'Tasa semanal' : 'Tasa mensual'}</th><th>${thCuota}</th><th>${thTotal}</th>${esCapt ? '<th>Retorno (interés)</th>' : ''}</tr>
    </thead>
    <tbody>
      ${filas.map(f => `
        <tr>
          <td>${f.n} ${unidadFila(f.n)}</td>
          <td>${tasaMensual}%</td>
          <td>$ ${fmt(f.precioCuota)}</td>
          <td>$ ${fmt(f.totalFinanciado)}</td>
          ${esCapt ? `<td class="retorno">$ ${fmt(f.retorno)}</td>` : ''}
        </tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">
    ${tituloDoc} ${esCapt ? 'estimativa' : 'válido'} por 7 días &nbsp;·&nbsp; ${isSemanal ? 'Tasa semanal' : 'Tasa mensual'}: ${tasaMensual}% &nbsp;·&nbsp; ${sistemaLabel} &nbsp;·&nbsp; Valores en pesos argentinos (ARS).${esCapt ? ' El retorno es el interés que gana el inversor.' : ''}
  </div>
  <script>window.print();<\/script>
</body>
</html>`;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
}
