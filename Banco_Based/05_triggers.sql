-- ============================================================
-- 05_triggers.sql
-- Triggers de validacion y auditoria
-- Ejecutar despues de 05a_sp_bitacora.sql
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
DELIMITER //

-- ------------------------------------------------------------
-- TRG-01: Validar correo y telefono al insertar usuario (INV-02, INV-03)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_insert_usuario //
CREATE TRIGGER trg_before_insert_usuario
BEFORE INSERT ON usuario FOR EACH ROW
BEGIN
    IF NEW.correo_electronico NOT LIKE '%@%.%' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-02: Correo electronico invalido';
    END IF;
    IF CHAR_LENGTH(NEW.telefono) < 7 OR CHAR_LENGTH(NEW.telefono) > 15 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-03: Telefono debe tener entre 7 y 15 digitos';
    END IF;
END //

-- TRG-01b: Misma validacion en UPDATE de usuario
DROP TRIGGER IF EXISTS trg_before_update_usuario //
CREATE TRIGGER trg_before_update_usuario
BEFORE UPDATE ON usuario FOR EACH ROW
BEGIN
    IF NEW.correo_electronico NOT LIKE '%@%.%' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-02: Correo electronico invalido';
    END IF;
    IF CHAR_LENGTH(NEW.telefono) < 7 OR CHAR_LENGTH(NEW.telefono) > 15 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-03: Telefono debe tener entre 7 y 15 digitos';
    END IF;
END //

-- ------------------------------------------------------------
-- TRG-02: Validar mayoria de edad al insertar cliente PN (INV-06)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_insert_cliente_pn //
CREATE TRIGGER trg_before_insert_cliente_pn
BEFORE INSERT ON cliente_persona_natural FOR EACH ROW
BEGIN
    IF TIMESTAMPDIFF(YEAR, NEW.fecha_nacimiento, CURDATE()) < 18 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-06: El cliente debe ser mayor de edad (18 anos)';
    END IF;
END //

-- ------------------------------------------------------------
-- TRG-03: Validar usuario activo al abrir cuenta (INV-11)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_insert_cuenta //
CREATE TRIGGER trg_before_insert_cuenta
BEFORE INSERT ON cuenta_bancaria FOR EACH ROW
BEGIN
    DECLARE v_estado_nombre VARCHAR(30);
    SELECT ceu.nombre_estado INTO v_estado_nombre
    FROM usuario u
    JOIN cat_estado_usuario ceu ON u.id_estado_usuario = ceu.id_estado_usuario
    WHERE u.id_usuario = NEW.id_usuario_apertura;
    IF v_estado_nombre IS NULL OR v_estado_nombre != 'Activo' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-11: No se puede abrir cuenta para usuario inactivo';
    END IF;
    SET NEW.fecha_apertura = COALESCE(NEW.fecha_apertura, CURDATE());
END //

-- ------------------------------------------------------------
-- TRG-04: Proteger moneda inmutable y saldo no negativo (INV-09, INV-13)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_update_cuenta //
CREATE TRIGGER trg_before_update_cuenta
BEFORE UPDATE ON cuenta_bancaria FOR EACH ROW
BEGIN
    IF NEW.id_moneda != OLD.id_moneda THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-13: La moneda de una cuenta es inmutable tras su apertura';
    END IF;
    IF NEW.saldo_actual < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-09: El saldo de una cuenta no puede ser negativo';
    END IF;
END //

-- ------------------------------------------------------------
-- TRG-05: Registrar en bitacora cambios de saldo/estado de cuenta (INV-28, EVT-07)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_update_cuenta //
CREATE TRIGGER trg_after_update_cuenta
AFTER UPDATE ON cuenta_bancaria FOR EACH ROW
BEGIN
    DECLARE v_json JSON;
    IF NEW.saldo_actual != OLD.saldo_actual OR NEW.id_estado_cuenta != OLD.id_estado_cuenta THEN
        SET v_json = JSON_OBJECT(
            'numero_cuenta',  OLD.numero_cuenta,
            'saldo_antes',    OLD.saldo_actual,
            'saldo_despues',  NEW.saldo_actual,
            'estado_antes',   OLD.id_estado_cuenta,
            'estado_despues', NEW.id_estado_cuenta
        );
        CALL sp_registrar_bitacora(
            'CUENTA',
            COALESCE(@id_usuario_sesion, 0),
            COALESCE(@rol_sesion, 'SISTEMA'),
            OLD.numero_cuenta,
            'CUENTA',
            v_json
        );
    END IF;
END //

-- ------------------------------------------------------------
-- TRG-06: Validar cliente activo y forzar estado inicial al crear prestamo (INV-19, RP-01)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_insert_prestamo //
CREATE TRIGGER trg_before_insert_prestamo
BEFORE INSERT ON prestamo FOR EACH ROW
BEGIN
    DECLARE v_estado_usr    VARCHAR(30);
    DECLARE v_id_en_estudio TINYINT UNSIGNED;
    SELECT ceu.nombre_estado INTO v_estado_usr
    FROM usuario u
    JOIN cat_estado_usuario ceu ON u.id_estado_usuario = ceu.id_estado_usuario
    WHERE u.id_usuario = NEW.id_usuario_solicitante;
    IF v_estado_usr IS NULL OR v_estado_usr != 'Activo' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-19: Cliente inactivo no puede solicitar prestamos';
    END IF;
    SELECT id_estado_prestamo INTO v_id_en_estudio
    FROM cat_estado_prestamo WHERE nombre_estado = 'En Estudio';
    SET NEW.id_estado_prestamo = v_id_en_estudio;
    SET NEW.fecha_solicitud    = NOW();
END //

-- ------------------------------------------------------------
-- TRG-07: Validar transicion de estado y rol en prestamo (INV-14, INV-15)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_update_prestamo //
CREATE TRIGGER trg_before_update_prestamo
BEFORE UPDATE ON prestamo FOR EACH ROW
BEGIN
    DECLARE v_rol_req    TINYINT UNSIGNED;
    DECLARE v_rol_actual TINYINT UNSIGNED;
    IF NEW.id_estado_prestamo != OLD.id_estado_prestamo THEN
        SELECT id_rol_requerido INTO v_rol_req
        FROM prestamo_transicion_estado
        WHERE id_estado_origen  = OLD.id_estado_prestamo
          AND id_estado_destino = NEW.id_estado_prestamo;
        IF v_rol_req IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-15: Transicion de estado de prestamo no permitida';
        END IF;
        SELECT id_rol INTO v_rol_actual
        FROM usuario WHERE id_usuario = COALESCE(@id_usuario_sesion, 0);
        IF v_rol_actual IS NULL OR v_rol_actual != v_rol_req THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-14: Rol no autorizado para esta transicion de prestamo';
        END IF;
    END IF;
END //

-- ------------------------------------------------------------
-- TRG-08: Registrar cambio de estado de prestamo en bitacora (INV-28, RP-06)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_update_prestamo //
CREATE TRIGGER trg_after_update_prestamo
AFTER UPDATE ON prestamo FOR EACH ROW
BEGIN
    DECLARE v_json         JSON;
    DECLARE v_nom_anterior VARCHAR(40);
    DECLARE v_nom_nuevo    VARCHAR(40);
    IF NEW.id_estado_prestamo != OLD.id_estado_prestamo THEN
        SELECT nombre_estado INTO v_nom_anterior
        FROM cat_estado_prestamo WHERE id_estado_prestamo = OLD.id_estado_prestamo;
        SELECT nombre_estado INTO v_nom_nuevo
        FROM cat_estado_prestamo WHERE id_estado_prestamo = NEW.id_estado_prestamo;
        SET v_json = JSON_OBJECT(
            'id_prestamo',     OLD.id_prestamo,
            'estado_anterior', v_nom_anterior,
            'estado_nuevo',    v_nom_nuevo,
            'monto_aprobado',  NEW.monto_aprobado,
            'tasa_interes',    NEW.tasa_interes,
            'plazo_meses',     NEW.plazo_meses,
            'motivo_rechazo',  COALESCE(@motivo_rechazo_prestamo, NULL)
        );
        SET @motivo_rechazo_prestamo = NULL;
        CALL sp_registrar_bitacora(
            'PRESTAMO',
            COALESCE(@id_usuario_sesion, 0),
            COALESCE(@rol_sesion, 'SISTEMA'),
            CAST(OLD.id_prestamo AS CHAR),
            'PRESTAMO',
            v_json
        );
    END IF;
END //

-- ------------------------------------------------------------
-- TRG-09: Validar cuentas activas, monto y asignar estado al crear transferencia
-- (INV-20, INV-22, RP-07, RP-08)
-- Para transferencias directas (monto <= umbral): ejecuta fondos aqui mismo
-- en BEFORE INSERT usando NEW.* para snapshots y estado = Ejecutada.
-- Asi TRG-10 (AFTER INSERT) solo registra en bitacora, sin tocar transferencia.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_insert_transferencia //
CREATE TRIGGER trg_before_insert_transferencia
BEFORE INSERT ON transferencia FOR EACH ROW
BEGIN
    DECLARE v_est_origen  VARCHAR(30);
    DECLARE v_est_destino VARCHAR(30);
    DECLARE v_est_usr     VARCHAR(30);
    DECLARE v_umbral      DECIMAL(18,2);
    DECLARE v_id_espera   TINYINT UNSIGNED;
    DECLARE v_id_pend     TINYINT UNSIGNED;
    DECLARE v_id_ejec     TINYINT UNSIGNED;
    DECLARE v_saldo_orig  DECIMAL(18,2);
    DECLARE v_saldo_dest  DECIMAL(18,2);

    -- GUARDIA: lote ya proceso esta fila con fondos movidos y estado asignado
    IF COALESCE(@trg_transf_ejecutando, 0) = 0 THEN

        -- INV-24: cuentas distintas
        IF NEW.cuenta_origen = NEW.cuenta_destino THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-24: Las cuentas origen y destino no pueden ser la misma';
        END IF;
        -- INV-20: monto > 0
        IF NEW.monto <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-20: El monto de transferencia debe ser mayor a cero';
        END IF;
        -- INV-22: cuenta origen activa
        SELECT cec.nombre_estado INTO v_est_origen
        FROM cuenta_bancaria cb
        JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
        WHERE cb.numero_cuenta = NEW.cuenta_origen;
        IF v_est_origen IS NULL OR v_est_origen != 'Activa' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-22: Cuenta origen bloqueada o cerrada';
        END IF;
        -- INV-22: cuenta destino activa
        SELECT cec.nombre_estado INTO v_est_destino
        FROM cuenta_bancaria cb
        JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
        WHERE cb.numero_cuenta = NEW.cuenta_destino;
        IF v_est_destino IS NULL OR v_est_destino != 'Activa' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-22: Cuenta destino bloqueada o cerrada';
        END IF;
        -- INV-04: usuario creador activo
        SELECT ceu.nombre_estado INTO v_est_usr
        FROM usuario u
        JOIN cat_estado_usuario ceu ON u.id_estado_usuario = ceu.id_estado_usuario
        WHERE u.id_usuario = NEW.id_usuario_creador;
        IF v_est_usr IS NULL OR v_est_usr != 'Activo' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-04: Usuario creador inactivo';
        END IF;
        -- Umbral vigente obligatorio
        SELECT monto_umbral INTO v_umbral
        FROM config_umbral_transferencia WHERE vigente = TRUE LIMIT 1;
        IF v_umbral IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No existe umbral de transferencia vigente. Contacte al administrador.';
        END IF;
        -- RP-12: fecha de vencimiento
        SET NEW.fecha_vencimiento = DATE_ADD(NOW(), INTERVAL 60 MINUTE);

        IF NEW.monto > v_umbral THEN
            -- Requiere aprobacion: estado En Espera
            SELECT id_estado_transferencia INTO v_id_espera
            FROM cat_estado_transferencia WHERE nombre_estado = 'En Espera de Aprobacion';
            SET NEW.requiere_aprobacion     = TRUE;
            SET NEW.id_estado_transferencia = v_id_espera;
        ELSE
            -- Ejecucion directa: validar saldo y mover fondos AQUI en BEFORE INSERT
            -- usando UPDATE cuenta_bancaria (tabla distinta = permitido).
            -- Los snapshots se guardan en NEW.* para que queden en el INSERT.
            IF NEW.monto <= 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-20: Monto invalido';
            END IF;
            SELECT saldo_actual INTO v_saldo_orig FROM cuenta_bancaria WHERE numero_cuenta = NEW.cuenta_origen;
            SELECT saldo_actual INTO v_saldo_dest FROM cuenta_bancaria WHERE numero_cuenta = NEW.cuenta_destino;
            IF v_saldo_orig < NEW.monto THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-21: Saldo insuficiente en cuenta origen';
            END IF;
            -- Mover fondos
            UPDATE cuenta_bancaria SET saldo_actual = saldo_actual - NEW.monto WHERE numero_cuenta = NEW.cuenta_origen;
            UPDATE cuenta_bancaria SET saldo_actual = saldo_actual + NEW.monto WHERE numero_cuenta = NEW.cuenta_destino;
            -- Guardar snapshots en NEW.* (se persisten con el INSERT, sin UPDATE posterior)
            SET NEW.saldo_origen_antes    = v_saldo_orig;
            SET NEW.saldo_destino_antes   = v_saldo_dest;
            SET NEW.saldo_origen_despues  = v_saldo_orig  - NEW.monto;
            SET NEW.saldo_destino_despues = v_saldo_dest  + NEW.monto;
            -- Estado final directo
            SELECT id_estado_transferencia INTO v_id_ejec
            FROM cat_estado_transferencia WHERE nombre_estado = 'Ejecutada';
            SET NEW.requiere_aprobacion     = FALSE;
            SET NEW.id_estado_transferencia = v_id_ejec;
        END IF;

    END IF; -- fin guardia @trg_transf_ejecutando
END //

-- ------------------------------------------------------------
-- TRG-10: Registrar en bitacora la transferencia creada (RP-07, EVT)
-- Ya NO ejecuta fondos ni hace UPDATE sobre transferencia.
-- Los fondos y el estado ya fueron asignados en TRG-09 (BEFORE INSERT).
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_insert_transferencia //
CREATE TRIGGER trg_after_insert_transferencia
AFTER INSERT ON transferencia FOR EACH ROW
BEGIN
    DECLARE v_json JSON;
    IF COALESCE(@trg_transf_ejecutando, 0) = 0 THEN
        SET v_json = JSON_OBJECT(
            'monto',               NEW.monto,
            'origen',              NEW.cuenta_origen,
            'destino',             NEW.cuenta_destino,
            'requiere_aprobacion', NEW.requiere_aprobacion,
            'estado',              NEW.id_estado_transferencia
        );
        CALL sp_registrar_bitacora(
            'TRANSFERENCIA_CREADA',
            COALESCE(@id_usuario_sesion, 0),
            COALESCE(@rol_sesion, 'SISTEMA'),
            CAST(NEW.id_transferencia AS CHAR),
            'TRANSFERENCIA',
            v_json
        );
    END IF;
END //

-- ------------------------------------------------------------
-- TRG-11: BEFORE UPDATE transferencia
-- Responsabilidades:
--   a) Validar transicion de estado y rol (INV-23, INV-25)
--   b) Cuando la transicion es Aprobada → Ejecutada:
--      mover fondos en cuenta_bancaria y escribir snapshots en NEW.*
--      Esto evita el Error 1442 (UPDATE sobre tabla en uso por trigger).
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_update_transferencia //
CREATE TRIGGER trg_before_update_transferencia
BEFORE UPDATE ON transferencia FOR EACH ROW
BEGIN
    DECLARE v_count       INT DEFAULT 0;
    DECLARE v_rol_req     TINYINT UNSIGNED;
    DECLARE v_rol_actual  TINYINT UNSIGNED;
    DECLARE v_est_ant     VARCHAR(40);
    DECLARE v_est_nuevo   VARCHAR(40);
    DECLARE v_saldo_orig  DECIMAL(18,2);
    DECLARE v_saldo_dest  DECIMAL(18,2);
    DECLARE v_est_orig    VARCHAR(30);
    DECLARE v_est_dest    VARCHAR(30);
    DECLARE v_id_ejec     TINYINT UNSIGNED;

    IF NEW.id_estado_transferencia != OLD.id_estado_transferencia THEN

        SELECT nombre_estado INTO v_est_ant
        FROM cat_estado_transferencia
        WHERE id_estado_transferencia = OLD.id_estado_transferencia;

        SELECT nombre_estado INTO v_est_nuevo
        FROM cat_estado_transferencia
        WHERE id_estado_transferencia = NEW.id_estado_transferencia;

        -- INV-23: transferencia vencida no puede modificarse
        IF v_est_ant = 'Vencida' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-23: Transferencia vencida no puede modificarse';
        END IF;

        -- Validar transicion permitida en la maquina de estados
        SELECT COUNT(*) INTO v_count
        FROM transferencia_transicion_estado
        WHERE id_estado_origen  = OLD.id_estado_transferencia
          AND id_estado_destino = NEW.id_estado_transferencia;
        IF v_count = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transicion de estado de transferencia no permitida';
        END IF;

        -- INV-25: validar rol solo para cambios iniciados por usuario (no SISTEMA ni ejecucion interna)
        IF NOT (COALESCE(@rol_sesion, '') = 'SISTEMA'
                OR COALESCE(@trg_transf_ejecutando, 0) = 1) THEN
            SELECT id_rol_requerido INTO v_rol_req
            FROM transferencia_transicion_estado
            WHERE id_estado_origen  = OLD.id_estado_transferencia
              AND id_estado_destino = NEW.id_estado_transferencia;
            SELECT id_rol INTO v_rol_actual
            FROM usuario WHERE id_usuario = COALESCE(@id_usuario_sesion, 0);
            IF v_rol_actual IS NULL OR v_rol_actual != v_rol_req THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-25: Rol no autorizado para esta transicion de transferencia';
            END IF;
        END IF;

        -- -------------------------------------------------------
        -- Flujo de aprobacion: Aprobada → Ejecutada
        -- Mover fondos aqui en BEFORE UPDATE y escribir snapshots
        -- en NEW.* para evitar Error 1442 en AFTER UPDATE.
        -- -------------------------------------------------------
        IF v_est_ant = 'Aprobada' AND v_est_nuevo = 'Ejecutada' THEN

            SELECT cb.saldo_actual, cec.nombre_estado
            INTO v_saldo_orig, v_est_orig
            FROM cuenta_bancaria cb
            JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
            WHERE cb.numero_cuenta = OLD.cuenta_origen;

            SELECT cb.saldo_actual, cec.nombre_estado
            INTO v_saldo_dest, v_est_dest
            FROM cuenta_bancaria cb
            JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
            WHERE cb.numero_cuenta = OLD.cuenta_destino;

            IF v_est_orig != 'Activa' THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-22: Cuenta origen no esta activa';
            END IF;
            IF v_est_dest != 'Activa' THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-22: Cuenta destino no esta activa';
            END IF;
            IF v_saldo_orig < OLD.monto THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-21: Saldo insuficiente en cuenta origen';
            END IF;

            -- Mover fondos (cuenta_bancaria es tabla distinta: permitido)
            UPDATE cuenta_bancaria SET saldo_actual = saldo_actual - OLD.monto WHERE numero_cuenta = OLD.cuenta_origen;
            UPDATE cuenta_bancaria SET saldo_actual = saldo_actual + OLD.monto WHERE numero_cuenta = OLD.cuenta_destino;

            -- Escribir snapshots en NEW.* (se persisten con el UPDATE, sin UPDATE adicional)
            SET NEW.saldo_origen_antes    = v_saldo_orig;
            SET NEW.saldo_destino_antes   = v_saldo_dest;
            SET NEW.saldo_origen_despues  = v_saldo_orig  - OLD.monto;
            SET NEW.saldo_destino_despues = v_saldo_dest  + OLD.monto;

        END IF; -- fin bloque Aprobada → Ejecutada

    END IF; -- fin cambio de estado
END //

-- ------------------------------------------------------------
-- TRG-12: AFTER UPDATE transferencia — solo bitacora (INV-28, RP-13)
-- Ya NO llama sp_ejecutar_transferencia_interna ni hace UPDATE
-- sobre transferencia. Los fondos y snapshots ya fueron manejados
-- en TRG-11 (BEFORE UPDATE) usando NEW.*.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_update_transferencia //
CREATE TRIGGER trg_after_update_transferencia
AFTER UPDATE ON transferencia FOR EACH ROW
BEGIN
    DECLARE v_json       JSON;
    DECLARE v_est_nombre VARCHAR(40);

    IF NEW.id_estado_transferencia != OLD.id_estado_transferencia THEN

        SELECT nombre_estado INTO v_est_nombre
        FROM cat_estado_transferencia
        WHERE id_estado_transferencia = NEW.id_estado_transferencia;

        IF v_est_nombre = 'Ejecutada' THEN
            SET v_json = JSON_OBJECT(
                'cuenta_origen',         NEW.cuenta_origen,
                'cuenta_destino',        NEW.cuenta_destino,
                'monto',                 NEW.monto,
                'saldo_origen_antes',    COALESCE(NEW.saldo_origen_antes,    0),
                'saldo_origen_despues',  COALESCE(NEW.saldo_origen_despues,  0),
                'saldo_destino_antes',   COALESCE(NEW.saldo_destino_antes,   0),
                'saldo_destino_despues', COALESCE(NEW.saldo_destino_despues, 0)
            );
        ELSEIF v_est_nombre = 'Vencida' THEN
            SET v_json = JSON_OBJECT(
                'id_transferencia',  OLD.id_transferencia,
                'estado_anterior',   OLD.id_estado_transferencia,
                'estado_nuevo',      'Vencida',
                'motivo',            'Tiempo de aprobacion expirado',
                'fecha_creacion',    COALESCE(CAST(OLD.fecha_creacion AS CHAR), ''),
                'fecha_vencimiento', COALESCE(CAST(OLD.fecha_vencimiento AS CHAR), '')
            );
        ELSE
            SET v_json = JSON_OBJECT(
                'id_transferencia', OLD.id_transferencia,
                'estado_anterior',  OLD.id_estado_transferencia,
                'estado_nuevo',     NEW.id_estado_transferencia
            );
        END IF;

        CALL sp_registrar_bitacora(
            'TRANSFERENCIA',
            COALESCE(@id_usuario_sesion, 0),
            COALESCE(@rol_sesion, 'SISTEMA'),
            CAST(OLD.id_transferencia AS CHAR),
            'TRANSFERENCIA',
            v_json
        );

    END IF;
END //

-- ------------------------------------------------------------
-- TRG-13: Event Scheduler  vencimiento automatico de transferencias (RP-12)
-- CORRECCION: ahora esta correctamente FUERA del cuerpo de TRG-12
-- ------------------------------------------------------------
DROP EVENT IF EXISTS evt_vencimiento_transferencias //
CREATE EVENT evt_vencimiento_transferencias
ON SCHEDULE EVERY 1 MINUTE
COMMENT 'RP-12: Marca como Vencidas las transferencias expiradas'
DO
BEGIN
    DECLARE v_id_vencida TINYINT UNSIGNED;
    DECLARE v_id_espera  TINYINT UNSIGNED;
    SELECT id_estado_transferencia INTO v_id_vencida
    FROM cat_estado_transferencia WHERE nombre_estado = 'Vencida';
    SELECT id_estado_transferencia INTO v_id_espera
    FROM cat_estado_transferencia WHERE nombre_estado = 'En Espera de Aprobacion';
    SET @id_usuario_sesion = 0;
    SET @rol_sesion = 'SISTEMA';
    UPDATE transferencia
    SET id_estado_transferencia = v_id_vencida
    WHERE id_estado_transferencia = v_id_espera
      AND NOW() > fecha_vencimiento;
    -- TRG-12 se dispara por cada fila actualizada y registra en bitacora
END //

-- ------------------------------------------------------------
-- TRG-14: Garantizar un solo umbral vigente (config_umbral_transferencia)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_insert_umbral //
CREATE TRIGGER trg_before_insert_umbral
BEFORE INSERT ON config_umbral_transferencia FOR EACH ROW
BEGIN
    DECLARE v_count INT DEFAULT 0;
    IF NEW.vigente = TRUE THEN
        SELECT COUNT(*) INTO v_count
        FROM config_umbral_transferencia WHERE vigente = TRUE;
        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ya existe un umbral vigente. Desactive el actual antes de crear uno nuevo.';
        END IF;
    END IF;
END //


-- ============================================================
-- TRIGGERS ADICIONALES — Bitacora de eventos de creacion
-- Agregan trazabilidad completa segun PDF:
-- "Toda operacion significativa debe ser registrada en bitacora"
-- ============================================================

-- TRG-15: Registrar creacion de usuario en bitacora (EVT-01)
DROP TRIGGER IF EXISTS trg_after_insert_usuario //
CREATE TRIGGER trg_after_insert_usuario
AFTER INSERT ON usuario FOR EACH ROW
BEGIN
    CALL sp_registrar_bitacora(
        'USUARIO_CREADO',
        COALESCE(@id_usuario_sesion, 0),
        COALESCE(@rol_sesion, 'SISTEMA'),
        CAST(NEW.id_usuario AS CHAR),
        'USUARIO',
        JSON_OBJECT(
            'nombre_completo',   NEW.nombre_completo,
            'id_identificacion', NEW.id_identificacion,
            'id_rol',            NEW.id_rol,
            'id_estado',         NEW.id_estado_usuario
        )
    );
END //

-- TRG-16: Registrar creacion de cliente persona natural en bitacora (EVT-03)
DROP TRIGGER IF EXISTS trg_after_insert_cliente_pn //
CREATE TRIGGER trg_after_insert_cliente_pn
AFTER INSERT ON cliente_persona_natural FOR EACH ROW
BEGIN
    CALL sp_registrar_bitacora(
        'CLIENTE_PN_CREADO',
        COALESCE(@id_usuario_sesion, 0),
        COALESCE(@rol_sesion, 'SISTEMA'),
        NEW.id_identificacion,
        'CLIENTE_PN',
        JSON_OBJECT(
            'nombre_completo',    NEW.nombre_completo,
            'id_identificacion',  NEW.id_identificacion,
            'correo_electronico', NEW.correo_electronico,
            'id_usuario',         NEW.id_usuario
        )
    );
END //

-- TRG-17: Registrar creacion de cliente empresa en bitacora (EVT-04)
DROP TRIGGER IF EXISTS trg_after_insert_cliente_empresa //
CREATE TRIGGER trg_after_insert_cliente_empresa
AFTER INSERT ON cliente_empresa FOR EACH ROW
BEGIN
    CALL sp_registrar_bitacora(
        'CLIENTE_EMPRESA_CREADO',
        COALESCE(@id_usuario_sesion, 0),
        COALESCE(@rol_sesion, 'SISTEMA'),
        NEW.nit,
        'CLIENTE_EMPRESA',
        JSON_OBJECT(
            'razon_social',          NEW.razon_social,
            'nit',                   NEW.nit,
            'id_representante_legal',NEW.id_representante_legal,
            'id_usuario',            NEW.id_usuario
        )
    );
END //

-- TRG-18: Registrar apertura de cuenta en bitacora (EVT-05)
-- Complementa TRG-03 (BEFORE INSERT) que solo valida.
-- Este registra el evento de apertura exitosa.
DROP TRIGGER IF EXISTS trg_after_insert_cuenta //
CREATE TRIGGER trg_after_insert_cuenta
AFTER INSERT ON cuenta_bancaria FOR EACH ROW
BEGIN
    CALL sp_registrar_bitacora(
        'CUENTA_ABIERTA',
        COALESCE(@id_usuario_sesion, NEW.id_usuario_apertura),
        COALESCE(@rol_sesion, 'SISTEMA'),
        NEW.numero_cuenta,
        'CUENTA',
        JSON_OBJECT(
            'numero_cuenta',    NEW.numero_cuenta,
            'id_tipo_cuenta',   NEW.id_tipo_cuenta,
            'id_titular',       NEW.id_titular,
            'tipo_titular',     NEW.tipo_titular,
            'saldo_inicial',    NEW.saldo_actual,
            'id_moneda',        NEW.id_moneda,
            'fecha_apertura',   CAST(NEW.fecha_apertura AS CHAR)
        )
    );
END //

-- TRG-19: Registrar solicitud de prestamo en bitacora (EVT-08)
-- Complementa TRG-06 (BEFORE INSERT) que fuerza estado inicial.
-- Este registra el evento de solicitud exitosa.
DROP TRIGGER IF EXISTS trg_after_insert_prestamo //
CREATE TRIGGER trg_after_insert_prestamo
AFTER INSERT ON prestamo FOR EACH ROW
BEGIN
    CALL sp_registrar_bitacora(
        'PRESTAMO_SOLICITADO',
        COALESCE(@id_usuario_sesion, NEW.id_usuario_solicitante),
        COALESCE(@rol_sesion, 'SISTEMA'),
        CAST(NEW.id_prestamo AS CHAR),
        'PRESTAMO',
        JSON_OBJECT(
            'id_prestamo',              NEW.id_prestamo,
            'id_tipo_prestamo',         NEW.id_tipo_prestamo,
            'id_cliente_solicitante',   NEW.id_cliente_solicitante,
            'tipo_cliente',             NEW.tipo_cliente,
            'monto_solicitado',         NEW.monto_solicitado,
            'estado_inicial',           'En Estudio'
        )
    );
END //
DELIMITER ;
