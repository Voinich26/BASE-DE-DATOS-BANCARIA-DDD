-- ============================================================
-- 05a_sp_bitacora.sql  [NUEVO — ejecutar ANTES de 05_triggers.sql]
-- sp_registrar_bitacora debe existir antes que cualquier trigger
-- que lo invoque (TRG-05, TRG-08, TRG-10, TRG-12)
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
DELIMITER //

DROP PROCEDURE IF EXISTS sp_registrar_bitacora //
CREATE PROCEDURE sp_registrar_bitacora(
    IN p_tipo_operacion       VARCHAR(50),
    IN p_id_usuario           INT UNSIGNED,
    IN p_rol_usuario          VARCHAR(60),
    IN p_id_producto_afectado VARCHAR(30),
    IN p_tipo_producto        VARCHAR(20),
    IN p_datos_detalle        JSON
)
COMMENT 'BC-06: Inserta registro inmutable en bitacora de auditoria'
BEGIN
    DECLARE v_id_bitacora VARCHAR(36);
    SET v_id_bitacora = UUID();
    INSERT INTO bitacora_cola (
        id_bitacora, tipo_operacion, fecha_hora_operacion,
        id_usuario, rol_usuario, id_producto_afectado,
        tipo_producto, datos_detalle, sincronizado
    ) VALUES (
        v_id_bitacora, p_tipo_operacion, NOW(3),
        p_id_usuario, p_rol_usuario, p_id_producto_afectado,
        p_tipo_producto, p_datos_detalle, FALSE
    );
END //

DELIMITER ;