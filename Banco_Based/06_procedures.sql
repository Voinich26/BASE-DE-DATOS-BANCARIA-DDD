-- ============================================================
-- 06_procedures.sql
-- Stored Procedures  Servicios de Dominio
-- Ejecutar despues de 05_triggers.sql
-- NOTA: sp_registrar_bitacora se define en 05a_sp_bitacora.sql
--       Este archivo NO lo redefine para evitar duplicados.
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
DELIMITER //

-- ============================================================
-- SP-01: sp_ejecutar_transferencia
-- BC-05: Transferencias  INV-21, INV-22, INV-23, INV-26, RP-14, RP-23
-- USO: llamado directamente por el cliente/backend para transferencias
-- que ya estan en estado Pendiente. Tiene su propia transaccion.
-- El flujo de aprobacion es manejado por sp_aprobar_transferencia.
-- ============================================================
DROP PROCEDURE IF EXISTS sp_ejecutar_transferencia //
CREATE PROCEDURE sp_ejecutar_transferencia(
    IN p_id_transferencia INT UNSIGNED
)
COMMENT 'BC-05: Ejecuta transferencia Pendiente de forma atomica con transaccion propia.'
BEGIN
    DECLARE v_origen          VARCHAR(30);
    DECLARE v_destino         VARCHAR(30);
    DECLARE v_monto           DECIMAL(18,2);
    DECLARE v_id_estado       TINYINT UNSIGNED;
    DECLARE v_est_nombre      VARCHAR(40);
    DECLARE v_saldo_origen    DECIMAL(18,2);
    DECLARE v_saldo_destino   DECIMAL(18,2);
    DECLARE v_est_orig_nombre VARCHAR(30);
    DECLARE v_est_dest_nombre VARCHAR(30);
    DECLARE v_id_ejecutada    TINYINT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT t.cuenta_origen, t.cuenta_destino, t.monto, t.id_estado_transferencia,
           cet.nombre_estado
    INTO v_origen, v_destino, v_monto, v_id_estado, v_est_nombre
    FROM transferencia t
    JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
    WHERE t.id_transferencia = p_id_transferencia FOR UPDATE;

    IF v_est_nombre IN ('Vencida', 'Ejecutada', 'Rechazada') THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-23: Transferencia en estado final, no puede ejecutarse';
    END IF;

    SELECT cb.saldo_actual, cec.nombre_estado
    INTO v_saldo_origen, v_est_orig_nombre
    FROM cuenta_bancaria cb
    JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = v_origen FOR UPDATE;

    SELECT cb.saldo_actual, cec.nombre_estado
    INTO v_saldo_destino, v_est_dest_nombre
    FROM cuenta_bancaria cb
    JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = v_destino FOR UPDATE;

    IF v_est_orig_nombre != 'Activa' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-22: Cuenta origen no esta activa';
    END IF;
    IF v_est_dest_nombre != 'Activa' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-22: Cuenta destino no esta activa';
    END IF;
    IF v_saldo_origen < v_monto THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-21: Saldo insuficiente en cuenta origen';
    END IF;

    UPDATE transferencia
    SET saldo_origen_antes  = v_saldo_origen,
        saldo_destino_antes = v_saldo_destino
    WHERE id_transferencia = p_id_transferencia;

    UPDATE cuenta_bancaria SET saldo_actual = saldo_actual - v_monto
    WHERE numero_cuenta = v_origen;

    UPDATE cuenta_bancaria SET saldo_actual = saldo_actual + v_monto
    WHERE numero_cuenta = v_destino;

    SELECT id_estado_transferencia INTO v_id_ejecutada
    FROM cat_estado_transferencia WHERE nombre_estado = 'Ejecutada';

    UPDATE transferencia
    SET saldo_origen_despues    = v_saldo_origen  - v_monto,
        saldo_destino_despues   = v_saldo_destino + v_monto,
        id_estado_transferencia = v_id_ejecutada
    WHERE id_transferencia = p_id_transferencia;

    COMMIT;
END //

-- ============================================================
-- SP-01b: sp_ejecutar_transferencia_interna
-- Mueve fondos entre cuentas SIN tocar la tabla transferencia.
-- Llamado exclusivamente desde TRG-10 y TRG-12.
-- Los snapshots y el estado final los gestiona el trigger
-- usando NEW.* (BEFORE) o variables de sesion (@).
-- ============================================================
DROP PROCEDURE IF EXISTS sp_ejecutar_transferencia_interna //
CREATE PROCEDURE sp_ejecutar_transferencia_interna(
    IN  p_id_transferencia  INT UNSIGNED,
    OUT p_saldo_orig_antes  DECIMAL(18,2),
    OUT p_saldo_dest_antes  DECIMAL(18,2),
    OUT p_saldo_orig_despues DECIMAL(18,2),
    OUT p_saldo_dest_despues DECIMAL(18,2)
)
COMMENT 'BC-05: Mueve fondos entre cuentas. NO toca tabla transferencia. Solo para triggers.'
BEGIN
    DECLARE v_origen          VARCHAR(30);
    DECLARE v_destino         VARCHAR(30);
    DECLARE v_monto           DECIMAL(18,2);
    DECLARE v_est_nombre      VARCHAR(40);
    DECLARE v_est_orig        VARCHAR(30);
    DECLARE v_est_dest        VARCHAR(30);

    -- Leer datos de la transferencia sin bloqueo exclusivo
    -- (el trigger ya tiene el lock sobre esta fila)
    SELECT t.cuenta_origen, t.cuenta_destino, t.monto, cet.nombre_estado
    INTO v_origen, v_destino, v_monto, v_est_nombre
    FROM transferencia t
    JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
    WHERE t.id_transferencia = p_id_transferencia LOCK IN SHARE MODE;

    IF v_est_nombre IN ('Vencida', 'Ejecutada', 'Rechazada') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-23: Transferencia en estado final, no puede ejecutarse';
    END IF;

    -- Bloquear y leer saldos
    SELECT cb.saldo_actual, cec.nombre_estado
    INTO p_saldo_orig_antes, v_est_orig
    FROM cuenta_bancaria cb
    JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = v_origen FOR UPDATE;

    SELECT cb.saldo_actual, cec.nombre_estado
    INTO p_saldo_dest_antes, v_est_dest
    FROM cuenta_bancaria cb
    JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = v_destino FOR UPDATE;

    IF v_est_orig != 'Activa' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-22: Cuenta origen no esta activa';
    END IF;
    IF v_est_dest != 'Activa' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-22: Cuenta destino no esta activa';
    END IF;
    IF p_saldo_orig_antes < v_monto THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-21: Saldo insuficiente en cuenta origen';
    END IF;

    -- Mover fondos (solo cuenta_bancaria, nunca transferencia)
    UPDATE cuenta_bancaria SET saldo_actual = saldo_actual - v_monto WHERE numero_cuenta = v_origen;
    UPDATE cuenta_bancaria SET saldo_actual = saldo_actual + v_monto WHERE numero_cuenta = v_destino;

    SET p_saldo_orig_despues = p_saldo_orig_antes - v_monto;
    SET p_saldo_dest_despues = p_saldo_dest_antes + v_monto;
END //

-- ============================================================
-- SP-05: sp_aprobar_prestamo
-- BC-04: Prestamos  INV-14, INV-15, INV-17, RP-02, RP-03
-- ============================================================
DROP PROCEDURE IF EXISTS sp_aprobar_prestamo //
CREATE PROCEDURE sp_aprobar_prestamo(
    IN p_id_prestamo    INT UNSIGNED,
    IN p_id_analista    INT UNSIGNED,
    IN p_monto_aprobado DECIMAL(18,2),
    IN p_tasa_interes   DECIMAL(6,4),
    IN p_plazo_meses    SMALLINT UNSIGNED,
    IN p_cuenta_destino VARCHAR(30)
)
COMMENT 'BC-04: Aprueba un prestamo en estado En Estudio'
BEGIN
    DECLARE v_rol_analista VARCHAR(60);
    DECLARE v_est_prestamo VARCHAR(40);
    DECLARE v_id_aprobado  TINYINT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Contexto de sesion ANTES de la transaccion
    -- (las variables de sesion no participan en ROLLBACK)
    SET @id_usuario_sesion = p_id_analista;
    SET @rol_sesion        = 'Analista Interno';

    START TRANSACTION;

    SELECT cr.nombre_rol INTO v_rol_analista
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_analista;
    IF v_rol_analista IS NULL OR v_rol_analista != 'Analista Interno' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-14: Solo Analista Interno puede aprobar prestamos';
    END IF;

    SELECT cep.nombre_estado INTO v_est_prestamo
    FROM prestamo p JOIN cat_estado_prestamo cep ON p.id_estado_prestamo = cep.id_estado_prestamo
    WHERE p.id_prestamo = p_id_prestamo FOR UPDATE;
    IF v_est_prestamo IS NULL OR v_est_prestamo != 'En Estudio' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-15: Solo se puede aprobar un prestamo En Estudio';
    END IF;

    IF p_monto_aprobado IS NULL OR p_monto_aprobado <= 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-17: El monto aprobado debe ser mayor a cero';
    END IF;

    SELECT id_estado_prestamo INTO v_id_aprobado
    FROM cat_estado_prestamo WHERE nombre_estado = 'Aprobado';

    UPDATE prestamo SET
        id_estado_prestamo        = v_id_aprobado,
        monto_aprobado            = p_monto_aprobado,
        tasa_interes              = p_tasa_interes,
        plazo_meses               = p_plazo_meses,
        cuenta_destino_desembolso = p_cuenta_destino,
        id_analista_aprobador     = p_id_analista,
        fecha_aprobacion          = NOW(),
        fecha_modificacion        = NOW()
    WHERE id_prestamo = p_id_prestamo;

    COMMIT;
    -- TRG-08 registra en bitacora automaticamente
END //

-- ============================================================
-- SP-06: sp_rechazar_prestamo
-- BC-04: Prestamos  INV-14, INV-15, RP-02
-- ============================================================
DROP PROCEDURE IF EXISTS sp_rechazar_prestamo //
CREATE PROCEDURE sp_rechazar_prestamo(
    IN p_id_prestamo INT UNSIGNED,
    IN p_id_analista INT UNSIGNED,
    IN p_motivo      VARCHAR(300)
)
COMMENT 'BC-04: Rechaza un prestamo en estado En Estudio'
BEGIN
    DECLARE v_rol_analista VARCHAR(60);
    DECLARE v_est_prestamo VARCHAR(40);
    DECLARE v_id_rechazado TINYINT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    SET @id_usuario_sesion        = p_id_analista;
    SET @rol_sesion               = 'Analista Interno';
    SET @motivo_rechazo_prestamo  = p_motivo;

    START TRANSACTION;

    SELECT cr.nombre_rol INTO v_rol_analista
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_analista;
    IF v_rol_analista IS NULL OR v_rol_analista != 'Analista Interno' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-14: Solo Analista Interno puede rechazar prestamos';
    END IF;

    SELECT cep.nombre_estado INTO v_est_prestamo
    FROM prestamo p JOIN cat_estado_prestamo cep ON p.id_estado_prestamo = cep.id_estado_prestamo
    WHERE p.id_prestamo = p_id_prestamo FOR UPDATE;
    IF v_est_prestamo IS NULL OR v_est_prestamo != 'En Estudio' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-15: Solo se puede rechazar un prestamo En Estudio';
    END IF;

    SELECT id_estado_prestamo INTO v_id_rechazado
    FROM cat_estado_prestamo WHERE nombre_estado = 'Rechazado';

    UPDATE prestamo SET
        id_estado_prestamo    = v_id_rechazado,
        id_analista_aprobador = p_id_analista,
        fecha_aprobacion      = NOW(),
        fecha_modificacion    = NOW()
    WHERE id_prestamo = p_id_prestamo;

    COMMIT;
END //

-- ============================================================
-- SP-02: sp_desembolsar_prestamo
-- BC-04: Prestamos  INV-14, INV-15, INV-17, INV-18, RP-04, RP-05
-- ============================================================
DROP PROCEDURE IF EXISTS sp_desembolsar_prestamo //
CREATE PROCEDURE sp_desembolsar_prestamo(
    IN p_id_prestamo INT UNSIGNED,
    IN p_id_analista INT UNSIGNED
)
COMMENT 'BC-04: Desembolsa el monto aprobado a la cuenta destino'
BEGIN
    DECLARE v_monto           DECIMAL(18,2);
    DECLARE v_cuenta          VARCHAR(30);
    DECLARE v_est_prestamo    VARCHAR(40);
    DECLARE v_titular_cuenta  VARCHAR(30);
    DECLARE v_tipo_titular    VARCHAR(20);
    DECLARE v_est_cuenta      VARCHAR(30);
    DECLARE v_cliente_sol     VARCHAR(30);
    DECLARE v_tipo_cliente    VARCHAR(20);
    DECLARE v_rol_analista    VARCHAR(60);
    DECLARE v_id_desembolsado TINYINT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Contexto de sesion ANTES de la transaccion
    SET @id_usuario_sesion = p_id_analista;
    SET @rol_sesion        = 'Analista Interno';

    START TRANSACTION;

    SELECT cr.nombre_rol INTO v_rol_analista
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_analista;
    IF v_rol_analista IS NULL OR v_rol_analista != 'Analista Interno' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-14: Solo Analista Interno puede desembolsar';
    END IF;

    SELECT p.monto_aprobado, p.cuenta_destino_desembolso,
           cep.nombre_estado, p.id_cliente_solicitante, p.tipo_cliente
    INTO v_monto, v_cuenta, v_est_prestamo, v_cliente_sol, v_tipo_cliente
    FROM prestamo p
    JOIN cat_estado_prestamo cep ON p.id_estado_prestamo = cep.id_estado_prestamo
    WHERE p.id_prestamo = p_id_prestamo FOR UPDATE;

    IF v_est_prestamo != 'Aprobado' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-15: Solo se puede desembolsar un prestamo Aprobado';
    END IF;
    IF v_monto IS NULL OR v_monto <= 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-17: Monto aprobado invalido';
    END IF;

    SELECT cb.id_titular, cb.tipo_titular, cec.nombre_estado
    INTO v_titular_cuenta, v_tipo_titular, v_est_cuenta
    FROM cuenta_bancaria cb
    JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = v_cuenta FOR UPDATE;

    IF v_est_cuenta != 'Activa' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-18: Cuenta destino no esta activa';
    END IF;
    IF v_titular_cuenta != v_cliente_sol OR v_tipo_titular != v_tipo_cliente THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-18: La cuenta destino no pertenece al cliente solicitante';
    END IF;

    UPDATE cuenta_bancaria SET saldo_actual = saldo_actual + v_monto
    WHERE numero_cuenta = v_cuenta;

    SELECT id_estado_prestamo INTO v_id_desembolsado
    FROM cat_estado_prestamo WHERE nombre_estado = 'Desembolsado';

    UPDATE prestamo SET
        id_estado_prestamo = v_id_desembolsado,
        fecha_desembolso   = NOW(),
        fecha_modificacion = NOW()
    WHERE id_prestamo = p_id_prestamo;

    COMMIT;
    -- TRG-08 registra en bitacora automaticamente
END //

-- ============================================================
-- SP-07: sp_aprobar_transferencia
-- BC-05: Transferencias  INV-23, INV-25, RP-09, RP-10
-- Flujo: En Espera → Aprobada (TRG-11 detecta y mueve fondos) → Ejecutada
-- El segundo UPDATE lo hace este mismo SP para evitar que TRG-12
-- tenga que hacer UPDATE sobre transferencia (Error 1442).
-- ============================================================
DROP PROCEDURE IF EXISTS sp_aprobar_transferencia //
CREATE PROCEDURE sp_aprobar_transferencia(
    IN p_id_transferencia INT UNSIGNED,
    IN p_id_supervisor    INT UNSIGNED
)
COMMENT 'BC-05: Aprueba y ejecuta una transferencia en espera de aprobacion'
BEGIN
    DECLARE v_rol_sup      VARCHAR(60);
    DECLARE v_est_nombre   VARCHAR(40);
    DECLARE v_vencimiento  DATETIME;
    DECLARE v_id_aprobada  TINYINT UNSIGNED;
    DECLARE v_id_ejecutada TINYINT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    SET @id_usuario_sesion = p_id_supervisor;
    SET @rol_sesion        = 'Supervisor Empresa';

    START TRANSACTION;

    SELECT cr.nombre_rol INTO v_rol_sup
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_supervisor;
    IF v_rol_sup IS NULL OR v_rol_sup != 'Supervisor Empresa' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-25: Solo Supervisor Empresa puede aprobar transferencias';
    END IF;

    SELECT cet.nombre_estado, t.fecha_vencimiento
    INTO v_est_nombre, v_vencimiento
    FROM transferencia t
    JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
    WHERE t.id_transferencia = p_id_transferencia FOR UPDATE;

    IF v_est_nombre != 'En Espera de Aprobacion' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se puede aprobar una transferencia En Espera de Aprobacion';
    END IF;
    IF NOW() > v_vencimiento THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-23: La transferencia ya ha vencido';
    END IF;

    SELECT id_estado_transferencia INTO v_id_aprobada
    FROM cat_estado_transferencia WHERE nombre_estado = 'Aprobada';
    SELECT id_estado_transferencia INTO v_id_ejecutada
    FROM cat_estado_transferencia WHERE nombre_estado = 'Ejecutada';

    -- Paso 1: En Espera → Aprobada (TRG-11 valida rol y transicion)
    -- @rol_sesion = 'Supervisor Empresa' satisface la validacion de TRG-11
    UPDATE transferencia SET
        id_estado_transferencia = v_id_aprobada,
        id_usuario_aprobador    = p_id_supervisor,
        fecha_aprobacion        = NOW()
    WHERE id_transferencia = p_id_transferencia;

    -- Paso 2: Aprobada → Ejecutada
    -- TRG-11 (BEFORE UPDATE) detecta esta transicion, mueve fondos en
    -- cuenta_bancaria y escribe snapshots en NEW.* sin tocar transferencia.
    -- @rol_sesion = 'SISTEMA' para que TRG-11 omita validacion de rol
    -- en esta transicion interna controlada.
    SET @rol_sesion = 'SISTEMA';
    UPDATE transferencia SET
        id_estado_transferencia = v_id_ejecutada
    WHERE id_transferencia = p_id_transferencia;

    COMMIT;
END //

-- ============================================================
-- SP-08: sp_rechazar_transferencia
-- BC-05: Transferencias  INV-25, RP-11
-- ============================================================
DROP PROCEDURE IF EXISTS sp_rechazar_transferencia //
CREATE PROCEDURE sp_rechazar_transferencia(
    IN p_id_transferencia INT UNSIGNED,
    IN p_id_supervisor    INT UNSIGNED,
    IN p_motivo           VARCHAR(300)
)
COMMENT 'BC-05: Rechaza una transferencia en espera de aprobacion'
BEGIN
    DECLARE v_rol_sup      VARCHAR(60);
    DECLARE v_est_nombre   VARCHAR(40);
    DECLARE v_id_rechazada TINYINT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Contexto de sesion ANTES de la transaccion
    SET @id_usuario_sesion = p_id_supervisor;
    SET @rol_sesion        = 'Supervisor Empresa';

    START TRANSACTION;

    SELECT cr.nombre_rol INTO v_rol_sup
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_supervisor;
    IF v_rol_sup IS NULL OR v_rol_sup != 'Supervisor Empresa' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-25: Solo Supervisor Empresa puede rechazar transferencias';
    END IF;

    SELECT cet.nombre_estado INTO v_est_nombre
    FROM transferencia t
    JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
    WHERE t.id_transferencia = p_id_transferencia FOR UPDATE;
    IF v_est_nombre != 'En Espera de Aprobacion' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se puede rechazar una transferencia En Espera de Aprobacion';
    END IF;

    SELECT id_estado_transferencia INTO v_id_rechazada
    FROM cat_estado_transferencia WHERE nombre_estado = 'Rechazada';

    UPDATE transferencia SET
        id_estado_transferencia = v_id_rechazada,
        id_usuario_aprobador    = p_id_supervisor,
        fecha_aprobacion        = NOW()
    WHERE id_transferencia = p_id_transferencia;

    COMMIT;
END //

-- ============================================================
-- SP-04: sp_bloquear_cuenta
-- BC-03: Cuentas  INV-10, EVT-06
-- CORRECCION: SET @id_usuario_sesion movido ANTES de START TRANSACTION
-- para que TRG-05 (AFTER UPDATE cuenta_bancaria) lo encuentre disponible.
-- ============================================================
DROP PROCEDURE IF EXISTS sp_bloquear_cuenta //
CREATE PROCEDURE sp_bloquear_cuenta(
    IN p_numero_cuenta VARCHAR(30),
    IN p_id_usuario    INT UNSIGNED,
    IN p_motivo        VARCHAR(200)
)
COMMENT 'BC-03: Bloquea una cuenta bancaria'
BEGIN
    DECLARE v_est_nombre   VARCHAR(30);
    DECLARE v_id_bloqueada TINYINT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Contexto de sesion ANTES de la transaccion
    SET @id_usuario_sesion = p_id_usuario;
    SET @rol_sesion        = 'SISTEMA';

    START TRANSACTION;

    SELECT cec.nombre_estado INTO v_est_nombre
    FROM cuenta_bancaria cb
    JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = p_numero_cuenta FOR UPDATE;

    IF v_est_nombre IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cuenta no encontrada';
    END IF;
    IF v_est_nombre = 'Cerrada' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede bloquear una cuenta cerrada';
    END IF;
    IF v_est_nombre = 'Bloqueada' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cuenta ya esta bloqueada';
    END IF;

    SELECT id_estado_cuenta INTO v_id_bloqueada
    FROM cat_estado_cuenta WHERE nombre_estado = 'Bloqueada';

    UPDATE cuenta_bancaria
    SET id_estado_cuenta = v_id_bloqueada
    WHERE numero_cuenta = p_numero_cuenta;

    COMMIT;
    -- TRG-05 registra en bitacora automaticamente
END //

DELIMITER ;