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
                <td style="font-weight:600;color:var(--ink)">${esc(p.apellido)}, ${esc(p.nombre)}</td>
                <td style="font-family:var(--ff-mono);font-size:.82rem;color:var(--ink-3)">${esc(p.dni)}</td>
                <td style="color:var(--ink-2)">${esc(p.telefono || '—')}</td>
                <td><span class="badge badge-amarillo">${esc(p.proximo_vencimiento)}</span></td>
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
                <td style="font-weight:600;color:var(--rojo)">${esc(p.apellido)}, ${esc(p.nombre)}</td>
                <td style="font-family:var(--ff-mono);font-size:.82rem;color:var(--ink-3)">${esc(p.dni)}</td>
                <td style="color:var(--ink-2)">${esc(p.telefono || '—')}</td>
                <td><span class="badge badge-rojo">${esc(p.proximo_vencimiento)}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>` : ''}

      ${d.proximos_a_vencer.length === 0 && d.en_mora.length === 0 ? `
        <div style="padding:1rem 1.25rem;background:var(--verde-tint);border:1px solid var(--verde-light);border-radius:var(--radius);color:var(--verde-mid);font-size:.875rem;font-weight:500;display:flex;align-items:center;gap:.5rem">
          <span style="font-size:1rem">✓</span> Todas las operaciones de préstamos están al día
        </div>` : ''}

      ${d.terceros && (d.terceros.captaciones_activas > 0 || d.terceros.pasivo_total > 0) ? `
        <h3 style="margin-top:2.5rem;margin-bottom:.75rem;color:var(--ink);display:flex;align-items:center;gap:.5rem">
          <span style="background:#2980b9;color:white;font-size:.7rem;padding:.15rem .55rem;border-radius:10px;font-weight:700;letter-spacing:.05em">PASIVO</span>
          Plata de terceros
        </h3>

        <div class="cards">
          <div class="card">
            <div class="label">Pasivo total</div>
            <div class="value" style="color:#2980b9">${fmtM(d.terceros.pasivo_total)}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem;font-family:var(--ff-mono)">$ ${fmt(d.terceros.pasivo_total)}</div>
          </div>

          <div class="card">
            <div class="label">Capital devuelto</div>
            <div class="value" style="color:var(--verde)">${fmtM(d.terceros.capital_devuelto)}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">${d.terceros.pasivo_total > 0 ? ((d.terceros.capital_devuelto / d.terceros.pasivo_total * 100).toFixed(1) + '% del total') : '—'}</div>
          </div>

          <div class="card">
            <div class="label">Pasivo pendiente</div>
            <div class="value" style="color:var(--gold)">${fmtM(d.terceros.pasivo_pendiente)}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">${d.terceros.pasivo_total > 0 ? ((d.terceros.pasivo_pendiente / d.terceros.pasivo_total * 100).toFixed(1) + '% del total') : '—'}</div>
          </div>

          <div class="card">
            <div class="label">Intereses pagados</div>
            <div class="value">${fmtM(d.terceros.intereses_pagados)}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem;font-family:var(--ff-mono)">$ ${fmt(d.terceros.intereses_pagados)}</div>
          </div>

          <div class="card">
            <div class="label">Captaciones activas</div>
            <div class="value">${d.terceros.captaciones_activas}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">operaciones vigentes</div>
          </div>

          <div class="card" style="${d.terceros.captaciones_en_mora > 0 ? 'background:var(--rojo-light)' : ''}">
            <div class="label">En mora</div>
            <div class="value" style="color:${d.terceros.captaciones_en_mora > 0 ? 'var(--rojo)' : 'var(--verde)'}">${d.terceros.captaciones_en_mora}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">${d.terceros.captaciones_en_mora === 0 ? 'Sin atrasos' : 'devoluciones atrasadas'}</div>
          </div>
        </div>

        <div class="cards" style="margin-top:1rem">
          <div class="card" style="${d.terceros.spread_financiero >= 0 ? 'border-left:3px solid var(--verde)' : 'border-left:3px solid var(--rojo)'}">
            <div class="label">Spread financiero</div>
            <div class="value" style="color:${d.terceros.spread_financiero >= 0 ? 'var(--verde)' : 'var(--rojo)'}">
              ${d.terceros.spread_financiero >= 0 ? '+' : ''}${fmtM(d.terceros.spread_financiero)}
            </div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">intereses cobrados − intereses pagados</div>
          </div>

          ${d.terceros.cobertura !== null ? `
          <div class="card" style="${d.terceros.cobertura >= 1 ? 'border-left:3px solid var(--verde)' : 'border-left:3px solid var(--rojo);background:var(--rojo-light)'}">
            <div class="label">Cobertura</div>
            <div class="value" style="color:${d.terceros.cobertura >= 1 ? 'var(--verde)' : 'var(--rojo)'}">${(d.terceros.cobertura * 100).toFixed(0)}%</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">${d.terceros.cobertura >= 1 ? 'capital pendiente cubre el pasivo' : '⚠️ no alcanza para devolver'}</div>
          </div>` : ''}
        </div>

        ${d.terceros.proximas_devoluciones.length > 0 ? `
          <h4 style="margin-top:1.5rem;margin-bottom:.5rem;font-size:.92rem;color:var(--ink-2)">Próximas devoluciones — 7 días</h4>
          <table style="margin-bottom:1.5rem">
            <thead>
              <tr><th>Inversor</th><th>DNI</th><th>Teléfono</th><th>Vencimiento</th></tr>
            </thead>
            <tbody>
              ${d.terceros.proximas_devoluciones.map(p => `
                <tr>
                  <td style="font-weight:600;color:var(--ink)">${esc(p.apellido)}, ${esc(p.nombre)}</td>
                  <td style="font-family:var(--ff-mono);font-size:.82rem;color:var(--ink-3)">${esc(p.dni)}</td>
                  <td style="color:var(--ink-2)">${esc(p.telefono || '—')}</td>
                  <td><span class="badge badge-amarillo">${esc(p.proximo_vencimiento)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>` : ''}

        ${d.terceros.en_mora.length > 0 ? `
          <h4 style="margin-top:1.5rem;margin-bottom:.5rem;font-size:.92rem;color:var(--rojo)">Devoluciones atrasadas</h4>
          <table>
            <thead>
              <tr><th>Inversor</th><th>DNI</th><th>Teléfono</th><th>Atrasado desde</th></tr>
            </thead>
            <tbody>
              ${d.terceros.en_mora.map(p => `
                <tr style="background:var(--rojo-light)">
                  <td style="font-weight:600;color:var(--rojo)">${esc(p.apellido)}, ${esc(p.nombre)}</td>
                  <td style="font-family:var(--ff-mono);font-size:.82rem;color:var(--ink-3)">${esc(p.dni)}</td>
                  <td style="color:var(--ink-2)">${esc(p.telefono || '—')}</td>
                  <td><span class="badge badge-rojo">${esc(p.proximo_vencimiento)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>` : ''}
      ` : ''}
    `;
  } catch (err) {
    if (err._auth) return;
    app.innerHTML = `<h2>Panel de control</h2><p class="msg-error">Error: ${esc(err.message)}</p>`;
  }
}
