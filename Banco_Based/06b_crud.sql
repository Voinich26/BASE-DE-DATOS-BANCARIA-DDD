-- ============================================================
-- 06b_crud.sql
-- CRUD Operativo de Dominio  Servicios faltantes
-- Ejecutar despues de 06_procedures.sql
-- Complementa 06_procedures.sql SIN modificarlo.
-- Referencia: PDF 'Actividad Banco' + Banco.md
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
DELIMITER //

-- ============================================================
-- BC-01: USUARIOS
-- ============================================================

-- sp_crear_usuario
-- Registra un nuevo usuario en el sistema.
-- Valida unicidad de identificacion y correo.
-- Registra el evento en bitacora.
DROP PROCEDURE IF EXISTS sp_crear_usuario //
CREATE PROCEDURE sp_crear_usuario(
    IN p_nombre_completo    VARCHAR(200),
    IN p_id_identificacion  VARCHAR(30),
    IN p_correo             VARCHAR(150),
    IN p_telefono           VARCHAR(15),
    IN p_fecha_nacimiento   DATE,
    IN p_direccion          VARCHAR(300),
    IN p_nombre_rol         VARCHAR(60),
    IN p_id_relacionado     VARCHAR(30),
    OUT p_id_usuario_nuevo  INT UNSIGNED
)
COMMENT 'BC-01: Crea un nuevo usuario del sistema con rol y estado Activo'
BEGIN
    DECLARE v_id_rol          TINYINT UNSIGNED;
    DECLARE v_id_estado_activo TINYINT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    SET @id_usuario_sesion = COALESCE(@id_usuario_sesion, 0);
    SET @rol_sesion        = COALESCE(@rol_sesion, 'SISTEMA');

    -- Validar rol existe
    SELECT id_rol INTO v_id_rol FROM cat_rol WHERE nombre_rol = p_nombre_rol;
    IF v_id_rol IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rol no valido';
    END IF;

    SELECT id_estado_usuario INTO v_id_estado_activo
    FROM cat_estado_usuario WHERE nombre_estado = 'Activo';

    START TRANSACTION;

    INSERT INTO usuario (
        nombre_completo, id_identificacion, correo_electronico,
        telefono, fecha_nacimiento, direccion,
        id_rol, id_estado_usuario, id_relacionado
    ) VALUES (
        p_nombre_completo, p_id_identificacion, p_correo,
        p_telefono, p_fecha_nacimiento, p_direccion,
        v_id_rol, v_id_estado_activo, p_id_relacionado
    );

    SET p_id_usuario_nuevo = LAST_INSERT_ID();

    CALL sp_registrar_bitacora(
        'USUARIO_CREADO', @id_usuario_sesion, @rol_sesion,
        CAST(p_id_usuario_nuevo AS CHAR), 'USUARIO',
        JSON_OBJECT('nombre', p_nombre_completo, 'identificacion', p_id_identificacion, 'rol', p_nombre_rol)
    );

    COMMIT;
END //

-- sp_cambiar_estado_usuario
-- Activa, inactiva o bloquea un usuario.
DROP PROCEDURE IF EXISTS sp_cambiar_estado_usuario //
CREATE PROCEDURE sp_cambiar_estado_usuario(
    IN p_id_usuario    INT UNSIGNED,
    IN p_nuevo_estado  VARCHAR(30),
    IN p_motivo        VARCHAR(200)
)
COMMENT 'BC-01: Cambia el estado de un usuario (Activo/Inactivo/Bloqueado)'
BEGIN
    DECLARE v_id_estado_nuevo TINYINT UNSIGNED;
    DECLARE v_estado_actual   VARCHAR(30);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    SELECT id_estado_usuario INTO v_id_estado_nuevo
    FROM cat_estado_usuario WHERE nombre_estado = p_nuevo_estado;
    IF v_id_estado_nuevo IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estado de usuario no valido';
    END IF;

    START TRANSACTION;

    SELECT ceu.nombre_estado INTO v_estado_actual
    FROM usuario u JOIN cat_estado_usuario ceu ON u.id_estado_usuario = ceu.id_estado_usuario
    WHERE u.id_usuario = p_id_usuario FOR UPDATE;
    IF v_estado_actual IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado';
    END IF;

    UPDATE usuario SET id_estado_usuario = v_id_estado_nuevo, fecha_modificacion = NOW()
    WHERE id_usuario = p_id_usuario;

    CALL sp_registrar_bitacora(
        'USUARIO_ESTADO_CAMBIADO', COALESCE(@id_usuario_sesion,0), COALESCE(@rol_sesion,'SISTEMA'),
        CAST(p_id_usuario AS CHAR), 'USUARIO',
        JSON_OBJECT('estado_anterior', v_estado_actual, 'estado_nuevo', p_nuevo_estado, 'motivo', p_motivo)
    );

    COMMIT;
END //

-- sp_asignar_rol
-- Cambia el rol de un usuario existente.
DROP PROCEDURE IF EXISTS sp_asignar_rol //
CREATE PROCEDURE sp_asignar_rol(
    IN p_id_usuario  INT UNSIGNED,
    IN p_nombre_rol  VARCHAR(60)
)
COMMENT 'BC-01: Asigna o cambia el rol de un usuario'
BEGIN
    DECLARE v_id_rol_nuevo TINYINT UNSIGNED;
    DECLARE v_rol_anterior VARCHAR(60);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    SELECT id_rol INTO v_id_rol_nuevo FROM cat_rol WHERE nombre_rol = p_nombre_rol;
    IF v_id_rol_nuevo IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rol no valido';
    END IF;

    START TRANSACTION;

    SELECT cr.nombre_rol INTO v_rol_anterior
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_usuario FOR UPDATE;
    IF v_rol_anterior IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado';
    END IF;

    UPDATE usuario SET id_rol = v_id_rol_nuevo, fecha_modificacion = NOW()
    WHERE id_usuario = p_id_usuario;

    CALL sp_registrar_bitacora(
        'USUARIO_ROL_CAMBIADO', COALESCE(@id_usuario_sesion,0), COALESCE(@rol_sesion,'SISTEMA'),
        CAST(p_id_usuario AS CHAR), 'USUARIO',
        JSON_OBJECT('rol_anterior', v_rol_anterior, 'rol_nuevo', p_nombre_rol)
    );

    COMMIT;
END //

-- ============================================================
-- BC-02: CLIENTES
-- ============================================================

-- sp_crear_cliente_persona
-- Registra un cliente persona natural. Crea tambien su usuario del sistema.
DROP PROCEDURE IF EXISTS sp_crear_cliente_persona //
CREATE PROCEDURE sp_crear_cliente_persona(
    IN p_id_identificacion  VARCHAR(30),
    IN p_tipo_identificacion VARCHAR(20),
    IN p_nombre_completo    VARCHAR(200),
    IN p_correo             VARCHAR(150),
    IN p_telefono           VARCHAR(15),
    IN p_fecha_nacimiento   DATE,
    IN p_direccion          VARCHAR(300),
    IN p_id_usuario         INT UNSIGNED
)
COMMENT 'BC-02: Registra un cliente persona natural vinculado a un usuario'
BEGIN
    DECLARE v_estado_usr VARCHAR(30);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Validar que el usuario exista y este activo
    SELECT ceu.nombre_estado INTO v_estado_usr
    FROM usuario u JOIN cat_estado_usuario ceu ON u.id_estado_usuario = ceu.id_estado_usuario
    WHERE u.id_usuario = p_id_usuario;
    IF v_estado_usr IS NULL OR v_estado_usr != 'Activo' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario debe existir y estar Activo';
    END IF;

    START TRANSACTION;

    INSERT INTO cliente_persona_natural (
        id_identificacion, tipo_identificacion, nombre_completo,
        correo_electronico, telefono, fecha_nacimiento, direccion, id_usuario
    ) VALUES (
        p_id_identificacion, p_tipo_identificacion, p_nombre_completo,
        p_correo, p_telefono, p_fecha_nacimiento, p_direccion, p_id_usuario
    );

    -- Actualizar id_relacionado en usuario
    UPDATE usuario SET id_relacionado = p_id_identificacion, fecha_modificacion = NOW()
    WHERE id_usuario = p_id_usuario;

    CALL sp_registrar_bitacora(
        'CLIENTE_PN_CREADO', COALESCE(@id_usuario_sesion,0), COALESCE(@rol_sesion,'SISTEMA'),
        p_id_identificacion, 'CLIENTE_PN',
        JSON_OBJECT('nombre', p_nombre_completo, 'identificacion', p_id_identificacion, 'correo', p_correo)
    );

    COMMIT;
END //

-- sp_actualizar_cliente_persona
-- Actualiza datos de contacto de un cliente persona natural.
DROP PROCEDURE IF EXISTS sp_actualizar_cliente_persona //
CREATE PROCEDURE sp_actualizar_cliente_persona(
    IN p_id_identificacion VARCHAR(30),
    IN p_correo            VARCHAR(150),
    IN p_telefono          VARCHAR(15),
    IN p_direccion         VARCHAR(300)
)
COMMENT 'BC-02: Actualiza datos de contacto de un cliente persona natural'
BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    SELECT COUNT(*) INTO v_existe FROM cliente_persona_natural WHERE id_identificacion = p_id_identificacion;
    IF v_existe = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cliente persona natural no encontrado';
    END IF;

    START TRANSACTION;

    UPDATE cliente_persona_natural SET
        correo_electronico = COALESCE(p_correo,    correo_electronico),
        telefono           = COALESCE(p_telefono,  telefono),
        direccion          = COALESCE(p_direccion, direccion),
        fecha_modificacion = NOW()
    WHERE id_identificacion = p_id_identificacion;

    CALL sp_registrar_bitacora(
        'CLIENTE_PN_ACTUALIZADO', COALESCE(@id_usuario_sesion,0), COALESCE(@rol_sesion,'SISTEMA'),
        p_id_identificacion, 'CLIENTE_PN',
        JSON_OBJECT('correo_nuevo', p_correo, 'telefono_nuevo', p_telefono)
    );

    COMMIT;
END //

-- sp_crear_cliente_empresa
-- Registra una empresa cliente con su representante legal.
DROP PROCEDURE IF EXISTS sp_crear_cliente_empresa //
CREATE PROCEDURE sp_crear_cliente_empresa(
    IN p_nit                    VARCHAR(30),
    IN p_razon_social           VARCHAR(200),
    IN p_correo                 VARCHAR(150),
    IN p_telefono               VARCHAR(15),
    IN p_direccion              VARCHAR(300),
    IN p_id_representante_legal VARCHAR(30),
    IN p_id_usuario             INT UNSIGNED
)
COMMENT 'BC-02: Registra una empresa cliente con representante legal obligatorio'
BEGIN
    DECLARE v_rep_existe INT DEFAULT 0;
    DECLARE v_estado_usr VARCHAR(30);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Validar representante legal existe (INV-07)
    SELECT COUNT(*) INTO v_rep_existe FROM cliente_persona_natural WHERE id_identificacion = p_id_representante_legal;
    IF v_rep_existe = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-07: El representante legal debe ser un cliente persona natural registrado';
    END IF;

    -- Validar usuario activo
    SELECT ceu.nombre_estado INTO v_estado_usr
    FROM usuario u JOIN cat_estado_usuario ceu ON u.id_estado_usuario = ceu.id_estado_usuario
    WHERE u.id_usuario = p_id_usuario;
    IF v_estado_usr IS NULL OR v_estado_usr != 'Activo' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario debe existir y estar Activo';
    END IF;

    START TRANSACTION;

    INSERT INTO cliente_empresa (
        nit, razon_social, correo_electronico, telefono,
        direccion, id_representante_legal, id_usuario
    ) VALUES (
        p_nit, p_razon_social, p_correo, p_telefono,
        p_direccion, p_id_representante_legal, p_id_usuario
    );

    UPDATE usuario SET id_relacionado = p_nit, fecha_modificacion = NOW()
    WHERE id_usuario = p_id_usuario;

    CALL sp_registrar_bitacora(
        'CLIENTE_EMPRESA_CREADO', COALESCE(@id_usuario_sesion,0), COALESCE(@rol_sesion,'SISTEMA'),
        p_nit, 'CLIENTE_EMPRESA',
        JSON_OBJECT('razon_social', p_razon_social, 'nit', p_nit, 'representante_legal', p_id_representante_legal)
    );

    COMMIT;
END //

-- sp_actualizar_cliente_empresa
DROP PROCEDURE IF EXISTS sp_actualizar_cliente_empresa //
CREATE PROCEDURE sp_actualizar_cliente_empresa(
    IN p_nit       VARCHAR(30),
    IN p_correo    VARCHAR(150),
    IN p_telefono  VARCHAR(15),
    IN p_direccion VARCHAR(300)
)
COMMENT 'BC-02: Actualiza datos de contacto de una empresa cliente'
BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    SELECT COUNT(*) INTO v_existe FROM cliente_empresa WHERE nit = p_nit;
    IF v_existe = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Empresa no encontrada';
    END IF;

    START TRANSACTION;

    UPDATE cliente_empresa SET
        correo_electronico = COALESCE(p_correo,    correo_electronico),
        telefono           = COALESCE(p_telefono,  telefono),
        direccion          = COALESCE(p_direccion, direccion),
        fecha_modificacion = NOW()
    WHERE nit = p_nit;

    CALL sp_registrar_bitacora(
        'CLIENTE_EMPRESA_ACTUALIZADO', COALESCE(@id_usuario_sesion,0), COALESCE(@rol_sesion,'SISTEMA'),
        p_nit, 'CLIENTE_EMPRESA',
        JSON_OBJECT('correo_nuevo', p_correo, 'telefono_nuevo', p_telefono)
    );

    COMMIT;
END //

-- sp_bloquear_cliente
-- Marca el usuario asociado al cliente como Bloqueado.
DROP PROCEDURE IF EXISTS sp_bloquear_cliente //
CREATE PROCEDURE sp_bloquear_cliente(
    IN p_id_identificacion VARCHAR(30),
    IN p_tipo_cliente      ENUM('PERSONA_NATURAL','EMPRESA'),
    IN p_motivo            VARCHAR(200)
)
COMMENT 'BC-02: Bloquea el usuario asociado a un cliente (persona o empresa)'
BEGIN
    DECLARE v_id_usuario INT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    IF p_tipo_cliente = 'PERSONA_NATURAL' THEN
        SELECT id_usuario INTO v_id_usuario FROM cliente_persona_natural WHERE id_identificacion = p_id_identificacion;
    ELSE
        SELECT id_usuario INTO v_id_usuario FROM cliente_empresa WHERE nit = p_id_identificacion;
    END IF;

    IF v_id_usuario IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cliente no encontrado';
    END IF;

    -- Reutiliza sp_cambiar_estado_usuario
    CALL sp_cambiar_estado_usuario(v_id_usuario, 'Bloqueado', p_motivo);
END //

-- ============================================================
-- BC-03: CUENTAS
-- ============================================================

-- sp_crear_cuenta
-- Apertura de cuenta bancaria. PDF: Empleado Ventanilla puede registrar apertura.
DROP PROCEDURE IF EXISTS sp_crear_cuenta //
CREATE PROCEDURE sp_crear_cuenta(
    IN p_numero_cuenta   VARCHAR(30),
    IN p_nombre_tipo     VARCHAR(50),
    IN p_id_titular      VARCHAR(30),
    IN p_tipo_titular    ENUM('PERSONA_NATURAL','EMPRESA'),
    IN p_codigo_iso_moneda CHAR(3),
    IN p_saldo_inicial   DECIMAL(18,2),
    IN p_id_usuario_apertura INT UNSIGNED
)
COMMENT 'BC-03: Apertura de cuenta bancaria. Valida titular activo y tipo de cuenta valido.'
BEGIN
    DECLARE v_id_tipo_cuenta  TINYINT UNSIGNED;
    DECLARE v_id_moneda       TINYINT UNSIGNED;
    DECLARE v_id_estado_activa TINYINT UNSIGNED;
    DECLARE v_estado_usr      VARCHAR(30);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Validar tipo de cuenta existe en catalogo
    SELECT id_tipo_cuenta INTO v_id_tipo_cuenta FROM cat_tipo_cuenta WHERE nombre_tipo = p_nombre_tipo;
    IF v_id_tipo_cuenta IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tipo de cuenta no valido en catalogo';
    END IF;

    -- Validar moneda
    SELECT id_moneda INTO v_id_moneda FROM cat_moneda WHERE codigo_iso = p_codigo_iso_moneda;
    IF v_id_moneda IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Moneda no valida';
    END IF;

    -- Validar saldo inicial no negativo
    IF p_saldo_inicial < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El saldo inicial no puede ser negativo';
    END IF;

    -- Validar usuario apertura activo (TRG-03 tambien lo valida, doble seguridad)
    SELECT ceu.nombre_estado INTO v_estado_usr
    FROM usuario u JOIN cat_estado_usuario ceu ON u.id_estado_usuario = ceu.id_estado_usuario
    WHERE u.id_usuario = p_id_usuario_apertura;
    IF v_estado_usr IS NULL OR v_estado_usr != 'Activo' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-11: No se puede abrir cuenta para usuario inactivo';
    END IF;

    SELECT id_estado_cuenta INTO v_id_estado_activa FROM cat_estado_cuenta WHERE nombre_estado = 'Activa';

    SET @id_usuario_sesion = p_id_usuario_apertura;
    SET @rol_sesion        = 'SISTEMA';

    START TRANSACTION;

    INSERT INTO cuenta_bancaria (
        numero_cuenta, id_tipo_cuenta, id_titular, tipo_titular,
        saldo_actual, id_moneda, id_estado_cuenta, fecha_apertura, id_usuario_apertura
    ) VALUES (
        p_numero_cuenta, v_id_tipo_cuenta, p_id_titular, p_tipo_titular,
        p_saldo_inicial, v_id_moneda, v_id_estado_activa, CURDATE(), p_id_usuario_apertura
    );
    -- TRG-03 valida usuario activo; TRG-18 registra CUENTA_ABIERTA en bitacora.
    -- No se llama sp_registrar_bitacora aqui para evitar duplicado de auditoria.

    COMMIT;
END //

-- sp_cancelar_cuenta
-- Cierra una cuenta bancaria. Solo si saldo = 0.
DROP PROCEDURE IF EXISTS sp_cancelar_cuenta //
CREATE PROCEDURE sp_cancelar_cuenta(
    IN p_numero_cuenta VARCHAR(30),
    IN p_id_usuario    INT UNSIGNED
)
COMMENT 'BC-03: Cierra/cancela una cuenta bancaria. Requiere saldo = 0.'
BEGIN
    DECLARE v_saldo       DECIMAL(18,2);
    DECLARE v_est_nombre  VARCHAR(30);
    DECLARE v_id_cerrada  TINYINT UNSIGNED;
    DECLARE v_rol_usr     VARCHAR(60);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Validar rol: solo Empleado Ventanilla o Analista Interno pueden cancelar cuentas
    SELECT cr.nombre_rol INTO v_rol_usr
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_usuario;
    IF v_rol_usr NOT IN ('Empleado Ventanilla', 'Analista Interno') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo Empleado Ventanilla o Analista Interno pueden cancelar cuentas';
    END IF;

    SET @id_usuario_sesion = p_id_usuario;
    SET @rol_sesion        = v_rol_usr;

    START TRANSACTION;

    SELECT cb.saldo_actual, cec.nombre_estado
    INTO v_saldo, v_est_nombre
    FROM cuenta_bancaria cb
    JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = p_numero_cuenta FOR UPDATE;

    IF v_est_nombre IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cuenta no encontrada';
    END IF;
    IF v_est_nombre = 'Cerrada' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cuenta ya esta cerrada';
    END IF;
    IF v_saldo != 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede cerrar una cuenta con saldo distinto de cero';
    END IF;

    SELECT id_estado_cuenta INTO v_id_cerrada FROM cat_estado_cuenta WHERE nombre_estado = 'Cerrada';
    UPDATE cuenta_bancaria SET id_estado_cuenta = v_id_cerrada, fecha_modificacion = NOW()
    WHERE numero_cuenta = p_numero_cuenta;
    -- TRG-05 registra en bitacora automaticamente

    COMMIT;
END //

-- sp_reactivar_cuenta
-- Desbloquea una cuenta que estaba Bloqueada (no Cerrada).
DROP PROCEDURE IF EXISTS sp_reactivar_cuenta //
CREATE PROCEDURE sp_reactivar_cuenta(
    IN p_numero_cuenta VARCHAR(30),
    IN p_id_usuario    INT UNSIGNED
)
COMMENT 'BC-03: Reactiva (desbloquea) una cuenta bancaria Bloqueada'
BEGIN
    DECLARE v_est_nombre  VARCHAR(30);
    DECLARE v_id_activa   TINYINT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

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
    IF v_est_nombre != 'Bloqueada' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se puede reactivar una cuenta Bloqueada';
    END IF;

    SELECT id_estado_cuenta INTO v_id_activa FROM cat_estado_cuenta WHERE nombre_estado = 'Activa';
    UPDATE cuenta_bancaria SET id_estado_cuenta = v_id_activa, fecha_modificacion = NOW()
    WHERE numero_cuenta = p_numero_cuenta;
    -- TRG-05 registra en bitacora automaticamente

    COMMIT;
END //

-- ============================================================
-- BC-04: PRESTAMOS
-- ============================================================

-- sp_solicitar_prestamo
-- PDF: Cliente PN, Cliente Empresa o Empleado Comercial pueden solicitar.
-- Valida que el rol del ejecutor sea uno de los tres permitidos.
DROP PROCEDURE IF EXISTS sp_solicitar_prestamo //
CREATE PROCEDURE sp_solicitar_prestamo(
    IN p_id_cliente_solicitante VARCHAR(30),
    IN p_tipo_cliente           ENUM('PERSONA_NATURAL','EMPRESA'),
    IN p_nombre_tipo_prestamo   VARCHAR(60),
    IN p_monto_solicitado        DECIMAL(18,2),
    IN p_id_usuario_solicitante  INT UNSIGNED,
    OUT p_id_prestamo_nuevo      INT UNSIGNED
)
COMMENT 'BC-04: Crea solicitud de prestamo. Roles permitidos: Cliente PN, Cliente Empresa, Empleado Comercial'
BEGIN
    DECLARE v_rol_ejecutor    VARCHAR(60);
    DECLARE v_estado_usr      VARCHAR(30);
    DECLARE v_id_tipo_prestamo TINYINT UNSIGNED;
    DECLARE v_id_en_estudio   TINYINT UNSIGNED;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Validar rol del ejecutor (PDF: solo 3 roles pueden solicitar)
    SELECT cr.nombre_rol INTO v_rol_ejecutor
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_usuario_solicitante;

    IF v_rol_ejecutor NOT IN ('Cliente Persona Natural','Cliente Empresa','Empleado Comercial') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo Cliente PN, Cliente Empresa o Empleado Comercial pueden solicitar prestamos';
    END IF;

    -- Validar usuario activo (INV-19)
    SELECT ceu.nombre_estado INTO v_estado_usr
    FROM usuario u JOIN cat_estado_usuario ceu ON u.id_estado_usuario = ceu.id_estado_usuario
    WHERE u.id_usuario = p_id_usuario_solicitante;
    IF v_estado_usr IS NULL OR v_estado_usr != 'Activo' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-19: El usuario solicitante debe estar Activo';
    END IF;

    -- Validar monto > 0
    IF p_monto_solicitado <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El monto solicitado debe ser mayor a cero';
    END IF;

    -- Validar tipo de prestamo
    SELECT id_tipo_prestamo INTO v_id_tipo_prestamo FROM cat_tipo_prestamo WHERE nombre_tipo = p_nombre_tipo_prestamo;
    IF v_id_tipo_prestamo IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tipo de prestamo no valido';
    END IF;

    SELECT id_estado_prestamo INTO v_id_en_estudio FROM cat_estado_prestamo WHERE nombre_estado = 'En Estudio';

    SET @id_usuario_sesion = p_id_usuario_solicitante;
    SET @rol_sesion        = v_rol_ejecutor;

    START TRANSACTION;

    INSERT INTO prestamo (
        id_tipo_prestamo, id_cliente_solicitante, tipo_cliente,
        monto_solicitado, id_estado_prestamo, id_usuario_solicitante
    ) VALUES (
        v_id_tipo_prestamo, p_id_cliente_solicitante, p_tipo_cliente,
        p_monto_solicitado, v_id_en_estudio, p_id_usuario_solicitante
    );
    -- TRG-06 fuerza estado 'En Estudio' y fecha_solicitud = NOW()

    SET p_id_prestamo_nuevo = LAST_INSERT_ID();
    -- NOTA: TRG-19 (trg_after_insert_prestamo) registra PRESTAMO_SOLICITADO en bitacora.
    -- No se llama sp_registrar_bitacora aqui para evitar duplicado de auditoria.

    COMMIT;
END //

-- ============================================================
-- BC-03: OPERACIONES DE CAJA (Empleado Ventanilla)
-- PDF: 'Puede consultar saldo y estado de cualquier cuenta para
--       realizar operaciones de caja (depositos, retiros)'
-- ============================================================

-- sp_depositar
-- Aumenta el saldo de una cuenta (deposito de caja).
-- Registra en bitacora con saldos antes/despues.
DROP PROCEDURE IF EXISTS sp_depositar //
CREATE PROCEDURE sp_depositar(
    IN p_numero_cuenta VARCHAR(30),
    IN p_monto         DECIMAL(18,2),
    IN p_id_usuario    INT UNSIGNED,
    IN p_concepto      VARCHAR(200)
)
COMMENT 'BC-03: Deposito de caja. Aumenta saldo de cuenta activa. Solo Empleado Ventanilla.'
BEGIN
    DECLARE v_saldo_antes DECIMAL(18,2);
    DECLARE v_est_cuenta  VARCHAR(30);
    DECLARE v_rol_usr     VARCHAR(60);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Validar rol: solo Empleado Ventanilla puede hacer depositos de caja
    -- PDF pag. 4: "Analista Interno NO puede realizar operaciones transaccionales de ventanilla"
    SELECT cr.nombre_rol INTO v_rol_usr
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_usuario;
    IF v_rol_usr != 'Empleado Ventanilla' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo Empleado Ventanilla puede realizar depositos de caja';
    END IF;

    IF p_monto <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El monto del deposito debe ser mayor a cero';
    END IF;

    SET @id_usuario_sesion = p_id_usuario;
    SET @rol_sesion        = v_rol_usr;

    START TRANSACTION;

    SELECT cb.saldo_actual, cec.nombre_estado
    INTO v_saldo_antes, v_est_cuenta
    FROM cuenta_bancaria cb
    JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = p_numero_cuenta FOR UPDATE;

    IF v_est_cuenta IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cuenta no encontrada';
    END IF;
    IF v_est_cuenta != 'Activa' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-10: No se puede depositar en cuenta no activa';
    END IF;

    UPDATE cuenta_bancaria SET saldo_actual = saldo_actual + p_monto, fecha_modificacion = NOW()
    WHERE numero_cuenta = p_numero_cuenta;
    -- TRG-05 registra cambio de saldo en bitacora automaticamente

    -- Registro adicional con detalle de la operacion de caja
    CALL sp_registrar_bitacora(
        'DEPOSITO_CAJA', p_id_usuario, v_rol_usr,
        p_numero_cuenta, 'CUENTA',
        JSON_OBJECT('monto', p_monto, 'saldo_antes', v_saldo_antes,
                    'saldo_despues', v_saldo_antes + p_monto, 'concepto', p_concepto)
    );

    COMMIT;
END //

-- sp_retirar
-- Disminuye el saldo de una cuenta (retiro de caja).
-- Valida saldo suficiente y cuenta activa.
DROP PROCEDURE IF EXISTS sp_retirar //
CREATE PROCEDURE sp_retirar(
    IN p_numero_cuenta VARCHAR(30),
    IN p_monto         DECIMAL(18,2),
    IN p_id_usuario    INT UNSIGNED,
    IN p_concepto      VARCHAR(200)
)
COMMENT 'BC-03: Retiro de caja. Disminuye saldo. Valida saldo suficiente y cuenta activa.'
BEGIN
    DECLARE v_saldo_antes DECIMAL(18,2);
    DECLARE v_est_cuenta  VARCHAR(30);
    DECLARE v_rol_usr     VARCHAR(60);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- PDF pag. 4: "Analista Interno NO puede realizar operaciones transaccionales de ventanilla"
    SELECT cr.nombre_rol INTO v_rol_usr
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_usuario;
    IF v_rol_usr != 'Empleado Ventanilla' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo Empleado Ventanilla puede realizar retiros de caja';
    END IF;

    IF p_monto <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El monto del retiro debe ser mayor a cero';
    END IF;

    SET @id_usuario_sesion = p_id_usuario;
    SET @rol_sesion        = v_rol_usr;

    START TRANSACTION;

    SELECT cb.saldo_actual, cec.nombre_estado
    INTO v_saldo_antes, v_est_cuenta
    FROM cuenta_bancaria cb
    JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = p_numero_cuenta FOR UPDATE;

    IF v_est_cuenta IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cuenta no encontrada';
    END IF;
    IF v_est_cuenta != 'Activa' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-10: No se puede retirar de cuenta no activa';
    END IF;
    IF v_saldo_antes < p_monto THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-21: Saldo insuficiente para el retiro';
    END IF;

    UPDATE cuenta_bancaria SET saldo_actual = saldo_actual - p_monto, fecha_modificacion = NOW()
    WHERE numero_cuenta = p_numero_cuenta;
    -- TRG-05 registra cambio de saldo en bitacora automaticamente

    CALL sp_registrar_bitacora(
        'RETIRO_CAJA', p_id_usuario, v_rol_usr,
        p_numero_cuenta, 'CUENTA',
        JSON_OBJECT('monto', p_monto, 'saldo_antes', v_saldo_antes,
                    'saldo_despues', v_saldo_antes - p_monto, 'concepto', p_concepto)
    );

    COMMIT;
END //

-- ============================================================
-- CONSULTAS OPERATIVAS
-- ============================================================

-- sp_consultar_saldo
DROP PROCEDURE IF EXISTS sp_consultar_saldo //
CREATE PROCEDURE sp_consultar_saldo(
    IN p_numero_cuenta VARCHAR(30),
    IN p_id_usuario    INT UNSIGNED
)
COMMENT 'BC-03: Consulta saldo y estado de una cuenta. Valida acceso por rol.'
BEGIN
    DECLARE v_rol_usr VARCHAR(60);

    SELECT cr.nombre_rol INTO v_rol_usr
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_usuario;

    IF v_rol_usr IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado';
    END IF;

    SELECT
        cb.numero_cuenta,
        ctc.nombre_tipo   AS tipo_cuenta,
        cb.saldo_actual,
        cm.codigo_iso     AS moneda,
        cec.nombre_estado AS estado_cuenta,
        cb.fecha_apertura
    FROM cuenta_bancaria cb
    JOIN cat_tipo_cuenta  ctc ON cb.id_tipo_cuenta   = ctc.id_tipo_cuenta
    JOIN cat_moneda       cm  ON cb.id_moneda        = cm.id_moneda
    JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = p_numero_cuenta;
END //

-- sp_historial_transferencias
-- Retorna el historial de transferencias de una cuenta o usuario.
DROP PROCEDURE IF EXISTS sp_historial_transferencias //
CREATE PROCEDURE sp_historial_transferencias(
    IN p_numero_cuenta VARCHAR(30),
    IN p_id_usuario    INT UNSIGNED,
    IN p_limite        INT UNSIGNED
)
COMMENT 'BC-05: Historial de transferencias de una cuenta (origen o destino)'
BEGIN
    DECLARE v_lim INT UNSIGNED DEFAULT 50;
    SET v_lim = COALESCE(p_limite, 50);

    SELECT
        t.id_transferencia,
        t.cuenta_origen,
        t.cuenta_destino,
        t.monto,
        cet.nombre_estado AS estado,
        t.fecha_creacion,
        t.fecha_aprobacion,
        t.requiere_aprobacion,
        t.saldo_origen_antes,
        t.saldo_origen_despues,
        t.saldo_destino_antes,
        t.saldo_destino_despues
    FROM transferencia t
    JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
    WHERE t.cuenta_origen = p_numero_cuenta OR t.cuenta_destino = p_numero_cuenta
    ORDER BY t.fecha_creacion DESC
    LIMIT v_lim;
END //

-- sp_historial_prestamos
-- Retorna el historial de prestamos de un cliente.
DROP PROCEDURE IF EXISTS sp_historial_prestamos //
CREATE PROCEDURE sp_historial_prestamos(
    IN p_id_cliente  VARCHAR(30),
    IN p_tipo_cliente ENUM('PERSONA_NATURAL','EMPRESA')
)
COMMENT 'BC-04: Historial completo de prestamos de un cliente'
BEGIN
    SELECT
        p.id_prestamo,
        ctp.nombre_tipo   AS tipo_prestamo,
        p.monto_solicitado,
        p.monto_aprobado,
        p.tasa_interes,
        p.plazo_meses,
        cep.nombre_estado AS estado_prestamo,
        p.fecha_solicitud,
        p.fecha_aprobacion,
        p.fecha_desembolso,
        p.cuenta_destino_desembolso
    FROM prestamo p
    JOIN cat_tipo_prestamo  ctp ON p.id_tipo_prestamo  = ctp.id_tipo_prestamo
    JOIN cat_estado_prestamo cep ON p.id_estado_prestamo = cep.id_estado_prestamo
    WHERE p.id_cliente_solicitante = p_id_cliente
      AND p.tipo_cliente = p_tipo_cliente
    ORDER BY p.fecha_solicitud DESC;
END //

-- ============================================================
-- BC-05: PAGOS MASIVOS / NOMINA
-- PDF: 'Puede crear transferencias y pagos masivos (nomina)'
-- ============================================================

-- sp_crear_lote_transferencia
-- Crea la cabecera del lote y sus lineas de detalle.
-- NO ejecuta las transferencias aun; solo las registra.
DROP PROCEDURE IF EXISTS sp_crear_lote_transferencia //
CREATE PROCEDURE sp_crear_lote_transferencia(
    IN  p_descripcion        VARCHAR(200),
    IN  p_cuenta_origen      VARCHAR(30),
    IN  p_id_usuario_creador INT UNSIGNED,
    IN  p_detalle_json       JSON,  -- Array: [{cuenta_destino, monto, concepto}]
    OUT p_id_lote_nuevo      INT UNSIGNED
)
COMMENT 'BC-05: Crea lote de pagos masivos. Solo Empleado Empresa puede crear lotes.'
BEGIN
    DECLARE v_rol_usr       VARCHAR(60);
    DECLARE v_est_cuenta    VARCHAR(30);
    DECLARE v_id_pendiente  TINYINT UNSIGNED;
    DECLARE v_n             INT DEFAULT 0;
    DECLARE v_i             INT DEFAULT 0;
    DECLARE v_cuenta_dest   VARCHAR(30);
    DECLARE v_monto_linea   DECIMAL(18,2);
    DECLARE v_concepto      VARCHAR(200);
    DECLARE v_total_monto   DECIMAL(18,2) DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN ROLLBACK; RESIGNAL; END;

    -- Validar rol: solo Empleado Empresa puede crear lotes
    SELECT cr.nombre_rol INTO v_rol_usr
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_usuario_creador;
    IF v_rol_usr NOT IN ('Empleado Empresa','Supervisor Empresa') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo Empleado Empresa puede crear lotes de transferencia';
    END IF;

    -- Validar cuenta origen activa
    SELECT cec.nombre_estado INTO v_est_cuenta
    FROM cuenta_bancaria cb JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
    WHERE cb.numero_cuenta = p_cuenta_origen;
    IF v_est_cuenta IS NULL OR v_est_cuenta != 'Activa' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cuenta origen del lote debe estar Activa';
    END IF;

    -- Validar que el JSON tenga al menos 1 elemento
    SET v_n = JSON_LENGTH(p_detalle_json);
    IF v_n IS NULL OR v_n = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El lote debe tener al menos una linea de detalle';
    END IF;

    SELECT id_estado_lote INTO v_id_pendiente FROM cat_estado_lote WHERE nombre_estado = 'Pendiente';

    SET @id_usuario_sesion = p_id_usuario_creador;
    SET @rol_sesion        = v_rol_usr;

    START TRANSACTION;

    -- Calcular total del lote
    SET v_i = 0;
    WHILE v_i < v_n DO
        SET v_monto_linea = JSON_UNQUOTE(JSON_EXTRACT(p_detalle_json, CONCAT('$[',v_i,'].monto')));
        IF v_monto_linea IS NULL OR v_monto_linea <= 0 THEN
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cada linea del lote debe tener monto mayor a cero';
        END IF;
        SET v_total_monto = v_total_monto + v_monto_linea;
        SET v_i = v_i + 1;
    END WHILE;

    -- Insertar cabecera del lote
    INSERT INTO lote_transferencia (
        descripcion, cuenta_origen, id_usuario_creador,
        id_estado_lote, total_registros, total_monto
    ) VALUES (
        p_descripcion, p_cuenta_origen, p_id_usuario_creador,
        v_id_pendiente, v_n, v_total_monto
    );
    SET p_id_lote_nuevo = LAST_INSERT_ID();

    -- Insertar lineas de detalle
    SET v_i = 0;
    WHILE v_i < v_n DO
        SET v_cuenta_dest = JSON_UNQUOTE(JSON_EXTRACT(p_detalle_json, CONCAT('$[',v_i,'].cuenta_destino')));
        SET v_monto_linea = JSON_UNQUOTE(JSON_EXTRACT(p_detalle_json, CONCAT('$[',v_i,'].monto')));
        SET v_concepto    = JSON_UNQUOTE(JSON_EXTRACT(p_detalle_json, CONCAT('$[',v_i,'].concepto')));
        INSERT INTO detalle_lote_transferencia (id_lote, cuenta_destino, monto, concepto)
        VALUES (p_id_lote_nuevo, v_cuenta_dest, v_monto_linea, v_concepto);
        SET v_i = v_i + 1;
    END WHILE;

    CALL sp_registrar_bitacora(
        'LOTE_CREADO', p_id_usuario_creador, v_rol_usr,
        CAST(p_id_lote_nuevo AS CHAR), 'LOTE',
        JSON_OBJECT('descripcion', p_descripcion, 'cuenta_origen', p_cuenta_origen,
                    'total_registros', v_n, 'total_monto', v_total_monto)
    );

    COMMIT;
END //

-- sp_procesar_lote_transferencia
-- Ejecuta atomicamente todas las transferencias del lote.
-- Si una linea falla, la marca como Fallida pero continua con las demas.
-- El lote queda 'Completado' si todas exitosas, 'Con Errores' si alguna fallo.
DROP PROCEDURE IF EXISTS sp_procesar_lote_transferencia //
CREATE PROCEDURE sp_procesar_lote_transferencia(
    IN p_id_lote      INT UNSIGNED,
    IN p_id_supervisor INT UNSIGNED  -- Supervisor que autoriza el lote
)
COMMENT 'BC-05: Procesa todas las lineas de un lote de pagos masivos atomicamente'
BEGIN
    DECLARE v_rol_sup       VARCHAR(60);
    DECLARE v_est_lote      VARCHAR(40);
    DECLARE v_cuenta_origen VARCHAR(30);
    DECLARE v_id_detalle    INT UNSIGNED;
    DECLARE v_cuenta_dest   VARCHAR(30);
    DECLARE v_monto         DECIMAL(18,2);
    DECLARE v_concepto      VARCHAR(200);
    DECLARE v_saldo_origen  DECIMAL(18,2);
    DECLARE v_saldo_dest    DECIMAL(18,2);
    DECLARE v_est_orig      VARCHAR(30);
    DECLARE v_est_dest      VARCHAR(30);
    DECLARE v_id_transf     INT UNSIGNED;
    DECLARE v_exitosos      INT DEFAULT 0;
    DECLARE v_fallidos      INT DEFAULT 0;
    DECLARE v_error_msg     VARCHAR(300);
    DECLARE v_id_ejecutada  TINYINT UNSIGNED;
    DECLARE v_id_pend_transf TINYINT UNSIGNED;
    DECLARE v_id_completado TINYINT UNSIGNED;
    DECLARE v_id_con_errores TINYINT UNSIGNED;
    DECLARE v_id_procesando TINYINT UNSIGNED;
    DECLARE done            BOOLEAN DEFAULT FALSE;

    DECLARE cur_detalle CURSOR FOR
        SELECT id_detalle, cuenta_destino, monto, concepto
        FROM detalle_lote_transferencia
        WHERE id_lote = p_id_lote AND estado_linea = 'Pendiente';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET @trg_transf_ejecutando = 0; -- garantizar reset de guardia ante error externo
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validar rol supervisor
    SELECT cr.nombre_rol INTO v_rol_sup
    FROM usuario u JOIN cat_rol cr ON u.id_rol = cr.id_rol
    WHERE u.id_usuario = p_id_supervisor;
    IF v_rol_sup NOT IN ('Supervisor Empresa','Analista Interno') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo Supervisor Empresa puede procesar lotes';
    END IF;

    -- Obtener datos del lote
    SELECT lt.cuenta_origen, cel.nombre_estado
    INTO v_cuenta_origen, v_est_lote
    FROM lote_transferencia lt
    JOIN cat_estado_lote cel ON lt.id_estado_lote = cel.id_estado_lote
    WHERE lt.id_lote = p_id_lote;
    IF v_est_lote IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lote no encontrado';
    END IF;
    IF v_est_lote != 'Pendiente' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se puede procesar un lote en estado Pendiente';
    END IF;

    SELECT id_estado_transferencia INTO v_id_ejecutada   FROM cat_estado_transferencia WHERE nombre_estado = 'Ejecutada';
    SELECT id_estado_transferencia INTO v_id_pend_transf FROM cat_estado_transferencia WHERE nombre_estado = 'Pendiente';
    SELECT id_estado_lote INTO v_id_procesando  FROM cat_estado_lote WHERE nombre_estado = 'Procesando';
    SELECT id_estado_lote INTO v_id_completado  FROM cat_estado_lote WHERE nombre_estado = 'Completado';
    SELECT id_estado_lote INTO v_id_con_errores FROM cat_estado_lote WHERE nombre_estado = 'Con Errores';

    SET @id_usuario_sesion = p_id_supervisor;
    SET @rol_sesion        = v_rol_sup;

    -- Marcar lote como Procesando
    START TRANSACTION;
    UPDATE lote_transferencia SET id_estado_lote = v_id_procesando, fecha_procesamiento = NOW()
    WHERE id_lote = p_id_lote;
    COMMIT;

    -- Procesar cada linea individualmente
    OPEN cur_detalle;
    lote_loop: LOOP
        FETCH cur_detalle INTO v_id_detalle, v_cuenta_dest, v_monto, v_concepto;
        IF done THEN LEAVE lote_loop; END IF;

        -- Intentar ejecutar cada transferencia en su propia transaccion
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
            BEGIN
                -- Capturar error, resetear la guardia global y marcar linea como Fallida
                GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
                SET @trg_transf_ejecutando = 0;
                ROLLBACK;
                UPDATE detalle_lote_transferencia
                SET estado_linea = 'Fallida', mensaje_error = v_error_msg
                WHERE id_detalle = v_id_detalle;
                SET v_fallidos = v_fallidos + 1;
            END;

            START TRANSACTION;

            -- Validar saldo origen con bloqueo
            SELECT cb.saldo_actual, cec.nombre_estado
            INTO v_saldo_origen, v_est_orig
            FROM cuenta_bancaria cb
            JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
            WHERE cb.numero_cuenta = v_cuenta_origen FOR UPDATE;

            IF v_est_orig != 'Activa' THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cuenta origen no activa';
            END IF;
            IF v_saldo_origen < v_monto THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente en cuenta origen';
            END IF;

            SELECT cb.saldo_actual, cec.nombre_estado
            INTO v_saldo_dest, v_est_dest
            FROM cuenta_bancaria cb
            JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
            WHERE cb.numero_cuenta = v_cuenta_dest FOR UPDATE;

            IF v_est_dest != 'Activa' THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cuenta destino no activa';
            END IF;

            -- Ejecutar movimiento
            UPDATE cuenta_bancaria SET saldo_actual = saldo_actual - v_monto WHERE numero_cuenta = v_cuenta_origen;
            UPDATE cuenta_bancaria SET saldo_actual = saldo_actual + v_monto WHERE numero_cuenta = v_cuenta_dest;

            -- Crear registro de transferencia individual.
            -- GUARDIA: se activa @trg_transf_ejecutando = 1 para que TRG-09 no sobreescriba
            -- el estado y TRG-10 no intente ejecutar los fondos de nuevo (ya se movieron arriba).
            SET @trg_transf_ejecutando = 1;
            INSERT INTO transferencia (
                cuenta_origen, cuenta_destino, monto, id_estado_transferencia,
                id_usuario_creador, saldo_origen_antes, saldo_destino_antes,
                saldo_origen_despues, saldo_destino_despues, fecha_vencimiento
            ) VALUES (
                v_cuenta_origen, v_cuenta_dest, v_monto, v_id_ejecutada,
                p_id_supervisor, v_saldo_origen, v_saldo_dest,
                v_saldo_origen - v_monto, v_saldo_dest + v_monto,
                DATE_ADD(NOW(), INTERVAL 60 MINUTE)
            );
            SET @trg_transf_ejecutando = 0;
            SET v_id_transf = LAST_INSERT_ID();

            -- Vincular transferencia al detalle del lote
            UPDATE detalle_lote_transferencia
            SET estado_linea = 'Ejecutada', id_transferencia = v_id_transf
            WHERE id_detalle = v_id_detalle;

            SET v_exitosos = v_exitosos + 1;

            CALL sp_registrar_bitacora(
                'LOTE_LINEA_EJECUTADA', p_id_supervisor, v_rol_sup,
                CAST(v_id_transf AS CHAR), 'TRANSFERENCIA',
                JSON_OBJECT('id_lote', p_id_lote, 'cuenta_origen', v_cuenta_origen,
                            'cuenta_destino', v_cuenta_dest, 'monto', v_monto,
                            'saldo_origen_antes', v_saldo_origen, 'saldo_origen_despues', v_saldo_origen - v_monto,
                            'saldo_destino_antes', v_saldo_dest, 'saldo_destino_despues', v_saldo_dest + v_monto)
            );

            COMMIT;
        END;
    END LOOP;
    CLOSE cur_detalle;

    -- Actualizar estado final del lote
    START TRANSACTION;
    UPDATE lote_transferencia SET
        id_estado_lote      = IF(v_fallidos = 0, v_id_completado, v_id_con_errores),
        registros_exitosos  = v_exitosos,
        registros_fallidos  = v_fallidos
    WHERE id_lote = p_id_lote;

    CALL sp_registrar_bitacora(
        'LOTE_PROCESADO', p_id_supervisor, v_rol_sup,
        CAST(p_id_lote AS CHAR), 'LOTE',
        JSON_OBJECT('exitosos', v_exitosos, 'fallidos', v_fallidos,
                    'estado_final', IF(v_fallidos=0,'Completado','Con Errores'))
    );
    COMMIT;
END //

DELIMITER ;
