-- ============================================================
-- 08_tests.sql
-- Suite de pruebas automatizadas del sistema bancario DDD
-- Ejecutar DESPUES de 07_seed_data.sql
-- ============================================================
-- PATRON USADO:
--   Los bloques que necesitan DECLARE + EXIT HANDLER se envuelven
--   en un procedimiento temporal (DROP/CREATE/CALL/DROP).
--   MySQL no soporta BEGIN NOT ATOMIC ni bloques anonimos con
--   DECLARE a nivel de script; solo dentro de stored programs.
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
DELIMITER //

-- ============================================================
-- UTILIDAD: sp_test_assert
-- ============================================================
DROP PROCEDURE IF EXISTS sp_test_assert //
CREATE PROCEDURE sp_test_assert(
    IN p_test_name VARCHAR(200),
    IN p_condicion BOOLEAN,
    IN p_msg_fail  VARCHAR(300)
)
BEGIN
    IF p_condicion THEN
        SELECT CONCAT('[PASS] ', p_test_name) AS resultado;
    ELSE
        SELECT CONCAT('[FAIL] ', p_test_name, ' — ', p_msg_fail) AS resultado;
    END IF;
END //

DELIMITER ;

-- ============================================================
-- BLOQUE 1: GESTION DE USUARIOS Y CLIENTES
-- ============================================================
SELECT '=== BLOQUE 1: USUARIOS Y CLIENTES ===' AS seccion;

-- TEST-01: Crear usuario con rol valido
SET @id_usuario_sesion = 0;
SET @rol_sesion = 'SISTEMA';
CALL sp_crear_usuario(
    'Test Usuario Uno', '9990000001', 'test1@banco.com',
    '3001110001', '1995-01-15', 'Calle Test 1',
    'Cliente Persona Natural', NULL, @nuevo_usr_1
);
CALL sp_test_assert(
    'TEST-01: sp_crear_usuario crea usuario con rol valido',
    (SELECT COUNT(*) FROM usuario WHERE id_identificacion = '9990000001') = 1,
    'El usuario no fue insertado'
);

-- TEST-02: Crear usuario con rol inexistente debe fallar
DELIMITER //
DROP PROCEDURE IF EXISTS _t02 //
CREATE PROCEDURE _t02()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-02: sp_crear_usuario rechaza rol inexistente', TRUE, '');
    CALL sp_crear_usuario(
        'Test Rol Malo', '9990000099', 'rolmalo@banco.com',
        '3001110099', '1990-01-01', 'Calle X',
        'Rol Que No Existe', NULL, @dummy
    );
    CALL sp_test_assert('TEST-02: sp_crear_usuario rechaza rol inexistente', FALSE,
        'Debio lanzar error por rol invalido');
END //
DELIMITER ;
CALL _t02();
DROP PROCEDURE IF EXISTS _t02;

-- TEST-03: Crear cliente persona natural vinculado al usuario creado
CALL sp_crear_cliente_persona(
    '9990000001', 'Cedula', 'Test Usuario Uno',
    'test1@banco.com', '3001110001', '1995-01-15',
    'Calle Test 1', @nuevo_usr_1
);
CALL sp_test_assert(
    'TEST-03: sp_crear_cliente_persona registra cliente PN',
    (SELECT COUNT(*) FROM cliente_persona_natural WHERE id_identificacion = '9990000001') = 1,
    'El cliente PN no fue insertado'
);

-- TEST-04: Menor de edad debe ser rechazado (INV-06)
DELIMITER //
DROP PROCEDURE IF EXISTS _t04 //
CREATE PROCEDURE _t04()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-04: TRG-02 rechaza cliente menor de edad', TRUE, '');
    SET @id_usuario_sesion = 0;
    SET @rol_sesion = 'SISTEMA';
    CALL sp_crear_usuario(
        'Menor Edad', '9990000002', 'menor@banco.com',
        '3001110002', '2015-06-01', 'Calle Menor',
        'Cliente Persona Natural', NULL, @usr_menor
    );
    INSERT INTO cliente_persona_natural
        (id_identificacion, tipo_identificacion, nombre_completo,
         correo_electronico, telefono, fecha_nacimiento, direccion, id_usuario)
    VALUES ('9990000002','Cedula','Menor Edad','menor@banco.com',
            '3001110002','2015-06-01','Calle Menor', @usr_menor);
    CALL sp_test_assert('TEST-04: TRG-02 rechaza cliente menor de edad', FALSE,
        'Debio rechazar por edad < 18');
END //
DELIMITER ;
CALL _t04();
DROP PROCEDURE IF EXISTS _t04;

-- TEST-05: Bloquear cliente y verificar estado
CALL sp_cambiar_estado_usuario(@nuevo_usr_1, 'Bloqueado', 'Test bloqueo');
CALL sp_test_assert(
    'TEST-05: sp_cambiar_estado_usuario bloquea usuario correctamente',
    (SELECT ceu.nombre_estado FROM usuario u
     JOIN cat_estado_usuario ceu ON u.id_estado_usuario = ceu.id_estado_usuario
     WHERE u.id_usuario = @nuevo_usr_1) = 'Bloqueado',
    'El estado no cambio a Bloqueado'
);

-- TEST-06: No se puede abrir cuenta a usuario Bloqueado (INV-11)
DELIMITER //
DROP PROCEDURE IF EXISTS _t06 //
CREATE PROCEDURE _t06()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-06: TRG-03 bloquea apertura de cuenta a usuario Bloqueado', TRUE, '');
    CALL sp_crear_cuenta(
        '999-TEST-001', 'Ahorros', '9990000001', 'PERSONA_NATURAL',
        'COP', 0.00, @nuevo_usr_1
    );
    CALL sp_test_assert('TEST-06: TRG-03 bloquea apertura de cuenta a usuario Bloqueado', FALSE,
        'Debio rechazar apertura por usuario Bloqueado');
END //
DELIMITER ;
CALL _t06();
DROP PROCEDURE IF EXISTS _t06;

-- Reactivar usuario para pruebas siguientes
CALL sp_cambiar_estado_usuario(@nuevo_usr_1, 'Activo', 'Reactivacion para tests');

-- ============================================================
-- BLOQUE 2: CUENTAS BANCARIAS
-- ============================================================
SELECT '=== BLOQUE 2: CUENTAS BANCARIAS ===' AS seccion;

-- TEST-07: Apertura de cuenta exitosa (Empleado Ventanilla = id 5)
SET @id_usuario_sesion = 5;
SET @rol_sesion = 'Empleado Ventanilla';
CALL sp_crear_cuenta('999-TEST-001', 'Ahorros', '9990000001', 'PERSONA_NATURAL', 'COP', 1000.00, 5);
CALL sp_test_assert(
    'TEST-07: sp_crear_cuenta abre cuenta correctamente',
    (SELECT COUNT(*) FROM cuenta_bancaria WHERE numero_cuenta = '999-TEST-001') = 1,
    'La cuenta no fue creada'
);

-- TEST-08: Tipo de cuenta 'Personal' existe en catalogo
CALL sp_test_assert(
    'TEST-08: cat_tipo_cuenta contiene Personal segun PDF',
    (SELECT COUNT(*) FROM cat_tipo_cuenta WHERE nombre_tipo = 'Personal') = 1,
    'El tipo Personal no esta en el catalogo'
);

-- TEST-09: Estado 'Bloqueado' existe en cat_estado_usuario
CALL sp_test_assert(
    'TEST-09: cat_estado_usuario contiene Bloqueado segun PDF',
    (SELECT COUNT(*) FROM cat_estado_usuario WHERE nombre_estado = 'Bloqueado') = 1,
    'El estado Bloqueado no esta en el catalogo'
);

-- TEST-10: Saldo no puede ser negativo (INV-09)
DELIMITER //
DROP PROCEDURE IF EXISTS _t10 //
CREATE PROCEDURE _t10()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-10: TRG-04 impide saldo negativo', TRUE, '');
    UPDATE cuenta_bancaria SET saldo_actual = -1.00 WHERE numero_cuenta = '999-TEST-001';
    CALL sp_test_assert('TEST-10: TRG-04 impide saldo negativo', FALSE,
        'Debio rechazar saldo negativo');
END //
DELIMITER ;
CALL _t10();
DROP PROCEDURE IF EXISTS _t10;

-- TEST-11: Moneda inmutable tras apertura (INV-13)
DELIMITER //
DROP PROCEDURE IF EXISTS _t11 //
CREATE PROCEDURE _t11()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-11: TRG-04 impide cambio de moneda', TRUE, '');
    UPDATE cuenta_bancaria SET id_moneda = 2 WHERE numero_cuenta = '999-TEST-001';
    CALL sp_test_assert('TEST-11: TRG-04 impide cambio de moneda', FALSE,
        'Debio rechazar cambio de moneda');
END //
DELIMITER ;
CALL _t11();
DROP PROCEDURE IF EXISTS _t11;

-- TEST-12: Deposito de caja exitoso
SET @id_usuario_sesion = 5;
SET @rol_sesion = 'Empleado Ventanilla';
CALL sp_depositar('999-TEST-001', 5000.00, 5, 'Deposito test');
CALL sp_test_assert(
    'TEST-12: sp_depositar aumenta saldo correctamente',
    (SELECT saldo_actual FROM cuenta_bancaria WHERE numero_cuenta = '999-TEST-001') = 6000.00,
    'El saldo no aumento correctamente (esperado 6000)'
);

-- TEST-13: Retiro exitoso con saldo suficiente
CALL sp_retirar('999-TEST-001', 1000.00, 5, 'Retiro test');
CALL sp_test_assert(
    'TEST-13: sp_retirar disminuye saldo correctamente',
    (SELECT saldo_actual FROM cuenta_bancaria WHERE numero_cuenta = '999-TEST-001') = 5000.00,
    'El saldo no disminuyo correctamente (esperado 5000)'
);

-- TEST-14: Retiro invalido — saldo insuficiente (INV-21)
DELIMITER //
DROP PROCEDURE IF EXISTS _t14 //
CREATE PROCEDURE _t14()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-14: sp_retirar rechaza saldo insuficiente', TRUE, '');
    CALL sp_retirar('999-TEST-001', 999999.00, 5, 'Retiro excesivo');
    CALL sp_test_assert('TEST-14: sp_retirar rechaza saldo insuficiente', FALSE,
        'Debio rechazar por saldo insuficiente');
END //
DELIMITER ;
CALL _t14();
DROP PROCEDURE IF EXISTS _t14;

-- TEST-15: Cancelar cuenta con saldo cero
SET @id_usuario_sesion = 5;
SET @rol_sesion = 'Empleado Ventanilla';
CALL sp_retirar('999-TEST-001', 5000.00, 5, 'Vaciado para cancelacion');
CALL sp_cancelar_cuenta('999-TEST-001', 5);
CALL sp_test_assert(
    'TEST-15: sp_cancelar_cuenta cierra cuenta con saldo cero',
    (SELECT cec.nombre_estado FROM cuenta_bancaria cb
     JOIN cat_estado_cuenta cec ON cb.id_estado_cuenta = cec.id_estado_cuenta
     WHERE cb.numero_cuenta = '999-TEST-001') = 'Cerrada',
    'La cuenta no quedo en estado Cerrada'
);

-- TEST-16: No se puede depositar en cuenta Cerrada (INV-10)
DELIMITER //
DROP PROCEDURE IF EXISTS _t16 //
CREATE PROCEDURE _t16()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-16: sp_depositar rechaza cuenta Cerrada', TRUE, '');
    CALL sp_depositar('999-TEST-001', 100.00, 5, 'Deposito en cuenta cerrada');
    CALL sp_test_assert('TEST-16: sp_depositar rechaza cuenta Cerrada', FALSE,
        'Debio rechazar deposito en cuenta Cerrada');
END //
DELIMITER ;
CALL _t16();
DROP PROCEDURE IF EXISTS _t16;

-- ============================================================
-- BLOQUE 3: TRANSFERENCIAS
-- ============================================================
SELECT '=== BLOQUE 3: TRANSFERENCIAS ===' AS seccion;

-- Preparar cuentas de prueba
SET @id_usuario_sesion = 5;
SET @rol_sesion = 'Empleado Ventanilla';
CALL sp_crear_cuenta('999-ORIG-001', 'Ahorros',     '1001234567', 'PERSONA_NATURAL', 'COP', 20000000.00, 5);
CALL sp_crear_cuenta('999-DEST-001', 'Ahorros',     '1009876543', 'PERSONA_NATURAL', 'COP',  1000000.00, 5);
CALL sp_crear_cuenta('999-EMP-001',  'Empresarial', '900123456',  'EMPRESA',         'COP', 80000000.00, 5);

-- TEST-17: Transferencia bajo umbral se ejecuta directamente
SET @id_usuario_sesion = 7;
SET @rol_sesion = 'Empleado Empresa';
INSERT INTO transferencia (cuenta_origen, cuenta_destino, monto, id_usuario_creador)
VALUES ('999-ORIG-001', '999-DEST-001', 500000.00, 7);
CALL sp_test_assert(
    'TEST-17: Transferencia bajo umbral se ejecuta directamente (Ejecutada)',
    (SELECT cet.nombre_estado FROM transferencia t
     JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
     WHERE t.cuenta_origen = '999-ORIG-001' AND t.monto = 500000.00
     ORDER BY t.id_transferencia DESC LIMIT 1) = 'Ejecutada',
    'La transferencia bajo umbral no quedo Ejecutada'
);

-- TEST-18: Transferencia sobre umbral queda En Espera de Aprobacion
SET @id_usuario_sesion = 7;
SET @rol_sesion = 'Empleado Empresa';
INSERT INTO transferencia (cuenta_origen, cuenta_destino, monto, id_usuario_creador)
VALUES ('999-EMP-001', '999-DEST-001', 15000000.00, 7);
SET @id_transf_alta = LAST_INSERT_ID();
CALL sp_test_assert(
    'TEST-18: Transferencia sobre umbral queda En Espera de Aprobacion',
    (SELECT cet.nombre_estado FROM transferencia t
     JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
     WHERE t.id_transferencia = @id_transf_alta) = 'En Espera de Aprobacion',
    'La transferencia de alto monto no quedo En Espera de Aprobacion'
);

-- TEST-19a: Transferencia imposible queda En Espera (monto > umbral)
SET @id_usuario_sesion = 7;
SET @rol_sesion = 'Empleado Empresa';
INSERT INTO transferencia (cuenta_origen, cuenta_destino, monto, id_usuario_creador)
VALUES ('999-DEST-001', '999-ORIG-001', 999999999.00, 7);
SET @id_transf_sin_saldo = LAST_INSERT_ID();
CALL sp_test_assert(
    'TEST-19a: Transferencia imposible queda En Espera (no ejecutada directamente)',
    (SELECT cet.nombre_estado FROM transferencia t
     JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
     WHERE t.id_transferencia = @id_transf_sin_saldo) = 'En Espera de Aprobacion',
    'La transferencia no quedo En Espera de Aprobacion'
);

-- TEST-19b: Aprobar transferencia sin saldo falla por INV-21
DELIMITER //
DROP PROCEDURE IF EXISTS _t19b //
CREATE PROCEDURE _t19b()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-19b: Aprobar transferencia sin saldo falla por INV-21', TRUE, '');
    SET @id_usuario_sesion = 8;
    SET @rol_sesion = 'Supervisor Empresa';
    CALL sp_aprobar_transferencia(@id_transf_sin_saldo, 8);
    CALL sp_test_assert('TEST-19b: Aprobar transferencia sin saldo falla por INV-21', FALSE,
        'Debio rechazar por saldo insuficiente al ejecutar');
END //
DELIMITER ;
CALL _t19b();
DROP PROCEDURE IF EXISTS _t19b;

-- TEST-20: Transferencia desde cuenta Bloqueada debe fallar (INV-22)
DELIMITER //
DROP PROCEDURE IF EXISTS _t20 //
CREATE PROCEDURE _t20()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-20: Transferencia desde cuenta Bloqueada es rechazada', TRUE, '');
    UPDATE cuenta_bancaria
    SET id_estado_cuenta = (SELECT id_estado_cuenta FROM cat_estado_cuenta WHERE nombre_estado = 'Bloqueada')
    WHERE numero_cuenta = '999-ORIG-001';
    SET @id_usuario_sesion = 7;
    SET @rol_sesion = 'Empleado Empresa';
    INSERT INTO transferencia (cuenta_origen, cuenta_destino, monto, id_usuario_creador)
    VALUES ('999-ORIG-001', '999-DEST-001', 100.00, 7);
    CALL sp_test_assert('TEST-20: Transferencia desde cuenta Bloqueada es rechazada', FALSE,
        'Debio rechazar por cuenta Bloqueada');
END //
DELIMITER ;
CALL _t20();
DROP PROCEDURE IF EXISTS _t20;

-- Restaurar cuenta origen
UPDATE cuenta_bancaria
SET id_estado_cuenta = (SELECT id_estado_cuenta FROM cat_estado_cuenta WHERE nombre_estado = 'Activa')
WHERE numero_cuenta = '999-ORIG-001';

-- TEST-21: Aprobacion de transferencia de alto monto
SET @id_usuario_sesion = 8;
SET @rol_sesion = 'Supervisor Empresa';
CALL sp_aprobar_transferencia(@id_transf_alta, 8);
CALL sp_test_assert(
    'TEST-21: sp_aprobar_transferencia ejecuta la transferencia',
    (SELECT cet.nombre_estado FROM transferencia t
     JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
     WHERE t.id_transferencia = @id_transf_alta) = 'Ejecutada',
    'La transferencia aprobada no quedo Ejecutada'
);

-- TEST-22: Saldo cuenta destino aumento tras transferencia ejecutada
CALL sp_test_assert(
    'TEST-22: Saldo cuenta destino aumento tras transferencia ejecutada',
    (SELECT saldo_actual FROM cuenta_bancaria WHERE numero_cuenta = '999-DEST-001') > 1000000.00,
    'El saldo destino no aumento'
);

-- TEST-23: Transferencia vencida no puede modificarse (INV-23)
DELIMITER //
DROP PROCEDURE IF EXISTS _t23 //
CREATE PROCEDURE _t23()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-23: Transferencia Vencida no puede modificarse', TRUE, '');
    SET @id_usuario_sesion = 7;
    SET @rol_sesion = 'Empleado Empresa';
    INSERT INTO transferencia (cuenta_origen, cuenta_destino, monto, id_usuario_creador, fecha_vencimiento)
    VALUES ('999-EMP-001', '999-DEST-001', 12000000.00, 7, DATE_SUB(NOW(), INTERVAL 2 HOUR));
    SET @id_transf_vencida = LAST_INSERT_ID();
    SET @id_usuario_sesion = 0;
    SET @rol_sesion = 'SISTEMA';
    UPDATE transferencia
    SET id_estado_transferencia = (
        SELECT id_estado_transferencia FROM cat_estado_transferencia WHERE nombre_estado = 'Vencida'
    )
    WHERE id_transferencia = @id_transf_vencida;
    SET @id_usuario_sesion = 8;
    SET @rol_sesion = 'Supervisor Empresa';
    CALL sp_aprobar_transferencia(@id_transf_vencida, 8);
    CALL sp_test_assert('TEST-23: Transferencia Vencida no puede modificarse', FALSE,
        'Debio rechazar modificacion de transferencia Vencida');
END //
DELIMITER ;
CALL _t23();
DROP PROCEDURE IF EXISTS _t23;

-- ============================================================
-- BLOQUE 4: PRESTAMOS
-- ============================================================
SELECT '=== BLOQUE 4: PRESTAMOS ===' AS seccion;

-- TEST-24: Solicitud de prestamo por Cliente PN
SET @id_usuario_sesion = 1;
SET @rol_sesion = 'Cliente Persona Natural';
CALL sp_solicitar_prestamo('1001234567', 'PERSONA_NATURAL', 'Personal', 5000000.00, 1, @id_prestamo_test);
CALL sp_test_assert(
    'TEST-24: sp_solicitar_prestamo crea solicitud en estado En Estudio',
    (SELECT cep.nombre_estado FROM prestamo p
     JOIN cat_estado_prestamo cep ON p.id_estado_prestamo = cep.id_estado_prestamo
     WHERE p.id_prestamo = @id_prestamo_test) = 'En Estudio',
    'El prestamo no quedo en estado En Estudio'
);

-- TEST-25: Rol no autorizado no puede solicitar prestamo
DELIMITER //
DROP PROCEDURE IF EXISTS _t25 //
CREATE PROCEDURE _t25()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-25: Empleado Ventanilla no puede solicitar prestamo', TRUE, '');
    SET @id_usuario_sesion = 5;
    SET @rol_sesion = 'Empleado Ventanilla';
    CALL sp_solicitar_prestamo('1001234567', 'PERSONA_NATURAL', 'Personal', 1000000.00, 5, @dummy_prestamo);
    CALL sp_test_assert('TEST-25: Empleado Ventanilla no puede solicitar prestamo', FALSE,
        'Debio rechazar por rol no autorizado');
END //
DELIMITER ;
CALL _t25();
DROP PROCEDURE IF EXISTS _t25;

-- TEST-26: Aprobacion de prestamo por Analista Interno
SET @id_usuario_sesion = 9;
SET @rol_sesion = 'Analista Interno';
CALL sp_aprobar_prestamo(@id_prestamo_test, 9, 4500000.00, 12.5, 24, '001-0001-001');
CALL sp_test_assert(
    'TEST-26: sp_aprobar_prestamo cambia estado a Aprobado',
    (SELECT cep.nombre_estado FROM prestamo p
     JOIN cat_estado_prestamo cep ON p.id_estado_prestamo = cep.id_estado_prestamo
     WHERE p.id_prestamo = @id_prestamo_test) = 'Aprobado',
    'El prestamo no quedo en estado Aprobado'
);

-- TEST-27: Desembolso de prestamo aprobado
SET @id_usuario_sesion = 9;
SET @rol_sesion = 'Analista Interno';
CALL sp_desembolsar_prestamo(@id_prestamo_test, 9);
CALL sp_test_assert(
    'TEST-27: sp_desembolsar_prestamo cambia estado a Desembolsado',
    (SELECT cep.nombre_estado FROM prestamo p
     JOIN cat_estado_prestamo cep ON p.id_estado_prestamo = cep.id_estado_prestamo
     WHERE p.id_prestamo = @id_prestamo_test) = 'Desembolsado',
    'El prestamo no quedo en estado Desembolsado'
);

-- TEST-28: Saldo cuenta destino aumento tras desembolso (INV-28)
CALL sp_test_assert(
    'TEST-28: Saldo cuenta destino aumento tras desembolso de prestamo',
    (SELECT saldo_actual FROM cuenta_bancaria WHERE numero_cuenta = '001-0001-001') > 5000000.00,
    'El saldo de la cuenta destino no aumento tras el desembolso'
);

-- TEST-29: Rechazo de prestamo
SET @id_usuario_sesion = 1;
SET @rol_sesion = 'Cliente Persona Natural';
CALL sp_solicitar_prestamo('1001234567', 'PERSONA_NATURAL', 'Hipotecario', 200000000.00, 1, @id_prestamo_rechazar);
SET @id_usuario_sesion = 9;
SET @rol_sesion = 'Analista Interno';
CALL sp_rechazar_prestamo(@id_prestamo_rechazar, 9, 'Capacidad de pago insuficiente');
CALL sp_test_assert(
    'TEST-29: sp_rechazar_prestamo cambia estado a Rechazado',
    (SELECT cep.nombre_estado FROM prestamo p
     JOIN cat_estado_prestamo cep ON p.id_estado_prestamo = cep.id_estado_prestamo
     WHERE p.id_prestamo = @id_prestamo_rechazar) = 'Rechazado',
    'El prestamo no quedo en estado Rechazado'
);

-- TEST-30: Transicion invalida (Rechazado → Aprobado) debe fallar
DELIMITER //
DROP PROCEDURE IF EXISTS _t30 //
CREATE PROCEDURE _t30()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-30: Transicion invalida de prestamo es rechazada', TRUE, '');
    SET @id_usuario_sesion = 9;
    SET @rol_sesion = 'Analista Interno';
    CALL sp_aprobar_prestamo(@id_prestamo_rechazar, 9, 100000.00, 10.0, 12, '001-0001-001');
    CALL sp_test_assert('TEST-30: Transicion invalida de prestamo es rechazada', FALSE,
        'Debio rechazar transicion Rechazado a Aprobado');
END //
DELIMITER ;
CALL _t30();
DROP PROCEDURE IF EXISTS _t30;

-- TEST-31: Aprobacion con cuenta destino inexistente debe fallar
DELIMITER //
DROP PROCEDURE IF EXISTS _t31 //
CREATE PROCEDURE _t31()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-31: Desembolso sin cuenta destino es rechazado', TRUE, '');
    SET @id_usuario_sesion = 1;
    SET @rol_sesion = 'Cliente Persona Natural';
    CALL sp_solicitar_prestamo('1001234567', 'PERSONA_NATURAL', 'Personal', 1000000.00, 1, @id_prestamo_sin_cuenta);
    SET @id_usuario_sesion = 9;
    SET @rol_sesion = 'Analista Interno';
    CALL sp_aprobar_prestamo(@id_prestamo_sin_cuenta, 9, 1000000.00, 10.0, 12, '999-CUENTA-INEXISTENTE');
    CALL sp_test_assert('TEST-31: Desembolso sin cuenta destino es rechazado', FALSE,
        'Debio rechazar aprobacion con cuenta destino inexistente');
END //
DELIMITER ;
CALL _t31();
DROP PROCEDURE IF EXISTS _t31;

-- ============================================================
-- BLOQUE 5: PAGOS MASIVOS / NOMINA
-- ============================================================
SELECT '=== BLOQUE 5: PAGOS MASIVOS / NOMINA ===' AS seccion;

-- TEST-32: Crear lote de transferencia
SET @id_usuario_sesion = 7;
SET @rol_sesion = 'Empleado Empresa';
CALL sp_crear_lote_transferencia(
    'Nomina Mayo 2026', '999-EMP-001', 7,
    JSON_ARRAY(
        JSON_OBJECT('cuenta_destino','999-ORIG-001','monto',2000000.00,'concepto','Salario Ana'),
        JSON_OBJECT('cuenta_destino','999-DEST-001','monto',1800000.00,'concepto','Salario Carlos')
    ),
    @id_lote_test
);
CALL sp_test_assert(
    'TEST-32: sp_crear_lote_transferencia crea lote en estado Pendiente',
    (SELECT cel.nombre_estado FROM lote_transferencia lt
     JOIN cat_estado_lote cel ON lt.id_estado_lote = cel.id_estado_lote
     WHERE lt.id_lote = @id_lote_test) = 'Pendiente',
    'El lote no quedo en estado Pendiente'
);

-- TEST-33: Lote tiene el numero correcto de lineas
CALL sp_test_assert(
    'TEST-33: Lote tiene 2 lineas de detalle',
    (SELECT COUNT(*) FROM detalle_lote_transferencia WHERE id_lote = @id_lote_test) = 2,
    'El lote no tiene 2 lineas de detalle'
);

-- TEST-34: Procesar lote exitosamente
SET @id_usuario_sesion = 8;
SET @rol_sesion = 'Supervisor Empresa';
CALL sp_procesar_lote_transferencia(@id_lote_test, 8);
CALL sp_test_assert(
    'TEST-34: sp_procesar_lote_transferencia completa el lote',
    (SELECT cel.nombre_estado FROM lote_transferencia lt
     JOIN cat_estado_lote cel ON lt.id_estado_lote = cel.id_estado_lote
     WHERE lt.id_lote = @id_lote_test) = 'Completado',
    'El lote no quedo en estado Completado'
);

-- TEST-35: Todas las lineas quedaron Ejecutadas
CALL sp_test_assert(
    'TEST-35: Todas las lineas del lote quedaron Ejecutadas',
    (SELECT COUNT(*) FROM detalle_lote_transferencia
     WHERE id_lote = @id_lote_test AND estado_linea = 'Ejecutada') = 2,
    'No todas las lineas del lote quedaron Ejecutadas'
);

-- TEST-36: Lote con linea fallida queda Con Errores
SET @id_usuario_sesion = 7;
SET @rol_sesion = 'Empleado Empresa';
CALL sp_crear_lote_transferencia(
    'Lote Con Error', '999-EMP-001', 7,
    JSON_ARRAY(
        JSON_OBJECT('cuenta_destino','999-ORIG-001','monto',100.00,'concepto','Pago pequeno'),
        JSON_OBJECT('cuenta_destino','999-DEST-001','monto',999999999.00,'concepto','Pago imposible')
    ),
    @id_lote_error
);
SET @id_usuario_sesion = 8;
SET @rol_sesion = 'Supervisor Empresa';
CALL sp_procesar_lote_transferencia(@id_lote_error, 8);
CALL sp_test_assert(
    'TEST-36: Lote con linea fallida queda en estado Con Errores',
    (SELECT cel.nombre_estado FROM lote_transferencia lt
     JOIN cat_estado_lote cel ON lt.id_estado_lote = cel.id_estado_lote
     WHERE lt.id_lote = @id_lote_error) = 'Con Errores',
    'El lote con error no quedo en estado Con Errores'
);

-- TEST-37: Rol no autorizado no puede crear lote
DELIMITER //
DROP PROCEDURE IF EXISTS _t37 //
CREATE PROCEDURE _t37()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-37: Cliente PN no puede crear lote de transferencia', TRUE, '');
    SET @id_usuario_sesion = 1;
    SET @rol_sesion = 'Cliente Persona Natural';
    CALL sp_crear_lote_transferencia(
        'Lote No Autorizado', '999-ORIG-001', 1,
        JSON_ARRAY(JSON_OBJECT('cuenta_destino','999-DEST-001','monto',100.00,'concepto','X')),
        @dummy_lote
    );
    CALL sp_test_assert('TEST-37: Cliente PN no puede crear lote de transferencia', FALSE,
        'Debio rechazar por rol no autorizado');
END //
DELIMITER ;
CALL _t37();
DROP PROCEDURE IF EXISTS _t37;

-- ============================================================
-- BLOQUE 6: TRIGGERS Y BITACORA
-- ============================================================
SELECT '=== BLOQUE 6: TRIGGERS Y BITACORA ===' AS seccion;

-- TEST-38: Correo invalido rechazado por TRG-01 (INV-02)
DELIMITER //
DROP PROCEDURE IF EXISTS _t38 //
CREATE PROCEDURE _t38()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-38: TRG-01 rechaza correo sin @ ni dominio', TRUE, '');
    SET @id_usuario_sesion = 0;
    SET @rol_sesion = 'SISTEMA';
    INSERT INTO usuario (nombre_completo, id_identificacion, correo_electronico,
                         telefono, fecha_nacimiento, direccion, id_rol, id_estado_usuario)
    VALUES ('Test Correo Malo','9990000010','correo-invalido','3001110010','1990-01-01','Calle X',1,1);
    CALL sp_test_assert('TEST-38: TRG-01 rechaza correo sin @ ni dominio', FALSE,
        'Debio rechazar correo invalido');
END //
DELIMITER ;
CALL _t38();
DROP PROCEDURE IF EXISTS _t38;

-- TEST-39: Telefono corto rechazado por TRG-01 (INV-03)
DELIMITER //
DROP PROCEDURE IF EXISTS _t39 //
CREATE PROCEDURE _t39()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-39: TRG-01 rechaza telefono menor a 7 digitos', TRUE, '');
    SET @id_usuario_sesion = 0;
    SET @rol_sesion = 'SISTEMA';
    INSERT INTO usuario (nombre_completo, id_identificacion, correo_electronico,
                         telefono, fecha_nacimiento, direccion, id_rol, id_estado_usuario)
    VALUES ('Test Tel Corto','9990000011','tel@banco.com','123','1990-01-01','Calle X',1,1);
    CALL sp_test_assert('TEST-39: TRG-01 rechaza telefono menor a 7 digitos', FALSE,
        'Debio rechazar telefono corto');
END //
DELIMITER ;
CALL _t39();
DROP PROCEDURE IF EXISTS _t39;

-- TEST-40: Creacion de usuario genera registro en bitacora (TRG-15)
SET @id_usuario_sesion = 0;
SET @rol_sesion = 'SISTEMA';
CALL sp_crear_usuario(
    'Test Bitacora', '9990000020', 'bitacora@banco.com',
    '3001110020', '1990-06-15', 'Calle Bitacora',
    'Cliente Persona Natural', NULL, @usr_bitacora
);
CALL sp_test_assert(
    'TEST-40: TRG-15 registra creacion de usuario en bitacora',
    (SELECT COUNT(*) FROM bitacora_cola
     WHERE tipo_operacion = 'USUARIO_CREADO'
       AND id_producto_afectado = CAST(@usr_bitacora AS CHAR)) >= 1,
    'No se encontro registro de USUARIO_CREADO en bitacora'
);

-- TEST-41: Apertura de cuenta genera registro en bitacora (TRG-18)
SET @id_usuario_sesion = 5;
SET @rol_sesion = 'Empleado Ventanilla';
CALL sp_crear_cuenta('999-BIT-001', 'Ahorros', '9990000020', 'PERSONA_NATURAL', 'COP', 0.00, 5);
CALL sp_test_assert(
    'TEST-41: TRG-18 registra apertura de cuenta en bitacora',
    (SELECT COUNT(*) FROM bitacora_cola
     WHERE tipo_operacion = 'CUENTA_ABIERTA'
       AND id_producto_afectado = '999-BIT-001') >= 1,
    'No se encontro registro de CUENTA_ABIERTA en bitacora'
);

-- TEST-42: Solicitud de prestamo genera registro en bitacora (TRG-19)
SET @id_usuario_sesion = @usr_bitacora;
SET @rol_sesion = 'Cliente Persona Natural';
CALL sp_solicitar_prestamo('9990000020', 'PERSONA_NATURAL', 'Personal', 500000.00, @usr_bitacora, @id_prestamo_bit);
CALL sp_test_assert(
    'TEST-42: TRG-19 registra solicitud de prestamo en bitacora',
    (SELECT COUNT(*) FROM bitacora_cola
     WHERE tipo_operacion = 'PRESTAMO_SOLICITADO'
       AND id_producto_afectado = CAST(@id_prestamo_bit AS CHAR)) >= 1,
    'No se encontro registro de PRESTAMO_SOLICITADO en bitacora'
);

-- TEST-43: Vista v_bitacora_cliente_pn retorna registros
SET @id_usuario_sesion = 1;
CALL sp_test_assert(
    'TEST-43: v_bitacora_cliente_pn retorna registros del cliente PN',
    (SELECT COUNT(*) FROM v_bitacora_cliente_pn) > 0,
    'La vista v_bitacora_cliente_pn no retorno registros'
);

-- TEST-44: Vista v_bitacora_empresa retorna registros
SET @id_usuario_sesion = 4;
CALL sp_test_assert(
    'TEST-44: v_bitacora_empresa retorna registros de la empresa',
    (SELECT COUNT(*) FROM v_bitacora_empresa) > 0,
    'La vista v_bitacora_empresa no retorno registros'
);

-- ============================================================
-- BLOQUE 7: RESTRICCIONES DE ROL
-- ============================================================
SELECT '=== BLOQUE 7: RESTRICCIONES DE ROL ===' AS seccion;

-- TEST-45: Solo Empleado Ventanilla puede hacer depositos de caja
DELIMITER //
DROP PROCEDURE IF EXISTS _t45 //
CREATE PROCEDURE _t45()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-45: Cliente PN no puede hacer deposito de caja', TRUE, '');
    SET @id_usuario_sesion = 1;
    SET @rol_sesion = 'Cliente Persona Natural';
    CALL sp_depositar('999-BIT-001', 100.00, 1, 'Deposito no autorizado');
    CALL sp_test_assert('TEST-45: Cliente PN no puede hacer deposito de caja', FALSE,
        'Debio rechazar deposito por rol no autorizado');
END //
DELIMITER ;
CALL _t45();
DROP PROCEDURE IF EXISTS _t45;

-- TEST-46: Solo Empleado Ventanilla puede hacer retiros de caja
DELIMITER //
DROP PROCEDURE IF EXISTS _t46 //
CREATE PROCEDURE _t46()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-46: Analista Interno no puede hacer retiro de caja', TRUE, '');
    SET @id_usuario_sesion = 9;
    SET @rol_sesion = 'Analista Interno';
    CALL sp_retirar('001-0001-001', 100.00, 9, 'Retiro no autorizado por Analista');
    CALL sp_test_assert('TEST-46: Analista Interno no puede hacer retiro de caja', FALSE,
        'Debio rechazar retiro por rol no autorizado');
END //
DELIMITER ;
CALL _t46();
DROP PROCEDURE IF EXISTS _t46;

-- TEST-47: Solo Analista Interno puede aprobar prestamos (INV-14)
DELIMITER //
DROP PROCEDURE IF EXISTS _t47 //
CREATE PROCEDURE _t47()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-47: Empleado Comercial no puede aprobar prestamo', TRUE, '');
    SET @id_usuario_sesion = 6;
    SET @rol_sesion = 'Empleado Comercial';
    CALL sp_aprobar_prestamo(@id_prestamo_bit, 6, 500000.00, 10.0, 12, '999-BIT-001');
    CALL sp_test_assert('TEST-47: Empleado Comercial no puede aprobar prestamo', FALSE,
        'Debio rechazar aprobacion por rol no autorizado');
END //
DELIMITER ;
CALL _t47();
DROP PROCEDURE IF EXISTS _t47;

-- TEST-48: Solo Supervisor Empresa puede aprobar transferencias de alto monto (INV-25)
DELIMITER //
DROP PROCEDURE IF EXISTS _t48 //
CREATE PROCEDURE _t48()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        CALL sp_test_assert('TEST-48: Empleado Empresa no puede aprobar transferencia', TRUE, '');
    SET @id_usuario_sesion = 7;
    SET @rol_sesion = 'Empleado Empresa';
    INSERT INTO transferencia (cuenta_origen, cuenta_destino, monto, id_usuario_creador)
    VALUES ('999-EMP-001', '999-DEST-001', 11000000.00, 7);
    SET @id_transf_rol = LAST_INSERT_ID();
    CALL sp_aprobar_transferencia(@id_transf_rol, 7);
    CALL sp_test_assert('TEST-48: Empleado Empresa no puede aprobar transferencia', FALSE,
        'Debio rechazar aprobacion por rol no autorizado');
END //
DELIMITER ;
CALL _t48();
DROP PROCEDURE IF EXISTS _t48;

-- ============================================================
-- RESUMEN FINAL
-- ============================================================
SELECT '=== RESUMEN DE PRUEBAS ===' AS seccion;
SELECT 'Revisa cada SELECT individual para ver [PASS] o [FAIL] por test.' AS instruccion;
SELECT 'Fin de la suite de pruebas 08_tests.sql' AS mensaje;
