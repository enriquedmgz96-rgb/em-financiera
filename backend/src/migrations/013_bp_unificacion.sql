-- =============================================================================
-- Migración 013 — Unificación de clientes e inversores en un registro único (BP)
--
-- Una persona (BP / socio de negocio) se crea UNA sola vez y puede actuar como
-- cliente (préstamos) y/o como inversor (captaciones).
--
-- Estrategia ADITIVA y REVERSIBLE (la corre el wrapper dentro de una sola
-- transacción; no incluir BEGIN/COMMIT acá):
--   * `clientes` pasa a ser el registro único de personas (ya tiene la FK de
--     prestamos.id_cliente). Se le agregan los campos propios de inversor.
--   * Las filas de `inversores` se fusionan en `clientes`, deduplicando por DNI:
--       - si el DNI ya existe como cliente -> es la misma persona (se completan
--         los datos de inversor que falten);
--       - si no existe -> se inserta como persona nueva.
--   * `captaciones.id_inversor` se reapunta al id de la persona en `clientes`.
--   * `inversores` se renombra a `inversores_legacy` (NO se borra: respaldo).
--   * Tablas `_bp_*` de auditoría permiten revertir si hiciera falta.
-- =============================================================================

-- 1) Campos de inversor en el registro de personas (idempotente: cubre el drift)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS domicilio   TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email       VARCHAR(120);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS banco_cbu   VARCHAR(30);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS banco_alias VARCHAR(50);

-- 2) Mapeo old inversor.id -> persona (clientes.id)
CREATE TABLE IF NOT EXISTS _bp_map_inversor (
  old_inversor_id INTEGER PRIMARY KEY,
  persona_id      INTEGER NOT NULL,
  era_nuevo       BOOLEAN NOT NULL
);

-- 2a) Inversores que YA existían como cliente (mismo DNI) -> misma persona
INSERT INTO _bp_map_inversor (old_inversor_id, persona_id, era_nuevo)
SELECT i.id, c.id, FALSE
FROM inversores i
JOIN clientes c ON c.dni = i.dni
ON CONFLICT (old_inversor_id) DO NOTHING;

-- 2b) Inversores nuevos -> se insertan como personas nuevas
WITH nuevos AS (
  INSERT INTO clientes
    (nombre, apellido, dni, cuit, telefono, email, domicilio,
     banco_cbu, banco_alias, origen, observaciones, documentacion_presentada, fecha_alta)
  SELECT i.nombre, i.apellido, i.dni, i.cuit, i.telefono, i.email, i.domicilio,
         i.banco_cbu, i.banco_alias, i.origen, i.observaciones,
         i.documentacion_presentada::text, i.fecha_alta
  FROM inversores i
  WHERE NOT EXISTS (SELECT 1 FROM clientes c WHERE c.dni = i.dni)
  RETURNING id, dni
)
INSERT INTO _bp_map_inversor (old_inversor_id, persona_id, era_nuevo)
SELECT i.id, n.id, TRUE
FROM inversores i
JOIN nuevos n ON n.dni = i.dni
ON CONFLICT (old_inversor_id) DO NOTHING;

-- 2c) Completar datos de inversor en personas que YA existían (no pisa lo cargado)
UPDATE clientes c
SET email       = COALESCE(c.email, i.email),
    domicilio   = COALESCE(c.domicilio, i.domicilio),
    banco_cbu   = COALESCE(c.banco_cbu, i.banco_cbu),
    banco_alias = COALESCE(c.banco_alias, i.banco_alias),
    cuit        = COALESCE(c.cuit, i.cuit),
    telefono    = COALESCE(c.telefono, i.telefono),
    origen      = COALESCE(c.origen, i.origen)
FROM inversores i
JOIN _bp_map_inversor m ON m.old_inversor_id = i.id AND m.era_nuevo = FALSE
WHERE c.id = m.persona_id;

-- 3) Reapuntar captaciones al registro unificado (clientes)
-- 3a) Respaldo de los id_inversor actuales (para poder revertir)
CREATE TABLE IF NOT EXISTS _bp_backup_captaciones AS
SELECT id, id_inversor AS old_id_inversor FROM captaciones;

-- 3b) Quitar la FK vieja hacia inversores
ALTER TABLE captaciones DROP CONSTRAINT IF EXISTS captaciones_id_inversor_fkey;

-- 3c) Remapear id_inversor: ahora apunta a clientes(id)
UPDATE captaciones cap
SET id_inversor = m.persona_id
FROM _bp_map_inversor m
WHERE cap.id_inversor = m.old_inversor_id;

-- 3d) Nueva FK hacia clientes
ALTER TABLE captaciones
  ADD CONSTRAINT captaciones_id_inversor_fkey
  FOREIGN KEY (id_inversor) REFERENCES clientes(id);

-- 4) Conservar la tabla inversores como respaldo (NO se borra)
ALTER TABLE inversores RENAME TO inversores_legacy;
