/**
 * Crea los usuarios iniciales del sistema.
 * Ejecutar UNA VEZ después de las migraciones:
 *   node scripts/seed-usuarios.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db/connection');

const USUARIOS = [
  { username: 'kike', nombre_completo: 'Enrique',  password: 'P$.2026' },
  { username: 'Meli', nombre_completo: 'Melania',  password: 'P$.2026' },
];

async function seed() {
  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO usuarios (username, password_hash, nombre_completo)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET
         password_hash   = EXCLUDED.password_hash,
         nombre_completo = EXCLUDED.nombre_completo`,
      [u.username, hash, u.nombre_completo]
    );
    console.log(`✓ Usuario '${u.username}' (${u.nombre_completo}) listo.`);
  }
  console.log('Seed completado.');
  await pool.end();
}

seed().catch(err => { console.error('Error:', err.message); process.exit(1); });
