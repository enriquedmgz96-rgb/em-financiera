// Registro único de personas (BP / socios). La documentación cubre ambos roles:
// los primeros grupos aplican al rol cliente (préstamos); los últimos al rol
// inversor (captaciones). Una persona presenta solo lo que corresponda a su uso.
const DOCS_REQUERIDOS = [
  { id: 'dni_frente_dorso',       label: 'Fotocopia DNI (frente y dorso)',                              grupo: 'Identidad' },
  { id: 'comprobante_domicilio',  label: 'Comprobante de domicilio (boleta de luz/gas/agua, últ. 90 días)', grupo: 'Identidad' },
  { id: 'recibos_sueldo',         label: 'Últimos 3 recibos de sueldo',                                 grupo: 'Ingresos (préstamo)' },
  { id: 'constancia_monotributo', label: 'Constancia de inscripción en monotributo (AFIP)',              grupo: 'Ingresos (préstamo)' },
  { id: 'pagos_monotributo',      label: 'Últimos 3 pagos de monotributo',                              grupo: 'Ingresos (préstamo)' },
  { id: 'extracto_bancario',      label: 'Extracto bancario (últimos 3 meses)',                          grupo: 'Ingresos (préstamo)' },
  { id: 'dni_garante',            label: 'Fotocopia DNI del garante (frente y dorso)',                   grupo: 'Garantía (préstamo)' },
  { id: 'ingresos_garante',       label: 'Comprobante de ingresos del garante',                          grupo: 'Garantía (préstamo)' },
  { id: 'origen_fondos',          label: 'Declaración / comprobante de origen de los fondos',            grupo: 'Inversor (captación)' },
  { id: 'contrato_mutuo',         label: 'Contrato de mutuo firmado (físico)',                          grupo: 'Inversor (captación)' },
  { id: 'pagare',                 label: 'Pagaré firmado',                                              grupo: 'Inversor (captación)' },
];

const ORIGENES = [
  'Referido',
  'EMM',
  'Redes sociales',
  'Instagram',
  'Facebook',
  'WhatsApp',
  'Cliente recurrente',
  'Familiar',
  'Conocido',
  'Otro inversor',
  'Publicidad / Volante',
  'Cartel del local',
];

function parseDocs(raw) {
  let arr;
  try { arr = JSON.parse(raw || '[]'); } catch { arr = []; }
  if (!Array.isArray(arr)) return [];
  const validos = new Set(DOCS_REQUERIDOS.map(d => d.id));
  return arr.filter(id => validos.has(id));
}

function docsBadge(docsRaw) {
  const docs = parseDocs(docsRaw);
  const total = DOCS_REQUERIDOS.length;
  if (docs.length === 0) return `<span style="color:#bbb;font-size:.8rem">Sin docs</span>`;
  const color = docs.length === total ? '#1b4332' : docs.length >= 3 ? '#9a7b3f' : '#c0392b';
  return `<span style="font-size:.8rem;font-weight:700;color:${color}">${docs.length}/${total}</span>`;
}

// Badges de rol: una persona puede ser cliente (préstamos), inversor (captaciones),
// ambos, o todavía ninguno (recién dada de alta).
function rolBadges(c) {
  const badges = [];
  if (c.tiene_prestamos)   badges.push('<span class="badge" style="background:#d5f5e3;color:#1b7a3d;font-size:.72rem">Cliente</span>');
  if (c.tiene_captaciones) badges.push('<span class="badge" style="background:#d6eaf8;color:#2980b9;font-size:.72rem">Inversor</span>');
  if (badges.length === 0) return '<span style="color:#bbb;font-size:.78rem">Sin operaciones</span>';
  return `<span style="display:inline-flex;gap:.3rem;flex-wrap:wrap">${badges.join('')}</span>`;
}

// Formato compacto de pesos para los resúmenes por socio.
function fmtArs(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

// Resumen operativo de un socio para la lista: una línea por rol con operaciones
// vivas, mostrando la cantidad y el capital pendiente (a cobrar / a devolver).
// Los importes vienen calculados por el backend (GET /clientes), misma definición
// que el dashboard: capital − amortizado sobre operaciones vivas.
function resumenOperativo(c) {
  const lineas = [];
  const presAct  = Number(c.prestamos_activos    || 0);
  const presPend = Number(c.prestamos_pendiente  || 0);
  const capAct   = Number(c.captaciones_activas   || 0);
  const capPend  = Number(c.captaciones_pendiente || 0);

  if (presAct > 0) {
    lineas.push(`<div style="display:flex;align-items:center;gap:.4rem;white-space:nowrap">
      <span style="width:7px;height:7px;border-radius:50%;background:#1b7a3d;flex-shrink:0"></span>
      <span style="font-size:.82rem;color:#555">${presAct} préstamo${presAct === 1 ? '' : 's'} · <strong style="color:#9a7b3f">${fmtArs(presPend)}</strong> a cobrar</span>
    </div>`);
  }
  if (capAct > 0) {
    lineas.push(`<div style="display:flex;align-items:center;gap:.4rem;white-space:nowrap">
      <span style="width:7px;height:7px;border-radius:50%;background:#2980b9;flex-shrink:0"></span>
      <span style="font-size:.82rem;color:#555">${capAct} captaci${capAct === 1 ? 'ón' : 'ones'} · <strong style="color:#2980b9">${fmtArs(capPend)}</strong> a devolver</span>
    </div>`);
  }
  if (lineas.length === 0) {
    return (c.tiene_prestamos || c.tiene_captaciones)
      ? '<span style="color:#aaa;font-size:.8rem">Sin operaciones activas</span>'
      : '<span style="color:#ccc;font-size:.8rem">—</span>';
  }
  return `<div style="display:flex;flex-direction:column;gap:.3rem">${lineas.join('')}</div>`;
}

async function renderClientes() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';
  const clientes = await api.get('/clientes').catch(() => []);

  const totClientes   = clientes.filter(c => c.tiene_prestamos).length;
  const totInversores = clientes.filter(c => c.tiene_captaciones).length;
  const totACobrar    = clientes.reduce((s, c) => s + Number(c.prestamos_pendiente   || 0), 0);
  const totADevolver  = clientes.reduce((s, c) => s + Number(c.captaciones_pendiente || 0), 0);

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Socios <span style="font-family:var(--font-mono);font-size:.8rem;font-weight:400;color:#999">(BP)</span></h2>
      <button class="btn-primary" onclick="renderClienteForm()">+ Nuevo socio</button>
    </div>
    <p style="color:#888;font-size:.85rem;margin:-.4rem 0 1rem;max-width:680px">
      Registro único de personas. Cada socio se carga una sola vez y puede usarse para un
      <strong>préstamo</strong> (como cliente) y/o para una <strong>captación</strong> (como inversor).
    </p>

    <div class="cards" style="margin-bottom:1.25rem">
      <div class="card">
        <div class="label">Socios</div>
        <div class="value">${clientes.length}</div>
        <div style="font-size:.72rem;color:#999;margin-top:.4rem">${totClientes} como cliente · ${totInversores} como inversor</div>
      </div>
      <div class="card">
        <div class="label">A cobrar — capital</div>
        <div class="value" style="color:#9a7b3f;font-size:1.4rem">${fmtArs(totACobrar)}</div>
        <div style="font-size:.72rem;color:#999;margin-top:.4rem">pendiente de clientes (préstamos)</div>
      </div>
      <div class="card">
        <div class="label">A devolver — capital</div>
        <div class="value" style="color:#2980b9;font-size:1.4rem">${fmtArs(totADevolver)}</div>
        <div style="font-size:.72rem;color:#999;margin-top:.4rem">pendiente a inversores (captaciones)</div>
      </div>
    </div>

    <div style="margin-bottom:.75rem">
      <input id="buscarCliente" type="text" placeholder="Buscar por nombre o DNI..."
        oninput="filtrarClientes(this.value)"
        style="width:100%;max-width:400px;padding:.5rem .75rem;border:1px solid #ddd;border-radius:6px;font-size:.95rem" />
    </div>
    <table>
      <thead>
        <tr>
          <th>Legajo</th>
          <th>Apellido y nombre</th>
          <th>DNI</th>
          <th>Teléfono</th>
          <th>Rol</th>
          <th>Operaciones</th>
          <th>Docs</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="tablaClientes">
        ${clientes.length === 0
          ? '<tr><td colspan="8" style="text-align:center;color:#999">Sin socios registrados</td></tr>'
          : clientes.map(c => `
            <tr>
              <td><span style="font-family:var(--font-mono);font-size:.85rem;color:#888">S-${String(c.id).padStart(4,'0')}</span></td>
              <td><strong>${esc(c.apellido)}, ${esc(c.nombre)}</strong></td>
              <td>${esc(c.dni)}</td>
              <td>${esc(c.telefono || '-')}</td>
              <td>${rolBadges(c)}</td>
              <td>${resumenOperativo(c)}</td>
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
  const [cliente, prestamos, captaciones] = await Promise.all([
    api.get(`/clientes/${id}`).catch(() => null),
    api.get(`/prestamos?id_cliente=${id}&incluir_archivados=true`).catch(() => []),
    api.get(`/captaciones?id_inversor=${id}&incluir_archivadas=true`).catch(() => [])
  ]);
  if (!cliente) { app.innerHTML = '<p class="msg-error">Socio no encontrado</p>'; return; }

  const docs = parseDocs(cliente.documentacion_presentada);
  const grupos = [...new Set(DOCS_REQUERIDOS.map(d => d.grupo))];
  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });

  const estadoBadge = estado => {
    if (estado === 'cancelado') return '<span class="badge badge-verde">Cancelado</span>';
    if (estado === 'mora')      return '<span class="badge badge-rojo">Mora</span>';
    if (estado === 'archivado') return '<span class="badge" style="background:#f0f0f0;color:#888">Archivado</span>';
    return '<span class="badge badge-verde">Activo</span>';
  };
  const estadoBadgeCap = estado => {
    if (estado === 'devuelta')  return '<span class="badge badge-verde">Devuelta</span>';
    if (estado === 'mora')      return '<span class="badge badge-rojo">Mora</span>';
    if (estado === 'archivada') return '<span class="badge" style="background:#f0f0f0;color:#888">Archivada</span>';
    return '<span class="badge badge-verde">Activa</span>';
  };

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>
        ${esc(cliente.apellido)}, ${esc(cliente.nombre)}
        <span style="font-family:var(--font-mono);font-size:.85rem;font-weight:400;color:#888;margin-left:.75rem">
          Legajo S-${String(cliente.id).padStart(4,'0')}
        </span>
      </h2>
      <div style="display:flex;gap:.5rem">
        <button class="btn-secondary" onclick="renderClienteForm(${cliente.id})">Editar</button>
        <button class="btn-secondary" onclick="renderClientes()">← Volver</button>
      </div>
    </div>

    <div style="display:flex;gap:.4rem;margin-bottom:1rem">
      ${rolBadges({ tiene_prestamos: prestamos.length > 0, tiene_captaciones: captaciones.length > 0 })}
    </div>

    <div class="cards" style="margin-bottom:1.5rem">
      <div class="card"><div class="label">DNI</div><div class="value" style="font-size:1.2rem">${esc(cliente.dni)}</div></div>
      <div class="card"><div class="label">CUIT</div><div class="value" style="font-size:1.2rem">${esc(cliente.cuit || '-')}</div></div>
      <div class="card"><div class="label">Teléfono</div><div class="value" style="font-size:1.2rem">${esc(cliente.telefono || '-')}</div></div>
      <div class="card"><div class="label">Email</div><div class="value" style="font-size:1rem">${esc(cliente.email || '-')}</div></div>
      <div class="card"><div class="label">Origen</div><div class="value" style="font-size:1.2rem">${esc(cliente.origen || '-')}</div></div>
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

      <!-- Contacto / bancarios / observaciones -->
      <div style="display:flex;flex-direction:column;gap:1.5rem">
        <div style="background:white;border-radius:8px;padding:1.2rem;box-shadow:0 1px 4px rgba(0,0,0,.06)">
          <h4 style="margin-bottom:.75rem;font-size:.9rem;text-transform:uppercase;letter-spacing:.05em;color:#666">Datos bancarios (devoluciones)</h4>
          <p style="font-size:.88rem;margin-bottom:.4rem"><strong>CBU:</strong> ${esc(cliente.banco_cbu || '—')}</p>
          <p style="font-size:.88rem;margin-bottom:.4rem"><strong>Alias:</strong> ${esc(cliente.banco_alias || '—')}</p>
          ${cliente.domicilio ? `<p style="font-size:.85rem;color:#555;margin-top:.6rem">📍 ${esc(cliente.domicilio)}</p>` : ''}
        </div>
        <div style="background:white;border-radius:8px;padding:1.2rem;box-shadow:0 1px 4px rgba(0,0,0,.06)">
          <h4 style="margin-bottom:.75rem;font-size:.9rem;text-transform:uppercase;letter-spacing:.05em;color:#666">Observaciones</h4>
          <p style="font-size:.9rem;color:#555;white-space:pre-wrap">${esc(cliente.observaciones || 'Sin observaciones.')}</p>
        </div>
      </div>
    </div>

    <!-- Legajos de préstamos (rol cliente) -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
      <h3>Préstamos <span style="font-size:.8rem;font-weight:400;color:#999">(como cliente)</span>${
        Number(cliente.prestamos_activos) > 0
          ? `<span style="font-size:.8rem;font-weight:400;color:#9a7b3f;margin-left:.55rem">· ${cliente.prestamos_activos} activo${Number(cliente.prestamos_activos) === 1 ? '' : 's'} · ${fmtArs(cliente.prestamos_pendiente)} a cobrar</span>`
          : ''
      }</h3>
      <button class="btn-primary" onclick="renderPrestamoForm(${cliente.id})">+ Nuevo préstamo</button>
    </div>
    ${prestamos.length === 0
      ? '<p style="color:#999;margin-bottom:2rem">Sin préstamos registrados.</p>'
      : `<table style="margin-bottom:2rem">
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

    <!-- Captaciones (rol inversor) -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
      <h3>Captaciones <span style="font-size:.8rem;font-weight:400;color:#999">(como inversor)</span>${
        Number(cliente.captaciones_activas) > 0
          ? `<span style="font-size:.8rem;font-weight:400;color:#2980b9;margin-left:.55rem">· ${cliente.captaciones_activas} activa${Number(cliente.captaciones_activas) === 1 ? '' : 's'} · ${fmtArs(cliente.captaciones_pendiente)} a devolver</span>`
          : ''
      }</h3>
      <button class="btn-primary" onclick="renderCaptacionForm(${cliente.id})">+ Nueva captación</button>
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
                <td>${estadoBadgeCap(c.estado)}</td>
                <td><button class="btn-secondary" style="margin:0" onclick="renderCaptacionDetalle(${c.id})">Ver</button></td>
              </tr>`).join('')}
          </tbody>
        </table>`}
  `;
}

  window.filtrarClientes = (q) => {
    const term = q.toLowerCase().trim();
    document.querySelectorAll('#tablaClientes tr').forEach(tr => {
      tr.style.display = !term || tr.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  };


async function renderClienteForm(id = null) {
  const app = document.getElementById('app');
  const cliente = id ? await api.get(`/clientes/${id}`).catch(() => null) : null;
  const docsActuales = parseDocs(cliente?.documentacion_presentada);
  const grupos = [...new Set(DOCS_REQUERIDOS.map(d => d.grupo))];

  const origenActual = (cliente?.origen || '').trim();
  const origenMatch  = ORIGENES.find(o => o.toLowerCase() === origenActual.toLowerCase()) || '';
  const origenEsOtro = !!origenActual && !origenMatch;

  app.innerHTML = `
    <style>
      .doc-item { display:flex; align-items:center; gap:.6rem; cursor:pointer;
        padding:.55rem .7rem; margin-bottom:.4rem; border-radius:7px;
        border:1.5px solid #e3ddd0; background:#fff; transition:background .12s,border-color .12s; }
      .doc-item:hover { border-color:#bdb4a0; }
      .doc-item input[type=checkbox] {
        appearance:none; -webkit-appearance:none;
        width:22px; height:22px; margin:0; padding:0; flex-shrink:0; cursor:pointer;
        border:2px solid #b9b1a0; border-radius:5px; background:#fff;
        position:relative; transition:background .12s,border-color .12s; }
      .doc-item input[type=checkbox]:checked { background:#1b4332; border-color:#1b4332; }
      .doc-item input[type=checkbox]:checked::after {
        content:''; position:absolute; left:7px; top:3px;
        width:5px; height:10px; border:solid #fff; border-width:0 3px 3px 0;
        transform:rotate(45deg); }
      .doc-item .doc-texto { font-size:.88rem; color:#555; }
      .doc-item .doc-ok { display:none; margin-left:auto; font-size:.72rem; font-weight:700;
        color:#1b4332; background:#cfe7d6; padding:.14rem .55rem; border-radius:10px; white-space:nowrap; }
      .doc-item:has(input:checked) { background:#e7f2ea; border-color:#1b4332; }
      .doc-item:has(input:checked) .doc-texto { color:#1b4332; font-weight:600; }
      .doc-item:has(input:checked) .doc-ok { display:inline; }
    </style>
    <div class="seccion-titulo">
      <h2>
        ${id ? 'Editar socio' : 'Nuevo socio'}
        ${id ? `<span style="font-family:var(--font-mono);font-size:.82rem;font-weight:400;color:#888;margin-left:.75rem">Legajo S-${String(id).padStart(4,'0')}</span>` : ''}
      </h2>
      <button class="btn-secondary" onclick="${id ? `renderClienteDetalle(${id})` : 'renderClientes()'}">← Volver</button>
    </div>

    <div style="background:#eef4f0;border-left:3px solid #1b4332;padding:.65rem .85rem;border-radius:6px;font-size:.85rem;margin-bottom:1.25rem;max-width:760px">
      <strong>Registro único:</strong> cargá la persona una sola vez. Después podés usarla para un
      <strong>préstamo</strong> (rol cliente) y/o una <strong>captación</strong> (rol inversor).
      Los datos bancarios y la documentación de inversor son opcionales y solo hacen falta si va a aportar capital.
    </div>

    <form id="formCliente">
      <div class="form-group"><label>Nombre *</label><input name="nombre" value="${esc(cliente?.nombre || '')}" required /></div>
      <div class="form-group"><label>Apellido *</label><input name="apellido" value="${esc(cliente?.apellido || '')}" required /></div>
      <div class="form-group"><label>DNI * (requerido UIF)</label><input name="dni" value="${esc(cliente?.dni || '')}" required /></div>
      <div class="form-group"><label>CUIT (requerido UIF)</label><input name="cuit" value="${esc(cliente?.cuit || '')}" placeholder="20-12345678-9" /></div>
      <div class="form-group"><label>Teléfono</label><input name="telefono" value="${esc(cliente?.telefono || '')}" /></div>
      <div class="form-group"><label>Email</label><input name="email" type="email" value="${esc(cliente?.email || '')}" /></div>
      <div class="form-group">
        <label>Origen / Referido</label>
        <select name="origen_select" id="origenSelect" onchange="window.toggleOrigenOtro()">
          <option value="">Seleccionar...</option>
          ${ORIGENES.map(o => `<option value="${o}" ${origenMatch === o ? 'selected' : ''}>${o}</option>`).join('')}
          <option value="__otro__" ${origenEsOtro ? 'selected' : ''}>Otro (especificar)…</option>
        </select>
        <input type="text" name="origen_otro" id="origenOtro" placeholder="Especificar origen"
          value="${origenEsOtro ? origenActual : ''}"
          style="margin-top:.5rem;display:${origenEsOtro ? 'block' : 'none'}" />
      </div>
      <div class="form-group"><label>Domicilio</label><input name="domicilio" value="${esc(cliente?.domicilio || '')}" /></div>

      <h4 style="margin-top:1.5rem;margin-bottom:.5rem;color:#2980b9;font-size:1rem">Datos bancarios — para devoluciones si actúa como inversor</h4>
      <div class="form-group"><label>CBU</label><input name="banco_cbu" value="${esc(cliente?.banco_cbu || '')}" placeholder="22 dígitos" /></div>
      <div class="form-group"><label>Alias</label><input name="banco_alias" value="${esc(cliente?.banco_alias || '')}" placeholder="ej: juan.perez.mp" /></div>

      <div class="form-group"><label>Observaciones</label><textarea name="observaciones">${esc(cliente?.observaciones || '')}</textarea></div>

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
                <label class="doc-item">
                  <input type="checkbox" name="doc_${doc.id}" value="${doc.id}"
                    ${docsActuales.includes(doc.id) ? 'checked' : ''} />
                  <span class="doc-texto">${doc.label}</span>
                  <span class="doc-ok">✓ PRESENTADO</span>
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

  // Campo libre cuando el origen es "Otro"
  window.toggleOrigenOtro = () => {
    const sel  = document.getElementById('origenSelect');
    const otro = document.getElementById('origenOtro');
    if (!sel || !otro) return;
    const esOtro = sel.value === '__otro__';
    otro.style.display = esOtro ? 'block' : 'none';
    if (esOtro) otro.focus();
  };

  document.getElementById('formCliente').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const docsSeleccionados = DOCS_REQUERIDOS
      .filter(doc => fd[`doc_${doc.id}`])
      .map(doc => doc.id);
    Object.keys(fd).filter(k => k.startsWith('doc_')).forEach(k => delete fd[k]);
    fd.documentacion_presentada = docsSeleccionados;

    // Resolver origen (desplegable + opción "Otro")
    fd.origen = fd.origen_select === '__otro__'
      ? (fd.origen_otro || '').trim()
      : (fd.origen_select || '');
    delete fd.origen_select;
    delete fd.origen_otro;

    const msg = document.getElementById('formMsg');
    try {
      if (id) await api.put(`/clientes/${id}`, fd);
      else await api.post('/clientes', fd);
      id ? renderClienteDetalle(id) : renderClientes();
    } catch (err) {
      if (err._auth) return;
      msg.innerHTML = `<span class="msg-error">${err.message}</span>`;
    }
  });
}

async function verPerfilCliente(id) {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';

  const [cliente, todosPrestamos] = await Promise.all([
    api.get('/clientes/' + id).catch(() => null),
    api.get('/prestamos?id_cliente=' + id).catch(() => [])
  ]);

  if (!cliente) { app.innerHTML = '<p class="msg-error">Cliente no encontrado.</p>'; return; }

  const fmt = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const semaforo = p => {
    if (p.estado === 'cancelado') return '<span class="badge badge-verde">Cancelado</span>';
    if (p.estado === 'mora')      return '<span class="badge badge-rojo">Mora</span>';
    if (p.estado === 'archivado') return '<span class="badge" style="background:#f0f0f0;color:#888">Archivado</span>';
    return '<span class="badge badge-verde">Activo</span>';
  };

  const totalPrestado = todosPrestamos.reduce((s, p) => s + parseFloat(p.monto_capital), 0);
  const activos       = todosPrestamos.filter(p => p.estado === 'activo' || p.estado === 'mora').length;

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>${esc(cliente.apellido)}, ${esc(cliente.nombre)}</h2>
      <div style="display:flex;gap:.5rem">
        <button class="btn-secondary" onclick="renderClienteForm(${id})">Editar</button>
        <button class="btn-secondary" onclick="renderClientes()">← Volver</button>
      </div>
    </div>

    <div class="cards" style="margin-bottom:1.5rem">
      <div class="card"><div class="label">DNI</div><div class="value" style="font-size:1.2rem">${esc(cliente.dni)}</div></div>
      <div class="card"><div class="label">CUIT</div><div class="value" style="font-size:1.2rem">${esc(cliente.cuit || '—')}</div></div>
      <div class="card"><div class="label">Teléfono</div><div class="value" style="font-size:1.2rem">${esc(cliente.telefono || '—')}</div></div>
      <div class="card"><div class="label">Préstamos activos</div><div class="value">${activos}</div></div>
      <div class="card"><div class="label">Total prestado</div><div class="value" style="font-size:1.1rem">$${fmt(totalPrestado)}</div></div>
    </div>

    ${cliente.domicilio ? '<p style="margin-bottom:1.25rem;font-size:.9rem;color:var(--ink-2)">📍 ' + cliente.domicilio + '</p>' : ''}
    ${cliente.observaciones ? '<p style="margin-bottom:1.25rem;font-size:.85rem;color:var(--ink-3);font-style:italic">' + cliente.observaciones + '</p>' : ''}

    <div class="seccion-titulo" style="margin-bottom:.75rem">
      <h3>Historial de préstamos (${todosPrestamos.length})</h3>
      <button class="btn-primary" onclick="renderPrestamoForm(${id})">+ Nuevo préstamo</button>
    </div>

    ${todosPrestamos.length === 0 ? '<p style="color:var(--ink-3)">Sin préstamos registrados.</p>' : `
    <table>
      <thead>
        <tr><th>Legajo</th><th>Capital</th><th>Cuotas</th><th>1er Vcto</th><th>Estado</th><th></th></tr>
      </thead>
      <tbody>
        ${todosPrestamos.map(p => `
          <tr>
            <td style="font-family:var(--font-mono);font-size:.82rem;color:#888">P-${String(p.id).padStart(4,'0')}</td>
            <td>$${fmt(p.monto_capital)} ${p.moneda}</td>
            <td>${p.total_cuotas} ${p.periodicidad === 'semanal' ? 'sem.' : 'cuotas'}</td>
            <td>${String(p.primer_vencimiento).split('T')[0]}</td>
            <td>${semaforo(p)}</td>
            <td><button class="btn-secondary" style="margin:0" onclick="renderPrestamoDetalle(${p.id})">Ver</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`}
  `;
}
