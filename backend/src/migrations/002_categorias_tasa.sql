CREATE TABLE IF NOT EXISTS categorias_tasa (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  tasa_mensual DECIMAL(8,4) NOT NULL CHECK (tasa_mensual > 0),
  color       VARCHAR(20) NOT NULL DEFAULT 'azul',
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Categorías iniciales
INSERT INTO categorias_tasa (nombre, tasa_mensual, color) VALUES
  ('Estándar',    7.5,  'verde'),
  ('Riesgo medio', 9.0,  'amarillo'),
  ('Alto riesgo', 12.0, 'rojo')
ON CONFLICT DO NOTHING;
