async function renderDashboard() {
  const app = document.getElementById('app');
  app.innerHTML = '<h2>Dashboard</h2><p>Cargando...</p>';
  try {
    const d = await api.get('/dashboard');
    const fmt = n => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

    app.innerHTML = `
      <h2>Dashboard</h2>
      <div class="cards">
        <div class="card"><div class="label">Capital prestado</div><div class="value">${fmt(d.capital_total_prestado)}</div></div>
        <div class="card"><div class="label">Capital cobrado</div><div class="value">${fmt(d.capital_cobrado)}</div></div>
        <div class="card"><div class="label">Capital pendiente</div><div class="value">${fmt(d.capital_pendiente)}</div></div>
        <div class="card"><div class="label">Intereses cobrados</div><div class="value">${fmt(d.intereses_cobrados)}</div></div>
        <div class="card"><div class="label">Préstamos activos</div><div class="value">${d.prestamos_activos}</div></div>
        <div class="card" style="border-left:4px solid var(--rojo)">
          <div class="label">En mora</div>
          <div class="value" style="color:var(--rojo)">${d.prestamos_en_mora}</div>
        </div>
      </div>

      ${d.proximos_a_vencer.length > 0 ? `
        <h3>Próximos a vencer (7 días)</h3>
        <table style="margin-bottom:1.5rem">
          <thead><tr><th>Cliente</th><th>DNI</th><th>Teléfono</th><th>Vencimiento</th></tr></thead>
          <tbody>
            ${d.proximos_a_vencer.map(p => `
              <tr>
                <td>${p.apellido}, ${p.nombre}</td>
                <td>${p.dni}</td>
                <td>${p.telefono || '-'}</td>
                <td><span class="badge badge-amarillo">${p.proximo_vencimiento}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>` : ''}

      ${d.en_mora.length > 0 ? `
        <h3>En mora</h3>
        <table>
          <thead><tr><th>Cliente</th><th>DNI</th><th>Teléfono</th><th>Vencimiento</th></tr></thead>
          <tbody>
            ${d.en_mora.map(p => `
              <tr>
                <td>${p.apellido}, ${p.nombre}</td>
                <td>${p.dni}</td>
                <td>${p.telefono || '-'}</td>
                <td><span class="badge badge-rojo">${p.proximo_vencimiento}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>` : ''}
    `;
  } catch (err) {
    app.innerHTML = `<h2>Dashboard</h2><p class="msg-error">Error: ${err.message}</p>`;
  }
}
