async function renderDashboard() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  try {
    const d = await api.get('/dashboard');
    const fmt  = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
    const fmtK = n => {
      if (n >= 1_000_000) return '$' + (n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + 'M';
      if (n >= 1_000)     return '$' + (n / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 0 }) + 'K';
      return '$' + fmt(n);
    };

    const pctCobrado   = d.capital_total_prestado > 0 ? Math.round(d.capital_cobrado / d.capital_total_prestado * 100) : 0;
    const pctPendiente = d.capital_total_prestado > 0 ? Math.round(d.capital_pendiente / d.capital_total_prestado * 100) : 0;

    app.innerHTML = `
      <h2>Dashboard</h2>

      <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(185px,1fr));margin-bottom:1.5rem">

        <div class="card">
          <div class="label">Capital total prestado</div>
          <div class="value">${fmtK(d.capital_total_prestado)}</div>
          <div style="font-size:.7rem;color:var(--texto-dim);margin-top:.3rem;font-family:var(--ff-mono)">$${fmt(d.capital_total_prestado)}</div>
        </div>

        <div class="card" style="border-color:rgba(16,185,129,.3)">
          <div class="label">Capital cobrado</div>
          <div class="value" style="color:var(--verde)">${fmtK(d.capital_cobrado)}</div>
          <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pctCobrado}%"></div></div>
          <div style="font-size:.7rem;color:var(--texto-dim);margin-top:.3rem">${pctCobrado}% del total</div>
        </div>

        <div class="card" style="border-color:rgba(245,158,11,.3)">
          <div class="label">Capital pendiente</div>
          <div class="value" style="color:var(--amarillo)">${fmtK(d.capital_pendiente)}</div>
          <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pctPendiente}%;background:linear-gradient(90deg,var(--amarillo),#f97316)"></div></div>
          <div style="font-size:.7rem;color:var(--texto-dim);margin-top:.3rem">${pctPendiente}% del total</div>
        </div>

        <div class="card">
          <div class="label">Intereses cobrados</div>
          <div class="value" style="color:#06b6d4">${fmtK(d.intereses_cobrados)}</div>
          <div style="font-size:.7rem;color:var(--texto-dim);margin-top:.3rem;font-family:var(--ff-mono)">$${fmt(d.intereses_cobrados)}</div>
        </div>

        <div class="card">
          <div class="label">Préstamos activos</div>
          <div class="value">${d.prestamos_activos}</div>
          <div style="font-size:.7rem;color:var(--texto-dim);margin-top:.3rem">en cartera</div>
        </div>

        <div class="card" style="border-color:${d.prestamos_en_mora > 0 ? 'rgba(239,68,68,.4)' : 'var(--border)'}">
          <div class="label">En mora</div>
          <div class="value" style="color:${d.prestamos_en_mora > 0 ? 'var(--rojo)' : 'var(--verde)'}">${d.prestamos_en_mora}</div>
          <div style="font-size:.7rem;color:var(--texto-dim);margin-top:.3rem">${d.prestamos_en_mora === 0 ? 'todo al día ✓' : 'requieren atención'}</div>
        </div>

      </div>

      ${d.proximos_a_vencer.length > 0 ? `
        <h3 style="margin-bottom:.75rem">⏰ Próximos a vencer <span style="font-size:.75rem;color:var(--texto-dim);font-weight:400;font-family:var(--ff-body)">— próximos 7 días</span></h3>
        <table style="margin-bottom:1.75rem">
          <thead><tr><th>Cliente</th><th>DNI</th><th>Teléfono</th><th>Vencimiento</th></tr></thead>
          <tbody>
            ${d.proximos_a_vencer.map(p => `
              <tr>
                <td style="font-weight:600">${p.apellido}, ${p.nombre}</td>
                <td style="font-family:var(--ff-mono);font-size:.82rem">${p.dni}</td>
                <td>${p.telefono || '-'}</td>
                <td><span class="badge badge-amarillo">${p.proximo_vencimiento}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>` : ''}

      ${d.en_mora.length > 0 ? `
        <h3 style="margin-bottom:.75rem">🔴 En mora</h3>
        <table>
          <thead><tr><th>Cliente</th><th>DNI</th><th>Teléfono</th><th>Vencimiento</th></tr></thead>
          <tbody>
            ${d.en_mora.map(p => `
              <tr>
                <td style="font-weight:600;color:var(--rojo)">${p.apellido}, ${p.nombre}</td>
                <td style="font-family:var(--ff-mono);font-size:.82rem">${p.dni}</td>
                <td>${p.telefono || '-'}</td>
                <td><span class="badge badge-rojo">${p.proximo_vencimiento}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>` : ''}

      ${d.proximos_a_vencer.length === 0 && d.en_mora.length === 0 ? `
        <div style="margin-top:1rem;padding:1rem 1.25rem;background:var(--bg-card);border:1px solid rgba(16,185,129,.25);border-radius:10px;color:var(--verde);font-size:.9rem">
          ✓ Todos los préstamos están al día
        </div>` : ''}
    `;
  } catch (err) {
    app.innerHTML = `<h2>Dashboard</h2><p class="msg-error">Error: ${err.message}</p>`;
  }
}
