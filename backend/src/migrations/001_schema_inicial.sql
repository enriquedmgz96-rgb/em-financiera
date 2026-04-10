-- Extensión para timestamps con timezone
SET timezone = 'America/Argentina/Cordoba';

CREATE TABLE IF NOT EXISTS clientes (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  apellido      VARCHAR(100) NOT NULL,
  dni           VARCHAR(20)  NOT NULL UNIQUE,
  cuit          VARCHAR(20),
  telefono      VARCHAR(30),
  origen        VARCHAR(100),
  fecha_alta    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  observaciones TEXT
);

CREATE INDEX IF NOT EXISTS idx_clientes_dni ON clientes(dni);

CREATE TABLE IF NOT EXISTS prestamos (
  id                     SERIAL PRIMARY KEY,
  id_cliente             INTEGER      NOT NULL REFERENCES clientes(id),
  fecha                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  moneda                 VARCHAR(3)   NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  monto_capital          NUMERIC(14,2) NOT NULL,
  tasa_interes_mensual   NUMERIC(6,4)  NOT NULL,
  total_cuotas           INTEGER       NOT NULL,
  valor_cuota_base       NUMERIC(14,2) NOT NULL,
  primer_vencimiento     DATE          NOT NULL,
  estado                 VARCHAR(20)   NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','cancelado','mora')),
  pagare_firmado         BOOLEAN       NOT NULL DEFAULT FALSE,
  motivo                 VARCHAR(200),
  nombre_garantia        VARCHAR(200),
  telefono_garantia      VARCHAR(30),
  dni_garantia           VARCHAR(20),
  observaciones          TEXT
);

CREATE INDEX IF NOT EXISTS idx_prestamos_cliente ON prestamos(id_cliente);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado  ON prestamos(estado);

CREATE TABLE IF NOT EXISTS pagos (
  id                       SERIAL PRIMARY KEY,
  id_prestamo              INTEGER       NOT NULL REFERENCES prestamos(id),
  fecha_pago               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  monto_pagado             NUMERIC(14,2) NOT NULL,
  tipo_pago                VARCHAR(30)   NOT NULL CHECK (tipo_pago IN ('cuota_completa','solo_interes','adelanto_parcial')),
  capital_amortizado       NUMERIC(14,2) NOT NULL,
  interes_pagado           NUMERIC(14,2) NOT NULL,
  saldo_capital_post_pago  NUMERIC(14,2) NOT NULL,
  cuotas_restantes_post_pago INTEGER     NOT NULL,
  observaciones            TEXT
);

CREATE INDEX IF NOT EXISTS idx_pagos_prestamo ON pagos(id_prestamo);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maestro_tasas (
  id              SERIAL PRIMARY KEY,
  moneda          VARCHAR(3)    NOT NULL CHECK (moneda IN ('ARS','USD')),
  total_cuotas    INTEGER       NOT NULL,
  tasa_mensual    NUMERIC(6,4)  NOT NULL,
  tasa_total_pct  NUMERIC(8,4)  NOT NULL,
  activo          BOOLEAN       NOT NULL DEFAULT TRUE,
  UNIQUE(moneda, total_cuotas)
);

INSERT INTO maestro_tasas (moneda, total_cuotas, tasa_mensual, tasa_total_pct) VALUES
  ('ARS',  1, 7.5,   7.5),
  ('ARS',  2, 7.5,  15.0),
  ('ARS',  3, 7.5,  22.5),
  ('ARS',  4, 7.5,  30.0),
  ('ARS',  5, 7.5,  37.5),
  ('ARS',  6, 7.5,  45.0),
  ('ARS',  7, 7.5,  52.5),
  ('ARS',  8, 7.5,  60.0),
  ('ARS',  9, 7.5,  67.5),
  ('ARS', 10, 7.5,  75.0),
  ('ARS', 11, 7.5,  82.5),
  ('ARS', 12, 7.5,  90.0),
  ('ARS', 18, 7.5, 135.0)
ON CONFLICT (moneda, total_cuotas) DO NOTHING;
