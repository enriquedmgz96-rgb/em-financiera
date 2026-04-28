const DOCS_REQUERIDOS = [
  { id: 'dni_frente_dorso',       label: 'Fotocopia DNI (frente y dorso)',                              grupo: 'Identidad' },
  { id: 'comprobante_domicilio',  label: 'Comprobante de domicilio (boleta de luz/gas/agua, últ. 90 días)', grupo: 'Identidad' },
  { id: 'recibos_sueldo',         label: 'Últimos 3 recibos de sueldo',                                 grupo: 'Ingresos' },
  { id: 'constancia_monotributo', label: 'Constancia de inscripción en monotributo (AFIP)',              grupo: 'Ingresos' },
  { id: 'pagos_monotributo',      label: 'Últimos 3 pagos de monotributo',                              grupo: 'Ingresos' },
  { id: 'extracto_bancario',      label: 'Extracto bancario (últimos 3 meses)',                          grupo: 'Ingresos' },
  { id: 'dni_garante',            label: 'Fotocopia DNI del garante (frente y dorso)',                   grupo: 'Garantía' },
  { id: 'ingresos_garante',       label: 'Comprobante de ingresos del garante',                          grupo: 'Garantía' },
  { id: 'contrato_firmado',       label: 'Contrato de préstamo firmado',                                 grupo: 'Contrato' },
  { id: 'pagare_firmado',         label: 'Pagaré firmado',                                               grupo: 'Contrato' },
];

function parseDocs(raw) {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

function docsBadge(docsRaw) {
  const docs = parseDocs(docsRaw);
  const total = DOCS_REQUERIDOS.length;
  if (docs.length === 0) return `<span style="color:#bbb;font-size:.8rem">Sin docs</span>`;
  const color = docs.length === total ? '#1b4332' : docs.length >= 3 ? '#9a7b3f' : '#c0392b';
  return `<span style="font-size:.8rem;font-weight:700;color:${color}">${docs.length}/${total}</span>`;
}

async function renderClientes() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  const clientes = await api.get('/clientes').catch(() => []);

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Clientes</h2>
      <button class="btn-primary" onclick="renderClienteForm()">+ Nuevo cliente</button>
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
      <tbody>
        ${clientes.length === 0
          ? '<tr><td colspan="7" style="text-align:center;color:#999">Sin clientes registrados</td></tr>'
          : clientes.map(c => `
            <tr>
              <td><span style="font-family:var(--font-mono);font-size:.85rem;color:#888">C-${String(c.id).padStart(4,'0')}</span></td>
              <td><strong>${c.apellido}, ${c.nombre}</strong></td>
              <td>${c.dni}</td>
              <td>${c.telefono || '-'}</td>
              <td>${c.origen || '-'}</td>
              <td>${docsBadge(c.documentacion_presentada)}</td>
              <td style="display:flex;gap:.3rem">
                <button class="btn-secondary" style="margin:0" onclick="renderClienteDetalle(${c.id})">Ver</button>
                <button class="btn-secondary" style="margin:0" onclick="renderClienteForm(${c.id})">Editar</button>
              </td>
            </tr>`).join('')}
      </tbody>
    </table>
  `;
}

async function renderClienteDetalle(id) {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  const [cliente, prestamos] = await Promise.all([
    api.get(`/clientes/${id}`).catch(() => null),
    api.get(`/prestamos?id_cliente=${id}&incluir_archivados=true`).catch(() => [])
  ]);
  if (!cliente) { app.innerHTML = '<p class="msg-error">Cliente no encontrado</p>'; return; }

  const docs = parseDocs(cliente.documentacion_presentada);
  const grupos = [...new Set(DOCS_REQUERIDOS.map(d => d.grupo))];
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });

  const estadoBadge = estado => {
    if (estado === 'cancelado') return '<span class="badge badge-verde">Cancelado</span>';
    if (estado === 'mora')      return '<span class="badge badge-rojo">Mora</span>';
    if (estado === 'archivado') return '<span class="badge" style="background:#f0f0f0;color:#888">Archivado</span>';
    return '<span class="badge badge-verde">Activo</span>';
  };

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>
        ${cliente.apellido}, ${cliente.nombre}
        <span style="font-family:var(--font-mono);font-size:.85rem;font-weight:400;color:#888;margin-left:.75rem">
          Legajo C-${String(cliente.id).padStart(4,'0')}
        </span>
      </h2>
      <div style="display:flex;gap:.5rem">
        <button class="btn-secondary" onclick="renderClienteForm(${cliente.id})">Editar</button>
        <button class="btn-secondary" onclick="renderClientes()">← Volver</button>
      </div>
    </div>

    <div class="cards" style="margin-bottom:1.5rem">
      <div class="card"><div class="label">DNI</div><div class="value" style="font-size:1.2rem">${cliente.dni}</div></div>
      <div class="card"><div class="label">CUIT</div><div class="value" style="font-size:1.2rem">${cliente.cuit || '-'}</div></div>
      <div class="card"><div class="label">Teléfono</div><div class="value" style="font-size:1.2rem">${cliente.telefono || '-'}</div></div>
      <div class="card"><div class="label">Origen</div><div class="value" style="font-size:1.2rem">${cliente.origen || '-'}</div></div>
      <div class="card"><div class="label">Alta</div><div class="value" style="font-size:1.1rem">${new Date(cliente.fecha_alta).toLocaleDateString('es-AR')}</div></div>
      <div class="card"><div class="label">Documentación</div><div class="value" style="font-size:1.3rem">${docs.length}/${DOCS_REQUERIDOS.length}</div>
        <div style="font-size:.75rem;color:${docs.length === DOCS_REQUERIDOS.length ? '#1b4332' : '#9a7b3f'};margin-top:.2rem">
          ${docs.length === DOCS_REQUERIDOS.length ? '✓ Completa' : 'Incompleta'}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem">
      <!-- Documentación -->
      <div style="background:white;border-radius:8px;padding:1.2rem;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <h4 style="margin-bottom:1rem;font-size:.9rem;text-transform:uppercase;letter-spacing:.05em;color:#666">Documentación presentada</h4>
        ${grupos.map(grupo => `
          <div style="margin-bottom:.75rem">
            <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#aaa;margin-bottom:.3rem">${grupo}</div>
            ${DOCS_REQUERIDOS.filter(d => d.grupo === grupo).map(doc => `
              <div style="display:flex;align-items:center;gap:.4rem;padding:.2rem 0;font-size:.85rem;color:${docs.includes(doc.id) ? '#1b4332' : '#ccc'}">
                <span>${docs.includes(doc.id) ? '✓' : '○'}</span>
                ${doc.label}
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>

      <!-- Observaciones -->
      <div style="background:white;border-radius:8px;padding:1.2rem;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <h4 style="margin-bottom:.75rem;font-size:.9rem;text-transform:uppercase;letter-spacing:.05em;color:#666">Observaciones</h4>
        <p style="font-size:.9rem;color:#555;white-space:pre-wrap">${cliente.observaciones || 'Sin observaciones.'}</p>
      </div>
    </div>

    <!-- Legajos de préstamos -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
      <h3>Legajos de préstamos</h3>
      <button class="btn-primary" onclick="renderPrestamoForm(${cliente.id})">+ Nuevo préstamo</button>
    </div>
    ${prestamos.length === 0
      ? '<p style="color:#999">Sin préstamos registrados.</p>'
      : `<table>
          <thead>
            <tr><th>Legajo</th><th>Capital</th><th>Tasa</th><th>Cuotas</th><th>1er Vcto</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            ${prestamos.map(p => `
              <tr>
                <td><span style="font-family:var(--font-mono);font-size:.85rem;color:#888">P-${String(p.id).padStart(4,'0')}</span></td>
                <td>$${fmt(p.monto_capital)} ${p.moneda}</td>
                <td>${parseFloat(p.tasa_interes_mensual)}% m.</td>
                <td>${p.total_cuotas}</td>
                <td>${String(p.primer_vencimiento).split('T')[0]}</td>
                <td>${estadoBadge(p.estado)}</td>
                <td><button class="btn-secondary" style="margin:0" onclick="renderPrestamoDetalle(${p.id})">Ver</button></td>
              </tr>`).join('')}
          </tbody>
        </table>`}
  `;
}

async function renderClienteForm(id = null) {
  const app = document.getElementById('app');
  const cliente = id ? await api.get(`/clientes/${id}`).catch(() => null) : null;
  const docsActuales = parseDocs(cliente?.documentacion_presentada);
  const grupos = [...new Set(DOCS_REQUERIDOS.map(d => d.grupo))];

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>
        ${id ? 'Editar cliente' : 'Nuevo cliente'}
        ${id ? `<span style="font-family:var(--font-mono);font-size:.82rem;font-weight:400;color:#888;margin-left:.75rem">Legajo C-${String(id).padStart(4,'0')}</span>` : ''}
      </h2>
      <button class="btn-secondary" onclick="${id ? `renderClienteDetalle(${id})` : 'renderClientes()'}">← Volver</button>
    </div>
    <form id="formCliente">
      <div class="form-group"><label>Nombre *</label><input name="nombre" value="${cliente?.nombre || ''}" required /></div>
      <div class="form-group"><label>Apellido *</label><input name="apellido" value="${cliente?.apellido || ''}" required /></div>
      <div class="form-group"><label>DNI * (requerido UIF)</label><input name="dni" value="${cliente?.dni || ''}" required /></div>
      <div class="form-group"><label>CUIT (requerido UIF)</label><input name="cuit" value="${cliente?.cuit || ''}" placeholder="20-12345678-9" /></div>
      <div class="form-group"><label>Teléfono</label><input name="telefono" value="${cliente?.telefono || ''}" /></div>
      <div class="form-group"><label>Origen / Referido</label><input name="origen" value="${cliente?.origen || ''}" /></div>
      <div class="form-group"><label>Observaciones</label><textarea name="observaciones">${cliente?.observaciones || ''}</textarea></div>

      <div class="form-group" style="margin-top:1.25rem">
        <label style="font-size:.95rem;font-weight:700;margin-bottom:.6rem;display:block">
          Documentación presentada
          <span id="contadorDocs" style="font-weight:400;font-size:.82rem;color:#888;margin-left:.5rem">
            (${docsActuales.length}/${DOCS_REQUERIDOS.length})
          </span>
        </label>
        <div style="background:#fafaf8;border:1px solid #e8e4da;border-radius:8px;padding:1rem">
          ${grupos.map(grupo => `
            <div style="margin-bottom:.9rem">
              <div style="font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9a7b3f;margin-bottom:.4rem">${grupo}</div>
              ${DOCS_REQUERIDOS.filter(d => d.grupo === grupo).map(doc => `
                <label style="display:flex;align-items:flex-start;gap:.5rem;cursor:pointer;padding:.28rem 0;font-size:.88rem;font-weight:400;color:#333">
                  <input type="checkbox" name="doc_${doc.id}" value="${doc.id}"
                    style="width:16px;height:16px;margin-top:.1rem;flex-shrink:0;cursor:pointer;accent-color:#1b4332"
                    ${docsActuales.includes(doc.id) ? 'checked' : ''} />
                  ${doc.label}
                </label>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-top:1.5rem;display:flex;gap:.5rem">
        <button type="submit" class="btn-primary">Guardar</button>
        <button type="button" class="btn-secondary" onclick="${id ? `renderClienteDetalle(${id})` : 'renderClientes()'}">Cancelar</button>
      </div>
      <div id="formMsg" style="margin-top:.5rem"></div>
    </form>
  `;

  // Contador en tiempo real
  document.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const n = document.querySelectorAll('input[type=checkbox]:checked').length;
      document.getElementById('contadorDocs').textContent = `(${n}/${DOCS_REQUERIDOS.length})`;
    });
  });

  document.getElementById('formCliente').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const docsSeleccionados = DOCS_REQUERIDOS
      .filter(doc => fd[`doc_${doc.id}`])
      .map(doc => doc.id);
    Object.keys(fd).filter(k => k.startsWith('doc_')).forEach(k => delete fd[k]);
    fd.documentacion_presentada = docsSeleccionados;

    const msg = document.getElementById('formMsg');
    try {
      if (id) await api.put(`/clientes/${id}`, fd);
      else await api.post('/clientes', fd);
      id ? renderClienteDetalle(id) : renderClientes();
    } catch (err) {
      msg.innerHTML = `<span class="msg-error">${err.message}</span>`;
    }
  });
}
