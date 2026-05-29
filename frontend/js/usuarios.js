async function renderUsuarios() {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Cargando...</p>';

  let usuarios = [];
  try {
    usuarios = await api.get('/usuarios');
  } catch (err) {
    if (err._auth) return;
    app.innerHTML = `<p class="msg-error">Error: ${err.message}</p>`;
    return;
  }

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>Usuarios</h2>
      <button class="btn-primary" onclick="renderUsuarioForm()">+ Nuevo usuario</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Usuario</th>
          <th>Nombre</th>
          <th>Estado</th>
          <th>Alta</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${usuarios.map(u => `
          <tr>
            <td class="mono">${u.id}</td>
            <td><strong>${esc(u.username)}</strong></td>
            <td>${esc(u.nombre_completo || '—')}</td>
            <td>
              ${u.activo
                ? '<span class="badge badge-verde">Activo</span>'
                : '<span class="badge badge-rojo">Inactivo</span>'}
            </td>
            <td>${new Date(u.created_at).toLocaleDateString('es-AR')}</td>
            <td style="display:flex;gap:.4rem;flex-wrap:wrap">
              <button class="btn-secondary" style="margin:0" onclick="renderUsuarioForm(${u.id})">Editar</button>
              <button class="btn-secondary" style="margin:0;color:var(--${u.activo ? 'rojo' : 'verde'})"
                onclick="toggleUsuario(${u.id}, ${u.activo})">
                ${u.activo ? 'Desactivar' : 'Activar'}
              </button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>

    <div style="background:var(--gold-light);border:1px solid #e8d5a0;border-radius:var(--radius);padding:.85rem 1.1rem;font-size:.85rem;color:var(--ink-2);max-width:520px">
      <strong>ℹ️ Info:</strong> Desactivar un usuario le impide iniciar sesión pero no borra sus registros históricos.
    </div>
  `;
}

async function renderUsuarioForm(id = null) {
  const app = document.getElementById('app');
  let usuario = null;
  if (id) {
    try {
      const lista = await api.get('/usuarios');
      usuario = lista.find(u => u.id === id) || null;
    } catch (err) { if (err._auth) return; }
  }

  const titulo = id ? `Editar usuario — ${esc(usuario?.username || '')}` : 'Nuevo usuario';

  app.innerHTML = `
    <div class="seccion-titulo">
      <h2>${titulo}</h2>
      <button class="btn-secondary" onclick="renderUsuarios()">← Volver</button>
    </div>

    <form id="formUsuario">
      <div class="form-group">
        <label>Usuario *</label>
        <input name="username" value="${esc(usuario?.username || '')}" ${id ? 'readonly style="background:var(--bg);color:var(--ink-3)"' : 'required'} placeholder="Ej: kike" />
        ${id ? '<small>El nombre de usuario no se puede cambiar.</small>' : ''}
      </div>
      <div class="form-group">
        <label>Nombre para mostrar</label>
        <input name="nombre_completo" value="${esc(usuario?.nombre_completo || '')}" placeholder="Ej: Melania" />
      </div>
      <div class="form-group">
        <label>${id ? 'Nueva contraseña' : 'Contraseña *'}</label>
        <input name="password" type="password" ${id ? 'placeholder="Dejar vacío para no cambiar"' : 'required placeholder="Mínimo 6 caracteres"'} autocomplete="new-password" />
        ${id ? '<small>Solo completar si querés cambiarla.</small>' : ''}
      </div>
      ${id ? `
      <div class="form-group">
        <label>Estado</label>
        <select name="activo">
          <option value="true" ${usuario?.activo ? 'selected' : ''}>Activo</option>
          <option value="false" ${!usuario?.activo ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>` : ''}

      <div style="display:flex;gap:.6rem;margin-top:1.25rem;flex-wrap:wrap">
        <button type="submit" class="btn-primary">Guardar</button>
        <button type="button" class="btn-secondary" onclick="renderUsuarios()">Cancelar</button>
      </div>
      <div id="formMsg" style="margin-top:.75rem"></div>
    </form>
  `;

  document.getElementById('formUsuario').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const msg = document.getElementById('formMsg');

    // Limpiar campos vacíos
    if (!fd.password) delete fd.password;
    if (id) {
      delete fd.username;
      fd.activo = fd.activo === 'true';
    }

    try {
      if (id) {
        await api.put(`/usuarios/${id}`, fd);
        msg.innerHTML = '<span class="msg-ok">✓ Usuario actualizado.</span>';
        setTimeout(() => renderUsuarios(), 1200);
      } else {
        await api.post('/usuarios', fd);
        msg.innerHTML = '<span class="msg-ok">✓ Usuario creado correctamente.</span>';
        setTimeout(() => renderUsuarios(), 1200);
      }
    } catch (err) {
      if (err._auth) return;
      msg.innerHTML = `<span class="msg-error">${err.message}</span>`;
    }
  });
}

async function toggleUsuario(id, estadoActual) {
  const accion = estadoActual ? 'desactivar' : 'activar';
  if (!confirm(`¿Querés ${accion} este usuario?`)) return;
  try {
    await api.put(`/usuarios/${id}`, { activo: !estadoActual });
    renderUsuarios();
  } catch (err) {
    if (err._auth) return;
    alert('Error: ' + err.message);
  }
}
