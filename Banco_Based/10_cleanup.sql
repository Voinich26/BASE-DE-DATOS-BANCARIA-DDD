-- ============================================================
-- 10_cleanup.sql
-- Script de limpieza para eliminar datos de prueba y resetear auto_increment.
-- Ejecútelo después de 08_tests.sql para dejar la base lista para un nuevo run.
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- Eliminar registros de pruebas creados con identificadores 999* y cuentas de prueba.
DELETE FROM detalle_lote_transferencia
WHERE id_lote IN (
    SELECT id_lote FROM lote_transferencia
    WHERE cuenta_origen LIKE '999-%'
       OR nombre_lote LIKE '%Nomina%'
       OR nombre_lote LIKE '%Lote Con Error%'
);

DELETE FROM lote_transferencia
WHERE cuenta_origen LIKE '999-%'
   OR nombre_lote LIKE '%Nomina%'
   OR nombre_lote LIKE '%Lote Con Error%';

DELETE FROM transferencia
WHERE cuenta_origen LIKE '999-%'
   OR cuenta_destino LIKE '999-%'
   OR id_usuario_creador IN (
       SELECT id_usuario FROM usuario WHERE id_identificacion LIKE '999%'
   );

DELETE FROM prestamo
WHERE id_cliente_solicitante LIKE '999%'
   OR cuenta_destino_desembolso LIKE '999-%';

DELETE FROM bitacora_cola
WHERE id_producto_afectado LIKE '999%'
   OR id_usuario IN (
       SELECT id_usuario FROM usuario WHERE id_identificacion LIKE '999%'
   );

DELETE FROM cliente_persona_natural
WHERE id_identificacion LIKE '999%';

DELETE FROM cliente_empresa
WHERE nit LIKE '999%';

DELETE FROM cuenta_bancaria
WHERE numero_cuenta LIKE '999-%';

DELETE FROM usuario
WHERE id_identificacion LIKE '999%';

DROP PROCEDURE IF EXISTS sp_test_assert;

-- Reset auto_increment de tablas con datos de prueba eliminados.
SET @next_value = (SELECT COALESCE(MAX(id_usuario), 0) + 1 FROM usuario);
SET @sql = CONCAT('ALTER TABLE banco_ddd.usuario AUTO_INCREMENT=', @next_value);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @next_value = (SELECT COALESCE(MAX(id_prestamo), 0) + 1 FROM prestamo);
SET @sql = CONCAT('ALTER TABLE banco_ddd.prestamo AUTO_INCREMENT=', @next_value);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @next_value = (SELECT COALESCE(MAX(id_transferencia), 0) + 1 FROM transferencia);
SET @sql = CONCAT('ALTER TABLE banco_ddd.transferencia AUTO_INCREMENT=', @next_value);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @next_value = (SELECT COALESCE(MAX(id_lote), 0) + 1 FROM lote_transferencia);
SET @sql = CONCAT('ALTER TABLE banco_ddd.lote_transferencia AUTO_INCREMENT=', @next_value);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @next_value = (SELECT COALESCE(MAX(id_detalle), 0) + 1 FROM detalle_lote_transferencia);
SET @sql = CONCAT('ALTER TABLE banco_ddd.detalle_lote_transferencia AUTO_INCREMENT=', @next_value);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;
