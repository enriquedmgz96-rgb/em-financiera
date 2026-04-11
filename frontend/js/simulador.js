async function renderSimulador() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';

  const tasas = await api.get('/tasas?moneda=ARS').catch(() => []);
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const fmt2 = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });

  app.innerHTML = `
    <h2>Tasas & Simulador</h2>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:1.5rem;align-items:start">

      <!-- Maestro de tasas -->
      <div>
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
        <div style="background:white;padding:1.2rem;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:1rem">
          <div class="form-group" style="margin-bottom:0">
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
  `;
}
