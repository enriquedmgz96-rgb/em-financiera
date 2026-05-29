// === XSS protection helpers (cargados antes que cualquier renderer) ===
// esc(v):    para interpolar texto/atributos en HTML — escapa &<>"'
// escJs(v):  para interpolar valores en strings JS de onclick="foo('${escJs(x)}')"
function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escJs(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\u003c');
}
window.esc = esc;
window.escJs = escJs;

const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('em_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('em_token');
    localStorage.removeItem('em_user');
    mostrarLogin();
    const authErr = new Error('Sesión expirada — iniciá sesión nuevamente');
    authErr._auth = true;
    throw authErr;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
  return data;
}

const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST',   body }),
  put:    (path, body) => apiFetch(path, { method: 'PUT',    body }),
  delete: (path)       => apiFetch(path, { method: 'DELETE' }),
};
