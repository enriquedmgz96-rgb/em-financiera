async function renderSimulador() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';

  const [tasas, categorias] = await Promise.all([
    api.get('/tasas?moneda=ARS').catch(() => []),
    api.get('/categorias').catch(() => [])
  ]);

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
      <div class="form-group" style="margin-bottom:0">
        <label>Tasa de interés mensual</label>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem" id="btnsCategorias">
          ${categorias.map((c, i) => `
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
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center">
        ${categorias.map(c => `
          <div style="display:flex;align-items:center;gap:.3rem;background:#f8f9fa;padding:.3rem .6rem;border-radius:8px">
            <span style="background:${colorBadge(c.color)};color:white;padding:.2rem .6rem;border-radius:10px;font-size:.8rem">${c.nombre}</span>
            <span style="font-size:.85rem;font-weight:600">${parseFloat(c.tasa_mensual)}%</span>
            <button class="btn-secondary" style="margin:0;padding:.15rem .4rem;font-size:.75rem" onclick="editarCategoria(${c.id}, '${c.nombre}', ${c.tasa_mensual}, '${c.color}')">✎</button>
            <button class="btn-secondary" style="margin:0;padding:.15rem .4rem;font-size:.75rem;color:var(--rojo)" onclick="eliminarCategoria(${c.id})">✕</button>
          </div>`).join('')}
        <button class="btn-secondary" style="font-size:.85rem" onclick="nuevaCategoria()">+ Nueva</button>
      </div>
    </div>
  `;

  // Tasa seleccionada por defecto: primera categoría
  let tasaSeleccionada = categorias.length > 0 ? parseFloat(categorias[0].tasa_mensual) : 7.5;
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
    if (raw) simular(parseInt(raw), tasaSeleccionada, sistema);
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
    if (raw) simular(parseInt(raw), tasaSeleccionada, window._sistemaSimulador);
  };

  document.getElementById('montoSim').addEventListener('input', e => {
    const raw = e.target.value.replace(/\D/g, '');
    e.target.value = raw ? '$ ' + Number(raw).toLocaleString('es-AR') : '';
    simular(parseInt(raw) || 0, tasaSeleccionada, window._sistemaSimulador);
  });
}

function calcPMT(capital, tasa, n) {
  const r = tasa / 100;
  if (r === 0) return capital / n;
  return capital * r / (1 - Math.pow(1 + r, -n));
}

function simular(monto, tasaMensual, sistema = 'flat') {
  const contenedor = document.getElementById('tablaSim');
  if (!monto || monto <= 0) { contenedor.innerHTML = ''; return; }

  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const cuotas = [1,2,3,4,5,6,7,8,9,10,11,12,18];

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
  const colHeader = { flat: 'Cuota mensual (fija)', frances: 'Cuota mensual (fija)', aleman: '1ª cuota (decrece)' };

  contenedor.innerHTML = `
    <table>
      <thead>
        <tr><th>Cuotas</th><th>Tasa mensual</th><th>${colHeader[sistema] || 'Cuota'}</th><th>Total a pagar</th></tr>
      </thead>
      <tbody>
        ${filas.map(f => `
          <tr>
            <td><strong>${f.n}x</strong></td>
            <td>${parseFloat(tasaMensual)}%</td>
            <td>$ ${fmt(f.precioCuota)}</td>
            <td>$ ${fmt(f.totalFinanciado)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:1rem">
      <button class="btn-primary" onclick="generarPresupuesto(${monto}, ${tasaMensual}, '${sistema}')">Generar presupuesto</button>
    </div>
  `;
}

async function nuevaCategoria() {
  const nombre = prompt('Nombre de la categoría (ej: Riesgo alto):');
  if (!nombre) return;
  const tasa = prompt('Tasa mensual (ej: 12):');
  if (!tasa || isNaN(tasa)) { alert('Tasa inválida'); return; }
  const color = prompt('Color (verde / amarillo / rojo / azul):', 'azul');
  try {
    await api.post('/categorias', { nombre, tasa_mensual: parseFloat(tasa), color: color || 'azul' });
    renderSimulador();
  } catch (err) { if (err._auth) return; alert('Error: ' + err.message); }
}

async function editarCategoria(id, nombreActual, tasaActual, colorActual) {
  const nombre = prompt('Nombre:', nombreActual);
  if (nombre === null) return;
  const tasa = prompt('Tasa mensual:', tasaActual);
  if (tasa === null) return;
  if (!confirm(`¿Guardar cambios en la categoría "${nombre}" con tasa ${tasa}%?`)) return;
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

function generarPresupuesto(monto, tasaMensual, sistema = 'flat') {
  const nombre = document.getElementById('nombreSim').value.trim() || 'Cliente';
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const cuotas = [1,2,3,4,5,6,7,8,9,10,11,12,18];
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

  const colCuota = sistema === 'aleman' ? '1ª cuota' : 'Cuota mensual';
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Presupuesto — ${nombre}</title>
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
      Presupuesto para: <strong>${nombre}</strong><br>
      Fecha: ${fecha}
    </div>
  </div>
  <div class="monto-box">
    <div class="monto-label">Monto solicitado</div>
    <div class="monto-valor">$ ${fmt(monto)}</div>
  </div>
  <table>
    <thead>
      <tr><th>Cuotas</th><th>Tasa mensual</th><th>${colCuota}</th><th>Total a pagar</th></tr>
    </thead>
    <tbody>
      ${filas.map(f => `
        <tr>
          <td>${f.n} cuota${f.n > 1 ? 's' : ''}</td>
          <td>${tasaMensual}%</td>
          <td>$ ${fmt(f.precioCuota)}</td>
          <td>$ ${fmt(f.totalFinanciado)}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">
    Presupuesto válido por 7 días &nbsp;·&nbsp; Tasa mensual: ${tasaMensual}% &nbsp;·&nbsp; Valores en pesos argentinos (ARS).
  </div>
  <script>window.print();<\/script>
</body>
</html>`;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
}
