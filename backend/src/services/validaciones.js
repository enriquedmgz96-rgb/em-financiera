function validarCUIT(cuit) {
  const limpio = cuit.replace(/[-\s]/g, '');
  if (!/^\d{11}$/.test(limpio)) {
    return { valido: false, mensaje: 'El CUIT debe tener 11 dígitos numéricos' };
  }
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digitos = limpio.split('').map(Number);
  const suma = pesos.reduce((acc, p, i) => acc + p * digitos[i], 0);
  const resto = suma % 11;
  let digitoVerif;
  if (resto === 0) digitoVerif = 0;
  else if (resto === 1) return { valido: false, mensaje: 'CUIT inválido (resto 1)' };
  else digitoVerif = 11 - resto;
  if (digitoVerif !== digitos[10]) {
    return { valido: false, mensaje: 'Dígito verificador de CUIT incorrecto' };
  }
  return { valido: true };
}

module.exports = { validarCUIT };
