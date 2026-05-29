require('dotenv').config();

// Fail-fast: el JWT_SECRET es obligatorio. Sin él no arrancamos.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('FATAL: JWT_SECRET no configurado o demasiado corto (mín. 16 chars).');
  console.error('Setealo en /opt/financiera/.env antes de arrancar el server.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');

const authRouter        = require('./routes/auth');
const clientesRouter    = require('./routes/clientes');
const prestamosRouter   = require('./routes/prestamos');
const pagosRouter       = require('./routes/pagos');
const dashboardRouter   = require('./routes/dashboard');
const calculadoraRouter = require('./routes/calculadora');
const tasasRouter       = require('./routes/tasas');
const mantenimientoRouter = require('./routes/mantenimiento');
const categoriasRouter  = require('./routes/categorias');
const usuariosRouter    = require('./routes/usuarios');
const inversoresRouter    = require('./routes/inversores');
const captacionesRouter   = require('./routes/captaciones');
const devolucionesRouter  = require('./routes/devoluciones');
const authMiddleware    = require('./middleware/authMiddleware');
const adminOnly         = require('./middleware/adminOnly');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta pública — login (sin middleware)
app.use('/api/auth', authRouter);

// Todas las demás rutas requieren token válido
app.use('/api', authMiddleware);

app.use('/api/clientes',      clientesRouter);
app.use('/api/prestamos',     prestamosRouter);
app.use('/api/pagos',         pagosRouter);
app.use('/api/dashboard',     dashboardRouter);
app.use('/api/calcular',      calculadoraRouter);
app.use('/api/tasas',         tasasRouter);
app.use('/api/mantenimiento', mantenimientoRouter);
app.use('/api/categorias',    categoriasRouter);
app.use('/api/usuarios',      adminOnly, usuariosRouter); // gating por admin
// Módulo plata de terceros
app.use('/api/inversores',    inversoresRouter);
app.use('/api/captaciones',   captacionesRouter);
app.use('/api/devoluciones',  devolucionesRouter);

app.use((err, req, res, next) => {
  console.error('[' + new Date().toISOString() + ']', err.stack || err);
  // No filtrar internals del backend al cliente
  res.status(err.status || 500).json({
    error: err.expose ? err.message : 'Error interno del servidor',
  });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`EM-Financiera API corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
