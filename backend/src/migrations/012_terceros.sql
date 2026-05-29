-- =============================================================================
-- Migración 012 — Módulo de plata de terceros (inversores)
--
-- Espejo simétrico del modelo existente:
--   clientes   →  inversores       (de quién recibís capital)
--   prestamos  →  captaciones      (capital recibido para devolver)
--   pagos      →  devoluciones     (lo que vos devolvés al inversor)
--
-- IMPORTANTE: Por cada captación debe existir un contrato de mutuo firmado
-- en formato físico/notarial. El sistema solo lleva la trazabilidad operativa.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- INVERSORES — personas que aportan capital
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inversores (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  dni             VARCHAR(20)  NOT NULL UNIQUE,
  cuit            VARCHAR(20),
  telefono        VARCHAR(30),
  email           VARCHAR(120),
  domicilio       TEXT,
  banco_cbu       VARCHAR(30),
  banco_alias     VARCHAR(50),
  origen          VARCHAR(100),
  observaciones   TEXT,
  documentacion_presentada JSONB NOT NULL DEFAULT '[]'::jsonb,
  fecha_alta      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inversores_dni ON inversores(dni);

-- ----------------------------------------------------------------------------
-- CAPTACIONES — capital recibido de un inversor, a devolver en cuotas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS captaciones (
  id                     SERIAL PRIMARY KEY,
  id_inversor            INTEGER       NOT NULL REFERENCES inversores(id),
  fecha_aporte           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  moneda                 VARCHAR(3)    NOT NULL DEFAULT 'ARS'
                           CHECK (moneda IN ('ARS','USD')),
  monto_capital          NUMERIC(14,2) NOT NULL,
  tasa_interes_mensual   NUMERIC(6,4)  NOT NULL,    -- se interpreta como semanal si periodicidad='semanal'
  periodicidad           VARCHAR(10)   NOT NULL DEFAULT 'mensual'
                           CHECK (periodicidad IN ('mensual','semanal')),
  total_cuotas           INTEGER       NOT NULL,
  valor_cuota_base       NUMERIC(14,2) NOT NULL,
  primer_vencimiento     DATE          NOT NULL,
  tipo_amortizacion      VARCHAR(10)   NOT NULL DEFAULT 'flat'
                           CHECK (tipo_amortizacion IN ('flat','frances','aleman')),
  tipo                   VARCHAR(20)   NOT NULL DEFAULT 'plazo_fijo'
                           CHECK (tipo IN ('plazo_fijo','renovable','a_la_vista')),
  nro_contrato_mutuo     VARCHAR(40),  -- referencia al contrato físico
  nro_pagare             VARCHAR(40),  -- referencia al pagaré
  estado                 VARCHAR(20)   NOT NULL DEFAULT 'activa'
                           CHECK (estado IN ('activa','devuelta','mora','archivada')),
  observaciones          TEXT,
  creado_por_id          INTEGER REFERENCES usuarios(id),
  creado_por_nombre      VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_captaciones_inversor ON captaciones(id_inversor);
CREATE INDEX IF NOT EXISTS idx_captaciones_estado   ON captaciones(estado);

-- ----------------------------------------------------------------------------
-- DEVOLUCIONES — pagos hechos al inversor por una captación
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devoluciones (
  id                          SERIAL PRIMARY KEY,
  id_captacion                INTEGER       NOT NULL REFERENCES captaciones(id),
  fecha_pago_real             DATE          NOT NULL DEFAULT NOW(),
  monto_pagado                NUMERIC(14,2) NOT NULL,
  tipo_pago                   VARCHAR(30)   NOT NULL
                                CHECK (tipo_pago IN ('cuota_completa','solo_interes','adelanto_parcial')),
  capital_amortizado          NUMERIC(14,2) NOT NULL,
  interes_pagado              NUMERIC(14,2) NOT NULL,
  saldo_capital_post_pago     NUMERIC(14,2) NOT NULL,
  cuotas_restantes_post_pago  INTEGER       NOT NULL,
  observaciones               TEXT,
  fecha_registro              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  forma_pago                  VARCHAR(30)   NOT NULL DEFAULT 'transferencia'
                                CHECK (forma_pago IN ('efectivo','transferencia','cheque','debito','otro')),
  creado_por_id               INTEGER REFERENCES usuarios(id),
  creado_por_nombre           VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_devoluciones_captacion ON devoluciones(id_captacion);
