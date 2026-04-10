const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financiera',
  user: process.env.DB_USER || 'financiera_user',
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Error inesperado en pool PostgreSQL:', err);
});

module.exports = pool;
