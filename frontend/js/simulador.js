async function renderSimulador() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';

  const tasas = await api.get('/tasas?moneda=ARS').catch(() => []);

  app.innerHTML = `
    <h2>Tasas & Simulador</h2>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:1.5rem;align-items:start">

      <!-- Maestro de tasas -->
      <div>
        <h3 style="margin-bottom:.75rem">Maestro de intereses ARS</h3>
        <table>
          <thead>
            <tr><th>Cuotas</th><th>Tasa mensual</th><th>Tasa total</th><th></th></tr>
          </thead>
          <tbody>
            ${tasas.map(t => `
              <tr>
                <td><strong>${t.total_cuotas}</strong></td>
                <td>${parseFloat(t.tasa_mensual)}%</td>
                <td>${parseFloat(t.tasa_total_pct)}%</td>
                <td>
                  <button class="btn-secondary" style="margin:0;padding:.2rem .6rem;font-size:.8rem"
                    onclick="editarTasa(${t.total_cuotas}, ${t.tasa_mensual})">✎</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Simulador -->
      <div>
        <h3 style="margin-bottom:.75rem">Simulador de préstamo</h3>
        <div style="background:white;padding:1.2rem;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:1rem;display:flex;gap:1rem">
          <div class="form-group" style="margin-bottom:0;flex:1">
            <label>Nombre del cliente (opcional)</label>
            <input type="text" id="nombreSim" placeholder="Ej: Juan Pérez" />
          </div>
          <div class="form-group" style="margin-bottom:0;flex:1">
            <label>Monto a prestar</label>
            <input type="text" id="montoSim" placeholder="Ej: $ 1.100.000"
              style="font-size:1.1rem;font-weight:600" />
          </div>
        </div>

        <div id="tablaSim"></div>
      </div>

    </div>
  `;

  const inputMonto = document.getElementById('montoSim');
  inputMonto.addEventListener('input', e => {
    const raw = e.target.value.replace(/\D/g, '');
    e.target.value = raw ? '$ ' + Number(raw).toLocaleString('es-AR') : '';
    simular(tasas, parseInt(raw) || 0);
  });
}

async function editarTasa(cuotas, tasaActual) {
  const nueva = prompt(`Nueva tasa mensual para ${cuotas} cuota${cuotas > 1 ? 's' : ''} (actual: ${tasaActual}%):`, tasaActual);
  if (nueva === null) return;
  const valor = parseFloat(nueva);
  if (isNaN(valor) || valor <= 0) { alert('Ingresá un número válido mayor a 0.'); return; }
  if (!confirm(`¿Estás seguro que querés cambiar la tasa de ${cuotas} cuota${cuotas > 1 ? 's' : ''} de ${tasaActual}% a ${valor}%?`)) return;
  try {
    await api.put(`/tasas/${cuotas}?moneda=ARS`, { tasa_mensual: valor });
    renderSimulador();
  } catch (err) {
    alert('Error al actualizar: ' + err.message);
  }
}

function simular(tasas, monto) {
  const contenedor = document.getElementById('tablaSim');
  if (!monto || monto <= 0) { contenedor.innerHTML = ''; return; }

  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });

  const filas = tasas.map(t => {
    const totalIntereses = monto * (t.tasa_total_pct / 100);
    const totalFinanciado = monto + totalIntereses;
    const precioCuota = totalFinanciado / t.total_cuotas;
    return { cuotas: t.total_cuotas, totalFinanciado, precioCuota };
  });

  contenedor.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Cuotas</th>
          <th>Total financiado</th>
          <th>Precio por cuota</th>
        </tr>
      </thead>
      <tbody>
        ${filas.map(f => `
          <tr>
            <td><strong>${f.cuotas}x</strong></td>
            <td>$ ${fmt(f.totalFinanciado)}</td>
            <td>$ ${fmt(f.precioCuota)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:1rem">
      <button class="btn-primary" onclick="generarPresupuesto(${monto})">Generar presupuesto</button>
    </div>
  `;
}

function generarPresupuesto(monto) {
  const nombre = document.getElementById('nombreSim').value.trim() || 'Cliente';
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Reconstruir filas desde la tabla actual
  const filas = [];
  document.querySelectorAll('#tablaSim tbody tr').forEach(tr => {
    const celdas = tr.querySelectorAll('td');
    if (celdas.length >= 3) {
      filas.push({
        cuotas: celdas[0].textContent.replace('x','').trim(),
        total: celdas[1].textContent.trim(),
        cuota: celdas[2].textContent.trim(),
      });
    }
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
    h2 { font-size: 1.1rem; margin-bottom: 1rem; color: #555; font-weight: normal; }
    .monto-box { background: #f0f9f4; border: 2px solid #27ae60; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    .monto-box .label { font-size: .9rem; color: #555; }
    .monto-box .valor { font-size: 1.8rem; font-weight: 700; color: #27ae60; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    th { background: #2c3e50; color: white; padding: .6rem 1rem; text-align: left; font-size: .9rem; }
    td { padding: .6rem 1rem; border-bottom: 1px solid #ecf0f1; font-size: .95rem; }
    tr:nth-child(even) td { background: #f8f9fa; }
    .footer { font-size: .8rem; color: #999; border-top: 1px solid #ecf0f1; padding-top: 1rem; margin-top: 1rem; }
    @media print { button { display: none; } body { padding: 1rem; } }
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

  <h2>Opciones de financiamiento disponibles</h2>

  <div class="monto-box">
    <div class="label">Monto solicitado</div>
    <div class="valor">$ ${fmt(monto)}</div>
  </div>

  <table>
    <thead>
      <tr><th>Cuotas</th><th>Total a pagar</th><th>Valor por cuota</th></tr>
    </thead>
    <tbody>
      ${filas.map(f => `<tr><td><strong>${f.cuotas} cuota${f.cuotas > 1 ? 's' : ''}</strong></td><td>${f.total}</td><td>${f.cuota}</td></tr>`).join('')}
    </tbody>
  </table>

  <div class="footer">
    Este presupuesto es válido por 7 días a partir de la fecha de emisión. Tasa de interés mensual: 7.5% sobre saldo. Los valores son en pesos argentinos.
  </div>

  <script>window.print();<\/script>
</body>
</html>`;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
}
