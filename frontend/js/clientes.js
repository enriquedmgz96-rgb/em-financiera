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
      <thead><tr><th>Apellido y nombre</th><th>DNI</th><th>CUIT</th><th>Teléfono</th><th>Origen</th><th></th></tr></thead>
      <tbody>
        ${clientes.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999">Sin clientes registrados</td></tr>' :
          clientes.map(c => `
            <tr>
              <td>${c.apellido}, ${c.nombre}</td>
              <td>${c.dni}</td>
              <td>${c.cuit || '-'}</td>
              <td>${c.telefono || '-'}</td>
              <td>${c.origen || '-'}</td>
              <td><button class="btn-secondary" style="margin:0" onclick="renderClienteForm(${c.id})">Editar</button></td>
            </tr>`).join('')}
      </tbody>
    </table>
  `;
}

async function renderClienteForm(id = null) {
  const app = document.getElementById('app');
  const cliente = id ? await api.get(`/clientes/${id}`).catch(() => null) : null;

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>${id ? 'Editar cliente' : 'Nuevo cliente'}</h2>
      <button class="btn-secondary" onclick="renderClientes()">← Volver</button>
    </div>
    <form id="formCliente">
      <div class="form-group"><label>Nombre *</label><input name="nombre" value="${cliente?.nombre || ''}" required /></div>
      <div class="form-group"><label>Apellido *</label><input name="apellido" value="${cliente?.apellido || ''}" required /></div>
      <div class="form-group"><label>DNI * (requerido UIF)</label><input name="dni" value="${cliente?.dni || ''}" required /></div>
      <div class="form-group"><label>CUIT (requerido UIF)</label><input name="cuit" value="${cliente?.cuit || ''}" placeholder="20-12345678-9" /></div>
      <div class="form-group"><label>Teléfono</label><input name="telefono" value="${cliente?.telefono || ''}" /></div>
      <div class="form-group"><label>Origen / Referido</label><input name="origen" value="${cliente?.origen || ''}" /></div>
      <div class="form-group"><label>Observaciones</label><textarea name="observaciones">${cliente?.observaciones || ''}</textarea></div>
      <button type="submit" class="btn-primary">Guardar</button>
      <button type="button" class="btn-secondary" onclick="renderClientes()">Cancelar</button>
      <div id="formMsg"></div>
    </form>
  `;

  document.getElementById('formCliente').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const msg = document.getElementById('formMsg');
    try {
      if (id) await api.put(`/clientes/${id}`, fd);
      else await api.post('/clientes', fd);
      renderClientes();
    } catch (err) {
      msg.innerHTML = `<span class="msg-error">${err.message}</span>`;
    }
  });
}
