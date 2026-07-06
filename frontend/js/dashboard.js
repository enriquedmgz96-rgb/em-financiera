// Paneles de control por módulo.
// El endpoint /dashboard devuelve las dos mitades (préstamos propios y plata de
// terceros), cada una desglosada POR MONEDA (nunca se suman ARS + USD).

function _fmtDash(n) {
  return Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}
function _fmtDashM(n) {
  const a = Math.abs(Number(n));
  const s = n < 0 ? '-' : '';
  if (a >= 1_000_000) return s + '$ ' + (a / 1_000_000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M';
  if (a >= 1_000)     return s + '$ ' + (a / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 0 }) + ' K';
  return s + '$ ' + _fmtDash(a);
}
function _nombreMoneda(m) { return m === 'USD' ? 'Dólares (USD)' : 'Pesos (ARS)'; }

// ── Panel del módulo Préstamos (capital propio) ───────────────────────────────
async function renderDashboardPrestamos() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  try {
    const d = await api.get('/dashboard');
    const fmt = _fmtDash, fmtM = _fmtDashM;
    const fins = d.finanzas_prestamos || [];
    const multi = fins.length > 1;

    const bloqueMoneda = f => {
      const pctCobrado   = f.capital_total_prestado > 0 ? (f.capital_cobrado / f.capital_total_prestado * 100).toFixed(1) : 0;
      const pctPendiente = f.capital_total_prestado > 0 ? (f.capital_pendiente / f.capital_total_prestado * 100).toFixed(1) : 0;
      return `
        ${multi ? `<h3 style="margin-top:1.5rem;font-size:1rem;color:var(--ink,#1b4332)">${esc(_nombreMoneda(f.moneda))}</h3>` : ''}
        <div class="cards">
          <div class="card">
            <div class="label">Capital en cartera</div>
            <div class="value">${fmtM(f.capital_total_prestado)}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem;font-family:var(--ff-mono)">$ ${fmt(f.capital_total_prestado)}</div>
          </div>
          <div class="card">
            <div class="label">Capital recuperado</div>
            <div class="value" style="color:var(--verde)">${fmtM(f.capital_cobrado)}</div>
            <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pctCobrado}%"></div></div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.35rem">${pctCobrado}% del total</div>
          </div>
          <div class="card">
            <div class="label">Capital pendiente</div>
            <div class="value" style="color:var(--gold)">${fmtM(f.capital_pendiente)}</div>
            <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pctPendiente}%;background:var(--gold)"></div></div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.35rem">${pctPendiente}% del total</div>
          </div>
          <div class="card">
            <div class="label">Intereses cobrados</div>
            <div class="value">${fmtM(f.intereses_cobrados)}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem;font-family:var(--ff-mono)">$ ${fmt(f.intereses_cobrados)}</div>
          </div>
        </div>`;
    };

    app.innerHTML = `
      <h2>Panel de préstamos <span style="font-size:.7rem;font-weight:700;letter-spacing:.05em;background:#e7ecea;color:#1b4332;padding:.15rem .55rem;border-radius:10px;vertical-align:middle">PROPIO</span></h2>
      <p style="color:var(--ink-3,#888);margin-bottom:.5rem;font-size:.92rem">
        Tu capital prestado a clientes: cuánto está en la calle, cuánto recuperaste y qué vence pronto.
        ${multi ? 'Cada moneda se muestra por separado.' : ''}
      </p>

      ${fins.length === 0 ? '<p style="color:#999;margin:1rem 0">Sin préstamos activos.</p>' : fins.map(bloqueMoneda).join('')}

      <div class="cards" style="margin-top:1rem">
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
    `;
  } catch (err) {
    if (err._auth) return;
    app.innerHTML = `<h2>Panel de préstamos</h2><p class="msg-error">Error: ${esc(err.message)}</p>`;
  }
}

// ── Panel del módulo Plata de terceros (pasivo) ───────────────────────────────
async function renderDashboardTerceros() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  try {
    const d = await api.get('/dashboard');
    const t = d.terceros || {};
    const fmt = _fmtDash, fmtM = _fmtDashM;
    const fins = t.finanzas || [];
    const multi = fins.length > 1;
    const hayActividad = fins.length > 0;

    const bloqueMoneda = f => `
      ${multi ? `<h3 style="margin-top:1.5rem;font-size:1rem;color:#2980b9">${esc(_nombreMoneda(f.moneda))}</h3>` : ''}
      <div class="cards">
        <div class="card">
          <div class="label">Pasivo total</div>
          <div class="value" style="color:#2980b9">${fmtM(f.pasivo_total)}</div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem;font-family:var(--ff-mono)">$ ${fmt(f.pasivo_total)}</div>
        </div>
        <div class="card">
          <div class="label">Capital devuelto</div>
          <div class="value" style="color:var(--verde)">${fmtM(f.capital_devuelto)}</div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">${f.pasivo_total > 0 ? ((f.capital_devuelto / f.pasivo_total * 100).toFixed(1) + '% del total') : '—'}</div>
        </div>
        <div class="card">
          <div class="label">Pasivo pendiente</div>
          <div class="value" style="color:var(--gold)">${fmtM(f.pasivo_pendiente)}</div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">${f.pasivo_total > 0 ? ((f.pasivo_pendiente / f.pasivo_total * 100).toFixed(1) + '% del total') : '—'}</div>
        </div>
        <div class="card">
          <div class="label">Intereses pagados</div>
          <div class="value">${fmtM(f.intereses_pagados)}</div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem;font-family:var(--ff-mono)">$ ${fmt(f.intereses_pagados)}</div>
        </div>
        <div class="card" style="${f.spread_financiero >= 0 ? 'border-left:3px solid var(--verde)' : 'border-left:3px solid var(--rojo)'}">
          <div class="label">Spread financiero</div>
          <div class="value" style="color:${f.spread_financiero >= 0 ? 'var(--verde)' : 'var(--rojo)'}">${f.spread_financiero >= 0 ? '+' : ''}${fmtM(f.spread_financiero)}</div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">intereses cobrados − pagados</div>
        </div>
        ${f.cobertura !== null && f.cobertura !== undefined ? `
        <div class="card" style="${f.cobertura >= 1 ? 'border-left:3px solid var(--verde)' : 'border-left:3px solid var(--rojo);background:var(--rojo-light)'}">
          <div class="label">Cobertura</div>
          <div class="value" style="color:${f.cobertura >= 1 ? 'var(--verde)' : 'var(--rojo)'}">${(f.cobertura * 100).toFixed(0)}%</div>
          <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">${f.cobertura >= 1 ? 'capital pendiente cubre el pasivo' : '⚠️ no alcanza para devolver'}</div>
        </div>` : ''}
      </div>`;

    app.innerHTML = `
      <h2>Panel de plata de terceros <span style="font-size:.7rem;font-weight:700;letter-spacing:.05em;background:#d6eaf8;color:#2980b9;padding:.15rem .55rem;border-radius:10px;vertical-align:middle">PASIVO</span></h2>
      <p style="color:var(--ink-3,#888);margin-bottom:.5rem;font-size:.92rem">
        Capital captado de inversores: cuánto debés, cuánto devolviste y qué devolución vence pronto.
        ${multi ? 'Cada moneda se muestra por separado.' : ''}
      </p>

      ${!hayActividad ? `
        <div style="margin-top:1.25rem;padding:1.25rem 1.5rem;background:#f4f8fc;border:1px solid #d3e2f4;border-radius:var(--radius,8px);color:#2980b9;font-size:.9rem">
          Todavía no hay capital captado de inversores. Cuando registres una
          <strong>captación</strong> vas a ver acá el pasivo, las devoluciones y el spread.
        </div>` : `
        ${fins.map(bloqueMoneda).join('')}

        <div class="cards" style="margin-top:1rem">
          <div class="card">
            <div class="label">Captaciones activas</div>
            <div class="value">${t.captaciones_activas || 0}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">operaciones vigentes</div>
          </div>
          <div class="card" style="${t.captaciones_en_mora > 0 ? 'background:var(--rojo-light)' : ''}">
            <div class="label">En mora</div>
            <div class="value" style="color:${t.captaciones_en_mora > 0 ? 'var(--rojo)' : 'var(--verde)'}">${t.captaciones_en_mora || 0}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:.45rem">${!t.captaciones_en_mora ? 'Sin atrasos' : 'devoluciones atrasadas'}</div>
          </div>
        </div>

        ${t.proximas_devoluciones && t.proximas_devoluciones.length > 0 ? `
          <h4 style="margin-top:1.5rem;margin-bottom:.5rem;font-size:.92rem;color:var(--ink-2)">Próximas devoluciones — 7 días</h4>
          <table style="margin-bottom:1.5rem">
            <thead>
              <tr><th>Inversor</th><th>DNI</th><th>Teléfono</th><th>Vencimiento</th></tr>
            </thead>
            <tbody>
              ${t.proximas_devoluciones.map(p => `
                <tr>
                  <td style="font-weight:600;color:var(--ink)">${esc(p.apellido)}, ${esc(p.nombre)}</td>
                  <td style="font-family:var(--ff-mono);font-size:.82rem;color:var(--ink-3)">${esc(p.dni)}</td>
                  <td style="color:var(--ink-2)">${esc(p.telefono || '—')}</td>
                  <td><span class="badge badge-amarillo">${esc(p.proximo_vencimiento)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>` : ''}

        ${t.en_mora && t.en_mora.length > 0 ? `
          <h4 style="margin-top:1.5rem;margin-bottom:.5rem;font-size:.92rem;color:var(--rojo)">Devoluciones atrasadas</h4>
          <table>
            <thead>
              <tr><th>Inversor</th><th>DNI</th><th>Teléfono</th><th>Atrasado desde</th></tr>
            </thead>
            <tbody>
              ${t.en_mora.map(p => `
                <tr style="background:var(--rojo-light)">
                  <td style="font-weight:600;color:var(--rojo)">${esc(p.apellido)}, ${esc(p.nombre)}</td>
                  <td style="font-family:var(--ff-mono);font-size:.82rem;color:var(--ink-3)">${esc(p.dni)}</td>
                  <td style="color:var(--ink-2)">${esc(p.telefono || '—')}</td>
                  <td><span class="badge badge-rojo">${esc(p.proximo_vencimiento)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>` : ''}

        ${(!t.proximas_devoluciones || t.proximas_devoluciones.length === 0) && (!t.en_mora || t.en_mora.length === 0) ? `
          <div style="padding:1rem 1.25rem;background:var(--verde-tint);border:1px solid var(--verde-light);border-radius:var(--radius);color:var(--verde-mid);font-size:.875rem;font-weight:500;display:flex;align-items:center;gap:.5rem">
            <span style="font-size:1rem">✓</span> Todas las devoluciones a inversores están al día
          </div>` : ''}
      `}
    `;
  } catch (err) {
    if (err._auth) return;
    app.innerHTML = `<h2>Panel de plata de terceros</h2><p class="msg-error">Error: ${esc(err.message)}</p>`;
  }
}
