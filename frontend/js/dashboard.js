async function renderDashboard() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  try {
    const d = await api.get('/dashboard');
    const fmt  = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
    const fmtM = n => {
      if (n >= 1_000_000) return '$\u202f' + (n / 1_000_000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '\u202fM';
      if (n >= 1_000)     return '$\u202f' + (n / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 0 }) + '\u202fK';
      return '$\u202f' + fmt(n);
    };

    const pctCobrado   = d.capital_total_prestado > 0 ? (d.capital_cobrado / d.capital_total_prestado * 100).toFixed(1) : 0;
    const pctPendiente = d.capital_total_prestado > 0 ? (d.capital_pendiente / d.capital_total_prestado * 100).toFixed(1) : 0;

    app.innerHTML = `
      <h2>Panel de control</h2>

      <div class="cards">
        <div class="card">
          <div class="label">Capital en cartera</div>
          <div class="value">${fmtM(d.capital_total_prestado)}</div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem;font-family:var(--ff-mono)">$\u202f${fmt(d.capital_total_prestado)}</div>
        </div>

        <div class="card">
          <div class="label">Capital recuperado</div>
          <div class="value" style="color:var(--verde)">${fmtM(d.capital_cobrado)}</div>
          <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pctCobrado}%"></div></div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.35rem">${pctCobrado}% del total</div>
        </div>

        <div class="card">
          <div class="label">Capital pendiente</div>
          <div class="value" style="color:var(--gold)">${fmtM(d.capital_pendiente)}</div>
          <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pctPendiente}%;background:var(--gold)"></div></div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.35rem">${pctPendiente}% del total</div>
        </div>

        <div class="card">
          <div class="label">Intereses cobrados</div>
          <div class="value">${fmtM(d.intereses_cobrados)}</div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem;font-family:var(--ff-mono)">$\u202f${fmt(d.intereses_cobrados)}</div>
        </div>

        <div class="card">
          <div class="label">Préstamos activos</div>
          <div class="value">${d.prestamos_activos}</div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">operaciones vigentes</div>
        </div>

        <div class="card" style="${d.prestamos_en_mora > 0 ? 'background:var(--rojo-light)' : ''}">
          <div class="label">En mora</div>
          <div class="value" style="color:${d.prestamos_en_mora > 0 ? 'var(--rojo)' : 'var(--verde)'}">${d.prestamos_en_mora}</div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">${d.prestamos_en_mora === 0 ? 'Sin incidencias' : 'requieren atención'}</div>
        </div>
      </div>

      ${d.proximos_a_vencer.length > 0 ? `
        <h3>Próximos vencimientos — 7 días</h3>
        <table style="margin-bottom:1.75rem">
          <thead>
            <tr><th>Cliente</th><th>DNI</th><th>Teléfono</th><th>Vencimiento</th></tr>
          </thead>
          <tbody>
            ${d.proximos_a_vencer.map(p => `
              <tr>
                <td style="font-weight:600;color:var(--ink)">${p.apellido}, ${p.nombre}</td>
                <td style="font-family:var(--ff-mono);font-size:.82rem;color:var(--ink-3)">${p.dni}</td>
                <td style="color:var(--ink-2)">${p.telefono || '—'}</td>
                <td><span class="badge badge-amarillo">${p.proximo_vencimiento}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>` : ''}

      ${d.en_mora.length > 0 ? `
        <h3>Operaciones en mora</h3>
        <table>
          <thead>
            <tr><th>Cliente</th><th>DNI</th><th>Teléfono</th><th>Vencido</th></tr>
          </thead>
          <tbody>
            ${d.en_mora.map(p => `
              <tr style="background:var(--rojo-light)">
                <td style="font-weight:600;color:var(--rojo)">${p.apellido}, ${p.nombre}</td>
                <td style="font-family:var(--ff-mono);font-size:.82rem;color:var(--ink-3)">${p.dni}</td>
                <td style="color:var(--ink-2)">${p.telefono || '—'}</td>
                <td><span class="badge badge-rojo">${p.proximo_vencimiento}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>` : ''}

      ${d.proximos_a_vencer.length === 0 && d.en_mora.length === 0 ? `
        <div style="padding:1rem 1.25rem;background:var(--verde-tint);border:1px solid var(--verde-light);border-radius:var(--radius);color:var(--verde-mid);font-size:.875rem;font-weight:500;display:flex;align-items:center;gap:.5rem">
          <span style="font-size:1rem">✓</span> Todas las operaciones están al día
        </div>` : ''}
    `;
  } catch (err) {
    app.innerHTML = `<h2>Panel de control</h2><p class="msg-error">Error: ${err.message}</p>`;
  }
}
