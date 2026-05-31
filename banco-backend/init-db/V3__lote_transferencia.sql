-- ============================================================
-- V3__lote_transferencia.sql
-- BC-06: Pagos Masivos y Nómina Empresarial
-- Tablas, stored procedures y datos de catálogo.
-- Ejecutar DESPUÉS de V1 y V2.
-- ============================================================

USE banco_ddd;

-- ============================================================
-- CATÁLOGO: cat_estado_lote
-- Estados del ciclo de vida de un lote de pagos masivos.
-- ============================================================
INSERT IGNORE INTO cat_estado_lote (nombre_estado, es_estado_final) VALUES
    ('Pendiente',   FALSE),
    ('En Revision', FALSE),
    ('Aprobado',    FALSE),
    ('Procesado',   TRUE),
    ('Rechazado',   TRUE),
    ('Cancelado',   TRUE);

-- ============================================================
-- TABLA: lote_transferencia
-- Aggregate root del lote de pagos masivos / nómina.
-- ============================================================
CREATE TABLE IF NOT EXISTS lote_transferencia (
    id_lote               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    nit_empresa           VARCHAR(30)      NOT NULL COMMENT 'NIT de la empresa propietaria',
    concepto              VARCHAR(300)     NOT NULL COMMENT 'Descripción del lote (ej: Nómina Mayo 2026)',
    id_estado_lote        INT UNSIGNED     NOT NULL,
    id_usuario_creador    INT UNSIGNED     NOT NULL,
    id_usuario_supervisor INT UNSIGNED     NULL     COMMENT 'Supervisor que procesó o rechazó',
    total_items           INT UNSIGNED     NOT NULL DEFAULT 0,
    items_exitosos        INT UNSIGNED     NULL     DEFAULT 0,
    items_fallidos        INT UNSIGNED     NULL     DEFAULT 0,
    monto_total           DECIMAL(18,2)   NOT NULL DEFAULT 0.00,
    monto_procesado       DECIMAL(18,2)   NULL     DEFAULT 0.00,
    motivo_rechazo        VARCHAR(500)    NULL,
    fecha_creacion        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_procesamiento   DATETIME        NULL,
    fecha_modificacion    DATETIME        NULL     ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_lote_transferencia     PRIMARY KEY (id_lote),
    CONSTRAINT fk_lote_estado            FOREIGN KEY (id_estado_lote)
        REFERENCES cat_estado_lote(id_estado_lote),
    CONSTRAINT fk_lote_usuario_creador   FOREIGN KEY (id_usuario_creador)
        REFERENCES usuario(id_usuario),
    CONSTRAINT fk_lote_usuario_supervisor FOREIGN KEY (id_usuario_supervisor)
        REFERENCES usuario(id_usuario),
    CONSTRAINT fk_lote_empresa           FOREIGN KEY (nit_empresa)
        REFERENCES cliente_empresa(nit),

    INDEX idx_lote_empresa   (nit_empresa),
    INDEX idx_lote_estado    (id_estado_lote),
    INDEX idx_lote_creacion  (fecha_creacion)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='BC-06: Lotes de pagos masivos y nómina empresarial';

-- ============================================================
-- TABLA: detalle_lote_transferencia
-- Cada ítem (transferencia individual) dentro del lote.
-- ============================================================
CREATE TABLE IF NOT EXISTS detalle_lote_transferencia (
    id_detalle                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_lote                   BIGINT UNSIGNED NOT NULL,
    cuenta_origen             VARCHAR(30)     NOT NULL,
    cuenta_destino            VARCHAR(30)     NOT NULL,
    monto                     DECIMAL(18,2)  NOT NULL,
    concepto_detalle          VARCHAR(200)   NULL     COMMENT 'Concepto específico del ítem',
    id_estado_detalle         INT UNSIGNED   NOT NULL COMMENT 'Estado del ítem (reutiliza cat_estado_lote)',
    id_transferencia_generada BIGINT UNSIGNED NULL    COMMENT 'ID de la transferencia creada al procesar',
    mensaje_error             VARCHAR(500)   NULL     COMMENT 'Mensaje de error si el ítem falló',
    orden                     INT UNSIGNED   NOT NULL DEFAULT 1 COMMENT 'Posición dentro del lote',

    CONSTRAINT pk_detalle_lote           PRIMARY KEY (id_detalle),
    CONSTRAINT fk_detalle_lote           FOREIGN KEY (id_lote)
        REFERENCES lote_transferencia(id_lote) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_estado         FOREIGN KEY (id_estado_detalle)
        REFERENCES cat_estado_lote(id_estado_lote),
    CONSTRAINT fk_detalle_transferencia  FOREIGN KEY (id_transferencia_generada)
        REFERENCES transferencia(id_transferencia),

    INDEX idx_detalle_lote   (id_lote),
    INDEX idx_detalle_estado (id_estado_detalle),
    INDEX idx_detalle_orden  (id_lote, orden)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='BC-06: Ítems individuales de un lote de pagos masivos';


-- ============================================================
-- SP: sp_crear_lote_transferencia
-- Crea el lote y todos sus detalles en una transacción atómica.
-- Parámetros:
--   p_nit_empresa    VARCHAR(30)  — NIT de la empresa
--   p_concepto       VARCHAR(300) — Descripción del lote
--   p_id_usuario     INT          — ID del usuario creador
--   p_detalles_json  JSON         — Array de ítems
--   OUT p_id_lote    BIGINT       — ID del lote creado
-- ============================================================
DROP PROCEDURE IF EXISTS sp_crear_lote_transferencia;

DELIMITER $$
CREATE PROCEDURE sp_crear_lote_transferencia(
    IN  p_nit_empresa   VARCHAR(30),
    IN  p_concepto      VARCHAR(300),
    IN  p_id_usuario    INT UNSIGNED,
    IN  p_detalles_json JSON,
    OUT p_id_lote       BIGINT UNSIGNED
)
BEGIN
    DECLARE v_id_estado_pendiente INT UNSIGNED;
    DECLARE v_total_items         INT UNSIGNED DEFAULT 0;
    DECLARE v_monto_total         DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_idx                 INT DEFAULT 0;
    DECLARE v_cuenta_origen       VARCHAR(30);
    DECLARE v_cuenta_destino      VARCHAR(30);
    DECLARE v_monto               DECIMAL(18,2);
    DECLARE v_concepto_detalle    VARCHAR(200);

    -- Obtener estado Pendiente
    SELECT id_estado_lote INTO v_id_estado_pendiente
    FROM cat_estado_lote WHERE nombre_estado = 'Pendiente' LIMIT 1;

    IF v_id_estado_pendiente IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Estado Pendiente no encontrado en cat_estado_lote';
    END IF;

    -- Calcular totales del JSON
    SET v_total_items = JSON_LENGTH(p_detalles_json);

    IF v_total_items = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El lote debe contener al menos un ítem';
    END IF;

    -- Sumar monto total
    SET v_idx = 0;
    WHILE v_idx < v_total_items DO
        SET v_monto = JSON_UNQUOTE(JSON_EXTRACT(p_detalles_json, CONCAT('$[', v_idx, '].monto')));
        SET v_monto_total = v_monto_total + v_monto;
        SET v_idx = v_idx + 1;
    END WHILE;

    -- Insertar cabecera del lote
    INSERT INTO lote_transferencia
        (nit_empresa, concepto, id_estado_lote, id_usuario_creador,
         total_items, monto_total, fecha_creacion)
    VALUES
        (p_nit_empresa, p_concepto, v_id_estado_pendiente, p_id_usuario,
         v_total_items, v_monto_total, NOW());

    SET p_id_lote = LAST_INSERT_ID();

    -- Insertar detalles
    SET v_idx = 0;
    WHILE v_idx < v_total_items DO
        SET v_cuenta_origen    = JSON_UNQUOTE(JSON_EXTRACT(p_detalles_json, CONCAT('$[', v_idx, '].cuenta_origen')));
        SET v_cuenta_destino   = JSON_UNQUOTE(JSON_EXTRACT(p_detalles_json, CONCAT('$[', v_idx, '].cuenta_destino')));
        SET v_monto            = JSON_UNQUOTE(JSON_EXTRACT(p_detalles_json, CONCAT('$[', v_idx, '].monto')));
        SET v_concepto_detalle = JSON_UNQUOTE(JSON_EXTRACT(p_detalles_json, CONCAT('$[', v_idx, '].concepto')));

        INSERT INTO detalle_lote_transferencia
            (id_lote, cuenta_origen, cuenta_destino, monto,
             concepto_detalle, id_estado_detalle, orden)
        VALUES
            (p_id_lote, v_cuenta_origen, v_cuenta_destino, v_monto,
             v_concepto_detalle, v_id_estado_pendiente, v_idx + 1);

        SET v_idx = v_idx + 1;
    END WHILE;

END$$
DELIMITER ;


-- ============================================================
-- SP: sp_procesar_lote_transferencia
-- Procesa todos los ítems pendientes de un lote aprobado.
-- Cada ítem genera una transferencia individual.
-- El procesamiento es tolerante a fallos por ítem.
-- Parámetros:
--   p_id_lote       BIGINT — ID del lote a procesar
--   p_id_supervisor INT    — ID del supervisor que autoriza
-- ============================================================
DROP PROCEDURE IF EXISTS sp_procesar_lote_transferencia;

DELIMITER $$
CREATE PROCEDURE sp_procesar_lote_transferencia(
    IN p_id_lote       BIGINT UNSIGNED,
    IN p_id_supervisor INT UNSIGNED
)
BEGIN
    DECLARE v_id_estado_procesado  INT UNSIGNED;
    DECLARE v_id_estado_pendiente  INT UNSIGNED;
    DECLARE v_id_estado_fallido    INT UNSIGNED;
    DECLARE v_id_estado_ejecutada  INT UNSIGNED;
    DECLARE v_id_detalle           BIGINT UNSIGNED;
    DECLARE v_cuenta_origen        VARCHAR(30);
    DECLARE v_cuenta_destino       VARCHAR(30);
    DECLARE v_monto                DECIMAL(18,2);
    DECLARE v_id_transferencia     BIGINT UNSIGNED;
    DECLARE v_items_exitosos       INT UNSIGNED DEFAULT 0;
    DECLARE v_items_fallidos       INT UNSIGNED DEFAULT 0;
    DECLARE v_monto_procesado      DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_saldo_origen         DECIMAL(18,2);
    DECLARE v_error_msg            VARCHAR(500);
    DECLARE v_done                 BOOLEAN DEFAULT FALSE;

    DECLARE cur_detalles CURSOR FOR
        SELECT id_detalle, cuenta_origen, cuenta_destino, monto
        FROM detalle_lote_transferencia
        WHERE id_lote = p_id_lote
          AND id_estado_detalle = v_id_estado_pendiente
        ORDER BY orden;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        -- Marcar ítem como fallido y continuar
        UPDATE detalle_lote_transferencia
        SET id_estado_detalle = v_id_estado_fallido,
            mensaje_error     = v_error_msg
        WHERE id_detalle = v_id_detalle;
        SET v_items_fallidos = v_items_fallidos + 1;
    END;

    -- Obtener IDs de estados
    SELECT id_estado_lote INTO v_id_estado_procesado
    FROM cat_estado_lote WHERE nombre_estado = 'Procesado' LIMIT 1;

    SELECT id_estado_lote INTO v_id_estado_pendiente
    FROM cat_estado_lote WHERE nombre_estado = 'Pendiente' LIMIT 1;

    SELECT id_estado_lote INTO v_id_estado_fallido
    FROM cat_estado_lote WHERE nombre_estado = 'Rechazado' LIMIT 1;

    SELECT id_estado_transferencia INTO v_id_estado_ejecutada
    FROM cat_estado_transferencia WHERE nombre_estado = 'Ejecutada' LIMIT 1;

    -- Validar que el lote existe y está en estado procesable
    IF NOT EXISTS (
        SELECT 1 FROM lote_transferencia l
        JOIN cat_estado_lote e ON l.id_estado_lote = e.id_estado_lote
        WHERE l.id_lote = p_id_lote
          AND e.nombre_estado IN ('Pendiente', 'Aprobado')
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El lote no existe o no está en estado procesable';
    END IF;

    -- Procesar cada ítem
    OPEN cur_detalles;
    loop_items: LOOP
        FETCH cur_detalles INTO v_id_detalle, v_cuenta_origen, v_cuenta_destino, v_monto;
        IF v_done THEN LEAVE loop_items; END IF;

        -- Verificar saldo de la cuenta origen
        SELECT saldo_actual INTO v_saldo_origen
        FROM cuenta_bancaria WHERE numero_cuenta = v_cuenta_origen FOR UPDATE;

        IF v_saldo_origen IS NULL THEN
            UPDATE detalle_lote_transferencia
            SET id_estado_detalle = v_id_estado_fallido,
                mensaje_error     = CONCAT('Cuenta origen no encontrada: ', v_cuenta_origen)
            WHERE id_detalle = v_id_detalle;
            SET v_items_fallidos = v_items_fallidos + 1;
        ELSEIF v_saldo_origen < v_monto THEN
            UPDATE detalle_lote_transferencia
            SET id_estado_detalle = v_id_estado_fallido,
                mensaje_error     = CONCAT('Saldo insuficiente en cuenta ', v_cuenta_origen,
                                           '. Disponible: ', v_saldo_origen)
            WHERE id_detalle = v_id_detalle;
            SET v_items_fallidos = v_items_fallidos + 1;
        ELSE
            -- Insertar transferencia
            INSERT INTO transferencia
                (cuenta_origen, cuenta_destino, monto, id_estado_transferencia,
                 id_usuario_creador, fecha_vencimiento, requiere_aprobacion,
                 saldo_origen_antes, saldo_destino_antes,
                 saldo_origen_despues, saldo_destino_despues)
            SELECT
                v_cuenta_origen, v_cuenta_destino, v_monto, v_id_estado_ejecutada,
                p_id_supervisor, DATE_ADD(NOW(), INTERVAL 1 HOUR), FALSE,
                cb_o.saldo_actual,
                cb_d.saldo_actual,
                cb_o.saldo_actual - v_monto,
                cb_d.saldo_actual + v_monto
            FROM cuenta_bancaria cb_o
            JOIN cuenta_bancaria cb_d ON cb_d.numero_cuenta = v_cuenta_destino
            WHERE cb_o.numero_cuenta = v_cuenta_origen;

            SET v_id_transferencia = LAST_INSERT_ID();

            -- Actualizar saldos
            UPDATE cuenta_bancaria SET saldo_actual = saldo_actual - v_monto
            WHERE numero_cuenta = v_cuenta_origen;

            UPDATE cuenta_bancaria SET saldo_actual = saldo_actual + v_monto
            WHERE numero_cuenta = v_cuenta_destino;

            -- Marcar ítem como procesado
            UPDATE detalle_lote_transferencia
            SET id_estado_detalle         = v_id_estado_procesado,
                id_transferencia_generada = v_id_transferencia
            WHERE id_detalle = v_id_detalle;

            SET v_items_exitosos  = v_items_exitosos + 1;
            SET v_monto_procesado = v_monto_procesado + v_monto;
        END IF;
    END LOOP;
    CLOSE cur_detalles;

    -- Actualizar cabecera del lote
    UPDATE lote_transferencia
    SET id_estado_lote        = v_id_estado_procesado,
        id_usuario_supervisor = p_id_supervisor,
        items_exitosos        = v_items_exitosos,
        items_fallidos        = v_items_fallidos,
        monto_procesado       = v_monto_procesado,
        fecha_procesamiento   = NOW(),
        fecha_modificacion    = NOW()
    WHERE id_lote = p_id_lote;

END$$
DELIMITER ;
