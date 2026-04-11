const express = require('express');
const router = express.Router();
const { calcularProyeccion } = require('../services/motorCuotas');

router.post('/', (req, res) => {
  const { monto_capital, tasa_interes_mensual, total_cuotas } = req.body;
  if (!monto_capital || !tasa_interes_mensual || !total_cuotas) {
    return res.status(400).json({ error: 'monto_capital, tasa_interes_mensual y total_cuotas son requeridos' });
  }
  const tabla = calcularProyeccion({
    montoCapital: parseFloat(monto_capital),
    tasaMensual: parseFloat(tasa_interes_mensual),
    totalCuotas: parseInt(total_cuotas),
  });
  const total_intereses = parseFloat(tabla.reduce((s, c) => s + c.interes, 0).toFixed(2));
  res.json({ tabla, total_intereses });
});

module.exports = router;
