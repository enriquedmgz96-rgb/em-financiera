require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./connection');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const version = file.replace('.sql', '');
      const { rows } = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );
      if (rows.length > 0) {
        console.log(`✓ Ya aplicada: ${version}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      // ON CONFLICT DO NOTHING permite que el SQL de la migración pueda
      // auto-registrarse (con su propio INSERT) sin chocar con el wrapper.
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
        [version]
      );
      await client.query('COMMIT');
      console.log(`✓ Migración aplicada: ${version}`);
    }

    console.log('Migraciones completadas.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en migración:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
