-- ============================================================
-- 00_fix_collation.sql
-- Estandariza TODA la base de datos a utf8mb4_unicode_ci
-- Ejecutar UNA SOLA VEZ sobre una instalacion existente.
-- Si el proyecto se instala desde cero (01_schema.sql en adelante)
-- este script NO es necesario porque las tablas ya se crean con
-- la collation correcta.
-- ============================================================

USE banco_ddd;

-- 1. Estandarizar la base de datos
ALTER DATABASE banco_ddd
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 2. Convertir todas las tablas (convierte tambien cada columna VARCHAR/TEXT)
ALTER TABLE cat_rol                       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cat_estado_usuario            CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cat_tipo_cuenta               CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cat_moneda                    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cat_estado_cuenta             CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cat_tipo_prestamo             CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cat_estado_prestamo           CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cat_estado_transferencia      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cat_categoria_producto        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cat_estado_lote               CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE usuario                       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cliente_persona_natural       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cliente_empresa               CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cuenta_bancaria               CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE prestamo                      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE prestamo_transicion_estado    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE transferencia                 CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE transferencia_transicion_estado CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE config_umbral_transferencia   CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE bitacora_cola                 CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE producto_bancario             CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE lote_transferencia            CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE detalle_lote_transferencia    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Verificar que no quede ninguna columna con collation distinta
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CHARACTER_SET_NAME,
    COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA   = 'banco_ddd'
  AND COLLATION_NAME != 'utf8mb4_unicode_ci'
  AND COLLATION_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
-- Si esta consulta devuelve 0 filas, la estandarizacion fue exitosa.

SELECT 'Collation estandarizada a utf8mb4_unicode_ci en todas las tablas.' AS resultado;
