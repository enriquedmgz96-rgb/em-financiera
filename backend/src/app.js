require('dotenv').config();
const express = require('express');
const cors = require('cors');

const clientesRouter = require('./routes/clientes');
const prestamosRouter = require('./routes/prestamos');
const pagosRouter = require('./routes/pagos');
const dashboardRouter = require('./routes/dashboard');
const calculadoraRouter = require('./routes/calculadora');
const tasasRouter = require('./routes/tasas');
const mantenimientoRouter = require('./routes/mantenimiento');
const categoriasRouter = require('./routes/categorias');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/clientes', clientesRouter);
app.use('/api/prestamos', prestamosRouter);
app.use('/api/pagos', pagosRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/calcular', calculadoraRouter);
app.use('/api/tasas', tasasRouter);
app.use('/api/mantenimiento', mantenimientoRouter);
app.use('/api/categorias', categoriasRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`EM-Financiera API corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
