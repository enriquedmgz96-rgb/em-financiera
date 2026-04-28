-- Agrega columna para registrar documentación presentada por el cliente
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS documentacion_presentada TEXT DEFAULT '[]';
