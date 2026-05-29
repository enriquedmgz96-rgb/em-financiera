// Balance consolidado — Activo (préstamos a cobrar) vs Pasivo (captaciones a devolver)
async function renderBalance() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  try {
    const d = await api.get('/dashboard/balance');
    const fmt  = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
    const fmtM = n => {
      const a = Math.abs(n);
      const s = n < 0 ? '-' : '';
      if (a >= 1_000_000) return s + '$ ' + (a / 1_000_000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M';
      if (a >= 1_000)     return s + '$ ' + (a / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 0 }) + ' K';
      return s + '$ ' + fmt(a);
    };
    const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const labelMes = ym => {
      const [a, m] = ym.split('-');
      return `${MESES[parseInt(m, 10) - 1]} ${a.slice(2)}`;
    };

    const activo = d.activo.a_cobrar;
    const pasivo = d.pasivo.a_devolver;
    const max = Math.max(activo, pasivo, 1);
    const neta = d.posicion_neta;
    const cob  = d.cobertura;

    // Escala para las barras de tendencia (sobre el mayor interés del periodo)
    const maxInt = Math.max(1, ...d.tendencia.map(t => Math.max(t.intereses_cobrados, t.intereses_pagados)));
    const spreadTotal = d.tendencia.reduce((s, t) => s + t.spread, 0);

    app.innerHTML = `
      <style>
        .bal-vs { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin:1.25rem 0 .5rem; }
        @media (max-width:640px){ .bal-vs { grid-template-columns:1fr; } }
        .bal-side { border-radius:12px; padding:1.1rem 1.25rem; }
        .bal-side.activo { background:#eef6ef; border:1px solid #cfe6d2; }
        .bal-side.pasivo { background:#eef3fb; border:1px solid #d3e2f4; }
        .bal-side .tag { font-size:.7rem; font-weight:700; letter-spacing:.05em; padding:.15rem .55rem; border-radius:10px; color:#fff; }
        .bal-side.activo .tag { background:var(--verde,#1b4332); }
        .bal-side.pasivo .tag { background:#2980b9; }
        .bal-side .big { font-family:var(--font-serif,'DM Serif Display',serif); font-size:1.9rem; margin:.55rem 0 .2rem; }
        .bal-side.activo .big { color:var(--verde,#1b4332); }
        .bal-side.pasivo .big { color:#2980b9; }
        .bal-side .sub { font-size:.78rem; color:var(--ink-3,#888); }
        .bal-bar-track { height:10px; border-radius:6px; background:rgba(0,0,0,.06); margin-top:.7rem; overflow:hidden; }
        .bal-bar-fill { height:100%; border-radius:6px; }
        .bal-trend-bar-wrap { display:flex; align-items:flex-end; gap:2px; height:54px; }
        .bal-trend-col { flex:1; border-radius:3px 3px 0 0; min-height:2px; }
      </style>

      <h2>Balance consolidado</h2>
      <p style="color:var(--ink-3,#888);margin-bottom:.5rem;font-size:.92rem">
        Lo que tenés por cobrar a clientes frente a lo que debés devolver a inversores.
      </p>

      <div class="bal-vs">
        <div class="bal-side activo">
          <span class="tag">ACTIVO</span>
          <div class="big">${fmtM(activo)}</div>
          <div class="sub">Préstamos por cobrar · ${d.activo.operaciones} operaciones</div>
          <div class="bal-bar-track"><div class="bal-bar-fill" style="width:${(activo / max * 100).toFixed(1)}%;background:var(--verde,#1b4332)"></div></div>
          <div class="sub" style="margin-top:.5rem">Capital prestado total: <strong>${fmtM(d.activo.capital_prestado)}</strong></div>
        </div>
        <div class="bal-side pasivo">
          <span class="tag">PASIVO</span>
          <div class="big">${fmtM(pasivo)}</div>
          <div class="sub">Captaciones por devolver · ${d.pasivo.operaciones} operaciones</div>
          <div class="bal-bar-track"><div class="bal-bar-fill" style="width:${(pasivo / max * 100).toFixed(1)}%;background:#2980b9"></div></div>
          <div class="sub" style="margin-top:.5rem">Capital captado total: <strong>${fmtM(d.pasivo.capital_captado)}</strong></div>
        </div>
      </div>

      <div class="cards" style="margin-top:1rem">
        <div class="card" style="border-left:3px solid ${neta >= 0 ? 'var(--verde,#1b4332)' : 'var(--rojo,#c0392b)'}">
          <div class="label">Posición neta</div>
          <div class="value" style="color:${neta >= 0 ? 'var(--verde,#1b4332)' : 'var(--rojo,#c0392b)'}">${neta >= 0 ? '+' : ''}${fmtM(neta)}</div>
          <div style="font-size:.72rem;color:var(--ink-4,#888);margin-top:.45rem">por cobrar − por devolver</div>
        </div>
        ${cob !== null ? `
        <div class="card" style="border-left:3px solid ${cob >= 1 ? 'var(--verde,#1b4332)' : 'var(--rojo,#c0392b)'};${cob < 1 ? 'background:var(--rojo-light,#fdecea)' : ''}">
          <div class="label">Cobertura</div>
          <div class="value" style="color:${cob >= 1 ? 'var(--verde,#1b4332)' : 'var(--rojo,#c0392b)'}">${(cob * 100).toFixed(0)}%</div>
          <div style="font-size:.72rem;color:var(--ink-4,#888);margin-top:.45rem">${cob >= 1 ? 'lo por cobrar cubre el pasivo' : '⚠️ no alcanza para devolver'}</div>
        </div>` : `
        <div class="card">
          <div class="label">Cobertura</div>
          <div class="value" style="color:var(--ink-3,#888)">—</div>
          <div style="font-size:.72rem;color:var(--ink-4,#888);margin-top:.45rem">sin pasivo pendiente</div>
        </div>`}
        <div class="card" style="border-left:3px solid ${spreadTotal >= 0 ? 'var(--verde,#1b4332)' : 'var(--rojo,#c0392b)'}">
          <div class="label">Spread 6 meses</div>
          <div class="value" style="color:${spreadTotal >= 0 ? 'var(--verde,#1b4332)' : 'var(--rojo,#c0392b)'}">${spreadTotal >= 0 ? '+' : ''}${fmtM(spreadTotal)}</div>
          <div style="font-size:.72rem;color:var(--ink-4,#888);margin-top:.45rem">intereses cobrados − pagados</div>
        </div>
      </div>

      <h3 style="margin-top:2rem">Tendencia — intereses por mes</h3>
      <p style="color:var(--ink-3,#888);font-size:.85rem;margin-bottom:.75rem">
        Verde = intereses cobrados a clientes · Azul = intereses pagados a inversores.
      </p>
      <table>
        <thead>
          <tr><th>Mes</th><th style="text-align:right">Cobrados</th><th style="text-align:right">Pagados</th><th style="text-align:right">Spread</th><th style="width:160px">Comparativa</th></tr>
        </thead>
        <tbody>
          ${d.tendencia.map(t => `
            <tr>
              <td style="font-weight:600;color:var(--ink,#1b4332)">${esc(labelMes(t.mes))}</td>
              <td style="text-align:right;color:var(--verde,#1b4332);font-family:var(--ff-mono)">${fmtM(t.intereses_cobrados)}</td>
              <td style="text-align:right;color:#2980b9;font-family:var(--ff-mono)">${fmtM(t.intereses_pagados)}</td>
              <td style="text-align:right;font-weight:600;color:${t.spread >= 0 ? 'var(--verde,#1b4332)' : 'var(--rojo,#c0392b)'};font-family:var(--ff-mono)">${t.spread >= 0 ? '+' : ''}${fmtM(t.spread)}</td>
              <td>
                <div class="bal-trend-bar-wrap" style="height:24px">
                  <div class="bal-trend-col" style="background:var(--verde,#1b4332);height:100%;flex:0 0 ${(t.intereses_cobrados / maxInt * 100).toFixed(1)}%"></div>
                  <div class="bal-trend-col" style="background:#2980b9;height:100%;flex:0 0 ${(t.intereses_pagados / maxInt * 100).toFixed(1)}%"></div>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    if (err._auth) return;
    app.innerHTML = `<h2>Balance consolidado</h2><p class="msg-error">Error: ${esc(err.message)}</p>`;
  }
}
