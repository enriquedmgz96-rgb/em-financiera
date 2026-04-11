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

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:1.5rem;align-items:start">

      <!-- Izquierda: maestro de tasas + categorías -->
      <div>
        <h3 style="margin-bottom:.75rem">Categorías de riesgo</h3>
        <div id="listaCategorias" style="margin-bottom:1rem">
          ${categorias.map(c => `
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">
              <span style="background:${colorBadge(c.color)};color:white;padding:.25rem .7rem;border-radius:12px;font-size:.85rem;min-width:120px;text-align:center">${c.nombre}</span>
              <span style="font-weight:600">${parseFloat(c.tasa_mensual)}% m.</span>
              <button class="btn-secondary" style="margin:0;padding:.2rem .5rem;font-size:.8rem" onclick="editarCategoria(${c.id}, '${c.nombre}', ${c.tasa_mensual}, '${c.color}')">✎</button>
              <button class="btn-secondary" style="margin:0;padding:.2rem .5rem;font-size:.8rem;color:var(--rojo)" onclick="eliminarCategoria(${c.id})">✕</button>
            </div>`).join('')}
        </div>
        <button class="btn-secondary" style="margin-bottom:1.5rem;font-size:.85rem" onclick="nuevaCategoria()">+ Nueva categoría</button>

        <h3 style="margin-bottom:.75rem">Maestro de intereses ARS</h3>
        <table>
          <thead>
            <tr><th>Cuotas</th><th>Tasa mensual</th><th>Tasa total</th></tr>
          </thead>
          <tbody>
            ${tasas.map(t => `
              <tr>
                <td><strong>${t.total_cuotas}</strong></td>
                <td>${parseFloat(t.tasa_mensual)}%</td>
                <td>${parseFloat(t.tasa_total_pct)}%</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Derecha: simulador -->
      <div>
        <h3 style="margin-bottom:.75rem">Simulador de préstamo</h3>
        <div style="background:white;padding:1.2rem;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:1rem">
          <div style="display:flex;gap:1rem;flex-wrap:wrap">
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:180px">
              <label>Nombre del cliente (opcional)</label>
              <input type="text" id="nombreSim" placeholder="Ej: Juan Pérez" />
            </div>
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:180px">
              <label>Monto a prestar</label>
              <input type="text" id="montoSim" placeholder="Ej: $ 1.100.000" style="font-size:1.1rem;font-weight:600" />
            </div>
          </div>
          <div class="form-group" style="margin-top:1rem;margin-bottom:0">
            <label>Categoría de riesgo</label>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.3rem" id="btnsCategorias">
              ${categorias.map((c, i) => `
                <button onclick="seleccionarCategoria(${c.tasa_mensual}, this)"
                  style="border:2px solid ${colorBadge(c.color)};background:${i===0?colorBadge(c.color):'white'};color:${i===0?'white':colorBadge(c.color)};padding:.4rem 1rem;border-radius:20px;cursor:pointer;font-weight:600;transition:.2s">
                  ${c.nombre} — ${parseFloat(c.tasa_mensual)}%
                </button>`).join('')}
            </div>
          </div>
        </div>

        <div id="tablaSim"></div>
      </div>

    </div>
  `;

  // Tasa seleccionada por defecto: primera categoría
  let tasaSeleccionada = categorias.length > 0 ? parseFloat(categorias[0].tasa_mensual) : 7.5;

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
    if (raw) simular(parseInt(raw), tasaSeleccionada);
  };

  document.getElementById('montoSim').addEventListener('input', e => {
    const raw = e.target.value.replace(/\D/g, '');
    e.target.value = raw ? '$ ' + Number(raw).toLocaleString('es-AR') : '';
    simular(parseInt(raw) || 0, tasaSeleccionada);
  });
}

function simular(monto, tasaMensual) {
  const contenedor = document.getElementById('tablaSim');
  if (!monto || monto <= 0) { contenedor.innerHTML = ''; return; }

  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const cuotas = [1,2,3,4,5,6,7,8,9,10,11,12,18];

  const filas = cuotas.map(n => {
    const tasaTotal = tasaMensual * n;
    const totalFinanciado = monto * (1 + tasaTotal / 100);
    const precioCuota = totalFinanciado / n;
    return { n, tasaTotal, totalFinanciado, precioCuota };
  });

  contenedor.innerHTML = `
    <table>
      <thead>
        <tr><th>Cuotas</th><th>Tasa total</th><th>Total financiado</th><th>Precio por cuota</th></tr>
      </thead>
      <tbody>
        ${filas.map(f => `
          <tr>
            <td><strong>${f.n}x</strong></td>
            <td>${parseFloat(f.tasaTotal.toFixed(2))}%</td>
            <td>$ ${fmt(f.totalFinanciado)}</td>
            <td>$ ${fmt(f.precioCuota)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:1rem">
      <button class="btn-primary" onclick="generarPresupuesto(${monto}, ${tasaMensual})">Generar presupuesto</button>
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
  } catch (err) { alert('Error: ' + err.message); }
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
  } catch (err) { alert('Error: ' + err.message); }
}

async function eliminarCategoria(id) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  try {
    await api.delete(`/categorias/${id}`);
    renderSimulador();
  } catch (err) { alert('Error: ' + err.message); }
}

function generarPresupuesto(monto, tasaMensual) {
  const nombre = document.getElementById('nombreSim').value.trim() || 'Cliente';
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const cuotas = [1,2,3,4,5,6,7,8,9,10,11,12,18];

  const filas = cuotas.map(n => {
    const tasaTotal = tasaMensual * n;
    const totalFinanciado = monto * (1 + tasaTotal / 100);
    const precioCuota = totalFinanciado / n;
    return { n, tasaTotal, totalFinanciado, precioCuota };
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Presupuesto — ${nombre}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #2c3e50; padding: 2rem; max-width: 700px; margin: 0 auto; }
    .header { border-bottom: 3px solid #2980b9; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 1.6rem; font-weight: 700; color: #2980b9; }
    .meta { text-align: right; font-size: .9rem; color: #555; }
    .monto-box { background: #f0f9f4; border: 2px solid #27ae60; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    .monto-box .label { font-size: .9rem; color: #555; }
    .monto-box .valor { font-size: 1.8rem; font-weight: 700; color: #27ae60; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    th { background: #2c3e50; color: white; padding: .6rem 1rem; text-align: left; font-size: .9rem; }
    td { padding: .6rem 1rem; border-bottom: 1px solid #ecf0f1; font-size: .95rem; }
    tr:nth-child(even) td { background: #f8f9fa; }
    .footer { font-size: .8rem; color: #999; border-top: 1px solid #ecf0f1; padding-top: 1rem; }
    @media print { body { padding: 1rem; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">EM Financiera</div>
    <div class="meta">
      <div>Presupuesto para: <strong>${nombre}</strong></div>
      <div>Fecha: ${fecha}</div>
    </div>
  </div>
  <div class="monto-box">
    <div class="label">Monto solicitado</div>
    <div class="valor">$ ${fmt(monto)}</div>
  </div>
  <table>
    <thead>
      <tr><th>Cuotas</th><th>Tasa total</th><th>Total a pagar</th><th>Valor por cuota</th></tr>
    </thead>
    <tbody>
      ${filas.map(f => `
        <tr>
          <td><strong>${f.n} cuota${f.n > 1 ? 's' : ''}</strong></td>
          <td>${parseFloat(f.tasaTotal.toFixed(2))}%</td>
          <td>$ ${fmt(f.totalFinanciado)}</td>
          <td>$ ${fmt(f.precioCuota)}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">
    Presupuesto válido por 7 días. Tasa mensual aplicada: ${tasaMensual}%. Valores en pesos argentinos (ARS).
  </div>
  <script>window.print();<\/script>
</body>
</html>`;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
}
