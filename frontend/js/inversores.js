// Inversores — quienes aportan capital. Espejo simétrico de clientes.js.

const DOCS_INVERSOR = [
  { id: 'dni_frente_dorso',      label: 'Fotocopia DNI (frente y dorso)',                           grupo: 'Identidad' },
  { id: 'comprobante_domicilio', label: 'Comprobante de domicilio (boleta, últ. 90 días)',          grupo: 'Identidad' },
  { id: 'origen_fondos',         label: 'Declaración / comprobante de origen de los fondos',         grupo: 'Origen de fondos' },
  { id: 'contrato_mutuo',        label: 'Contrato de mutuo firmado (físico)',                       grupo: 'Documentación' },
  { id: 'pagare',                label: 'Pagaré firmado',                                            grupo: 'Documentación' },
];

const ORIGENES_INV = ['Referido', 'Familiar', 'Conocido', 'Otro inversor', 'Recomendación'];

function parseDocsInv(raw) {
  let arr;
  try { arr = JSON.parse(raw || '[]'); } catch { arr = []; }
  if (!Array.isArray(arr)) return [];
  const validos = new Set(DOCS_INVERSOR.map(d => d.id));
  return arr.filter(id => validos.has(id));
}

function docsBadgeInv(docsRaw) {
  const docs = parseDocsInv(docsRaw);
  const total = DOCS_INVERSOR.length;
  if (docs.length === 0) return '<span style="color:#bbb;font-size:.8rem">Sin docs</span>';
  const color = docs.length === total ? '#1b4332' : docs.length >= 3 ? '#9a7b3f' : '#c0392b';
  return `<span style="font-size:.8rem;font-weight:700;color:${color}">${docs.length}/${total}</span>`;
}

async function renderInversores() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  const inversores = await api.get('/inversores').catch(() => []);

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Inversores</h2>
      <button class="btn-primary" onclick="renderInversorForm()">+ Nuevo inversor</button>
    </div>
    <div style="margin-bottom:.75rem">
      <input id="buscarInversor" type="text" placeholder="Buscar por nombre o DNI..."
        oninput="filtrarInversores(this.value)"
        style="width:100%;max-width:400px;padding:.5rem .75rem;border:1px solid #ddd;border-radius:6px;font-size:.95rem" />
    </div>
    <table>
      <thead>
        <tr>
          <th>Legajo</th>
          <th>Apellido y nombre</th>
          <th>DNI</th>
          <th>Teléfono</th>
          <th>Origen</th>
          <th>Docs</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="tablaInversores">
        ${inversores.length === 0
          ? '<tr><td colspan="7" style="text-align:center;color:#999">Sin inversores registrados</td></tr>'
          : inversores.map(i => `
            <tr>
              <td><span style="font-family:var(--font-mono);font-size:.85rem;color:#888">I-${String(i.id).padStart(4,'0')}</span></td>
              <td><strong>${esc(i.apellido)}, ${esc(i.nombre)}</strong></td>
              <td>${esc(i.dni)}</td>
              <td>${esc(i.telefono || '-')}</td>
              <td>${esc(i.origen || '-')}</td>
              <td>${docsBadgeInv(i.documentacion_presentada)}</td>
              <td style="display:flex;gap:.3rem">
                <button class="btn-secondary" style="margin:0" onclick="renderInversorDetalle(${i.id})">Ver</button>
                <button class="btn-secondary" style="margin:0" onclick="renderInversorForm(${i.id})">Editar</button>
              </td>
            </tr>`).join('')}
      </tbody>
    </table>
  `;
}

window.filtrarInversores = (q) => {
  const term = q.toLowerCase().trim();
  document.querySelectorAll('#tablaInversores tr').forEach(tr => {
    tr.style.display = !term || tr.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
};

async function renderInversorDetalle(id) {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  const [inversor, captaciones] = await Promise.all([
    api.get(`/inversores/${id}`).catch(() => null),
    api.get(`/captaciones?id_inversor=${id}&incluir_archivadas=true`).catch(() => [])
  ]);
  if (!inversor) { app.innerHTML = '<p class="msg-error">Inversor no encontrado</p>'; return; }

  const docs = parseDocsInv(inversor.documentacion_presentada);
  const grupos = [...new Set(DOCS_INVERSOR.map(d => d.grupo))];
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });

  const estadoBadge = estado => {
    if (estado === 'devuelta') return '<span class="badge badge-verde">Devuelta</span>';
    if (estado === 'mora')     return '<span class="badge badge-rojo">Mora</span>';
    if (estado === 'archivada')return '<span class="badge" style="background:#f0f0f0;color:#888">Archivada</span>';
    return '<span class="badge badge-verde">Activa</span>';
  };

  const totalAportado = captaciones.reduce((s, c) => s + parseFloat(c.monto_capital), 0);
  const activas = captaciones.filter(c => c.estado === 'activa' || c.estado === 'mora').length;

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>
        ${esc(inversor.apellido)}, ${esc(inversor.nombre)}
        <span style="font-family:var(--font-mono);font-size:.85rem;font-weight:400;color:#888;margin-left:.75rem">
          Legajo I-${String(inversor.id).padStart(4,'0')}
        </span>
      </h2>
      <div style="display:flex;gap:.5rem">
        <button class="btn-secondary" onclick="renderInversorForm(${inversor.id})">Editar</button>
        <button class="btn-secondary" onclick="renderInversores()">← Volver</button>
      </div>
    </div>

    <div class="cards" style="margin-bottom:1.5rem">
      <div class="card"><div class="label">DNI</div><div class="value" style="font-size:1.2rem">${esc(inversor.dni)}</div></div>
      <div class="card"><div class="label">CUIT</div><div class="value" style="font-size:1.2rem">${esc(inversor.cuit || '-')}</div></div>
      <div class="card"><div class="label">Teléfono</div><div class="value" style="font-size:1.2rem">${esc(inversor.telefono || '-')}</div></div>
      <div class="card"><div class="label">Email</div><div class="value" style="font-size:1rem">${esc(inversor.email || '-')}</div></div>
      <div class="card"><div class="label">Captaciones activas</div><div class="value">${activas}</div></div>
      <div class="card"><div class="label">Total aportado</div><div class="value" style="font-size:1.1rem">$${fmt(totalAportado)}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem">
      <div style="background:white;border-radius:8px;padding:1.2rem;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <h4 style="margin-bottom:1rem;font-size:.9rem;text-transform:uppercase;letter-spacing:.05em;color:#666">Documentación presentada</h4>
        ${grupos.map(grupo => `
          <div style="margin-bottom:.75rem">
            <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#aaa;margin-bottom:.3rem">${grupo}</div>
            ${DOCS_INVERSOR.filter(d => d.grupo === grupo).map(doc => `
              <div style="display:flex;align-items:center;gap:.4rem;padding:.2rem 0;font-size:.85rem;color:${docs.includes(doc.id) ? '#1b4332' : '#ccc'}">
                <span>${docs.includes(doc.id) ? '✓' : '○'}</span>
                ${doc.label}
              </div>`).join('')}
          </div>`).join('')}
      </div>

      <div style="background:white;border-radius:8px;padding:1.2rem;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <h4 style="margin-bottom:.75rem;font-size:.9rem;text-transform:uppercase;letter-spacing:.05em;color:#666">Datos bancarios</h4>
        <p style="font-size:.88rem;margin-bottom:.4rem"><strong>CBU:</strong> ${esc(inversor.banco_cbu || '—')}</p>
        <p style="font-size:.88rem;margin-bottom:.8rem"><strong>Alias:</strong> ${esc(inversor.banco_alias || '—')}</p>
        ${inversor.domicilio ? `<p style="font-size:.85rem;color:#555">📍 ${esc(inversor.domicilio)}</p>` : ''}
        ${inversor.observaciones ? `<p style="font-size:.83rem;color:#888;margin-top:.5rem;font-style:italic">${esc(inversor.observaciones)}</p>` : ''}
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
      <h3>Captaciones</h3>
      <button class="btn-primary" onclick="renderCaptacionForm(${inversor.id})">+ Nueva captación</button>
    </div>
    ${captaciones.length === 0
      ? '<p style="color:#999">Sin captaciones registradas.</p>'
      : `<table>
          <thead>
            <tr><th>Legajo</th><th>Capital</th><th>Tasa</th><th>Cuotas</th><th>1er Vcto</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            ${captaciones.map(c => `
              <tr>
                <td><span style="font-family:var(--font-mono);font-size:.85rem;color:#888">K-${String(c.id).padStart(4,'0')}</span></td>
                <td>$${fmt(c.monto_capital)} ${esc(c.moneda)}</td>
                <td>${parseFloat(c.tasa_interes_mensual)}% ${c.periodicidad === 'semanal' ? 's.' : 'm.'}</td>
                <td>${c.total_cuotas}</td>
                <td>${String(c.primer_vencimiento).split('T')[0]}</td>
                <td>${estadoBadge(c.estado)}</td>
                <td><button class="btn-secondary" style="margin:0" onclick="renderCaptacionDetalle(${c.id})">Ver</button></td>
              </tr>`).join('')}
          </tbody>
        </table>`}
  `;
}

async function renderInversorForm(id = null) {
  const app = document.getElementById('app');
  const inversor = id ? await api.get(`/inversores/${id}`).catch(() => null) : null;
  const docsActuales = parseDocsInv(inversor?.documentacion_presentada);
  const grupos = [...new Set(DOCS_INVERSOR.map(d => d.grupo))];

  const origenActual = (inversor?.origen || '').trim();
  const origenMatch  = ORIGENES_INV.find(o => o.toLowerCase() === origenActual.toLowerCase()) || '';
  const origenEsOtro = !!origenActual && !origenMatch;

  app.innerHTML = `
    <style>
      .doc-item { display:flex; align-items:center; gap:.6rem; cursor:pointer;
        padding:.55rem .7rem; margin-bottom:.4rem; border-radius:7px;
        border:1.5px solid #e3ddd0; background:#fff; transition:background .12s,border-color .12s; }
      .doc-item:hover { border-color:#bdb4a0; }
      .doc-item input[type=checkbox] { width:20px; height:20px; margin:0; flex-shrink:0; cursor:pointer; accent-color:#1b4332; }
      .doc-item .doc-texto { font-size:.88rem; color:#555; }
      .doc-item .doc-ok { display:none; margin-left:auto; font-size:.72rem; font-weight:700;
        color:#1b4332; background:#cfe7d6; padding:.14rem .55rem; border-radius:10px; white-space:nowrap; }
      .doc-item:has(input:checked) { background:#e7f2ea; border-color:#1b4332; }
      .doc-item:has(input:checked) .doc-texto { color:#1b4332; font-weight:600; }
      .doc-item:has(input:checked) .doc-ok { display:inline; }
    </style>
    <div class="seccion-titulo">
      <h2>
        ${id ? 'Editar inversor' : 'Nuevo inversor'}
        ${id ? `<span style="font-family:var(--font-mono);font-size:.82rem;font-weight:400;color:#888;margin-left:.75rem">Legajo I-${String(id).padStart(4,'0')}</span>` : ''}
      </h2>
      <button class="btn-secondary" onclick="${id ? `renderInversorDetalle(${id})` : 'renderInversores()'}">← Volver</button>
    </div>

    <div style="background:#fef9e7;border-left:3px solid #f39c12;padding:.65rem .85rem;border-radius:6px;font-size:.85rem;margin-bottom:1.25rem;max-width:700px">
      <strong>📌 Recordatorio legal:</strong> cada inversor debe tener su contrato de mutuo firmado en físico antes de operar.
      Esta ficha es para trazabilidad operativa, no reemplaza la documentación legal.
    </div>

    <form id="formInversor" style="max-width:700px">
      <div class="form-group"><label>Nombre *</label><input name="nombre" value="${esc(inversor?.nombre || '')}" required /></div>
      <div class="form-group"><label>Apellido *</label><input name="apellido" value="${esc(inversor?.apellido || '')}" required /></div>
      <div class="form-group"><label>DNI * (requerido UIF)</label><input name="dni" value="${esc(inversor?.dni || '')}" required /></div>
      <div class="form-group"><label>CUIT (recomendado)</label><input name="cuit" value="${esc(inversor?.cuit || '')}" placeholder="20-12345678-9" /></div>
      <div class="form-group"><label>Teléfono</label><input name="telefono" value="${esc(inversor?.telefono || '')}" /></div>
      <div class="form-group"><label>Email</label><input name="email" type="email" value="${esc(inversor?.email || '')}" /></div>

      <div class="form-group">
        <label>Origen / Relación</label>
        <select name="origen_select" id="origenSelect" onchange="window.toggleOrigenOtroInv()">
          <option value="">Seleccionar...</option>
          ${ORIGENES_INV.map(o => `<option value="${o}" ${origenMatch === o ? 'selected' : ''}>${o}</option>`).join('')}
          <option value="__otro__" ${origenEsOtro ? 'selected' : ''}>Otro (especificar)…</option>
        </select>
        <input type="text" name="origen_otro" id="origenOtro" placeholder="Especificar"
          value="${origenEsOtro ? esc(origenActual) : ''}"
          style="margin-top:.5rem;display:${origenEsOtro ? 'block' : 'none'}" />
      </div>

      <div class="form-group"><label>Domicilio</label><input name="domicilio" value="${esc(inversor?.domicilio || '')}" /></div>

      <h4 style="margin-top:1.5rem;margin-bottom:.5rem;color:#1b4332;font-size:1rem">Datos bancarios para devoluciones</h4>
      <div class="form-group"><label>CBU</label><input name="banco_cbu" value="${esc(inversor?.banco_cbu || '')}" placeholder="22 dígitos" /></div>
      <div class="form-group"><label>Alias</label><input name="banco_alias" value="${esc(inversor?.banco_alias || '')}" placeholder="ej: juan.perez.mp" /></div>

      <div class="form-group"><label>Observaciones</label><textarea name="observaciones">${esc(inversor?.observaciones || '')}</textarea></div>

      <div class="form-group" style="margin-top:1.25rem">
        <label style="font-size:.95rem;font-weight:700;margin-bottom:.6rem;display:block">
          Documentación presentada
          <span id="contadorDocsInv" style="font-weight:400;font-size:.82rem;color:#888;margin-left:.5rem">
            (${docsActuales.length}/${DOCS_INVERSOR.length})
          </span>
        </label>
        <div style="background:#fafaf8;border:1px solid #e8e4da;border-radius:8px;padding:1rem">
          ${grupos.map(grupo => `
            <div style="margin-bottom:.9rem">
              <div style="font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9a7b3f;margin-bottom:.4rem">${grupo}</div>
              ${DOCS_INVERSOR.filter(d => d.grupo === grupo).map(doc => `
                <label class="doc-item">
                  <input type="checkbox" name="doc_${doc.id}" value="${doc.id}" ${docsActuales.includes(doc.id) ? 'checked' : ''} />
                  <span class="doc-texto">${doc.label}</span>
                  <span class="doc-ok">✓ PRESENTADO</span>
                </label>`).join('')}
            </div>`).join('')}
        </div>
      </div>

      <div style="margin-top:1.5rem;display:flex;gap:.5rem">
        <button type="submit" class="btn-primary">Guardar</button>
        <button type="button" class="btn-secondary" onclick="${id ? `renderInversorDetalle(${id})` : 'renderInversores()'}">Cancelar</button>
      </div>
      <div id="formMsg" style="margin-top:.5rem"></div>
    </form>
  `;

  document.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const n = document.querySelectorAll('input[type=checkbox]:checked').length;
      const el = document.getElementById('contadorDocsInv');
      if (el) el.textContent = `(${n}/${DOCS_INVERSOR.length})`;
    });
  });

  window.toggleOrigenOtroInv = () => {
    const sel  = document.getElementById('origenSelect');
    const otro = document.getElementById('origenOtro');
    if (!sel || !otro) return;
    const esOtro = sel.value === '__otro__';
    otro.style.display = esOtro ? 'block' : 'none';
    if (esOtro) otro.focus();
  };

  document.getElementById('formInversor').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const docsSeleccionados = DOCS_INVERSOR.filter(doc => fd[`doc_${doc.id}`]).map(doc => doc.id);
    Object.keys(fd).filter(k => k.startsWith('doc_')).forEach(k => delete fd[k]);
    fd.documentacion_presentada = docsSeleccionados;

    fd.origen = fd.origen_select === '__otro__'
      ? (fd.origen_otro || '').trim()
      : (fd.origen_select || '');
    delete fd.origen_select;
    delete fd.origen_otro;

    const msg = document.getElementById('formMsg');
    try {
      if (id) await api.put(`/inversores/${id}`, fd);
      else await api.post('/inversores', fd);
      id ? renderInversorDetalle(id) : renderInversores();
    } catch (err) {
      if (err._auth) return;
      msg.innerHTML = `<span class="msg-error">${esc(err.message)}</span>`;
    }
  });
}
