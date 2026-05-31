-- ============================================================
-- 07_seed_data.sql
-- Datos iniciales, permisos de usuarios y datos de prueba
-- Ejecutar después de 06_procedures.sql
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- BC-01: Catálogos de roles y estados de usuario
-- ------------------------------------------------------------

INSERT INTO cat_rol (nombre_rol, descripcion) VALUES
    ('Cliente Persona Natural', 'Usuario individual del banco, mayor de edad'),
    ('Cliente Empresa',         'Entidad legal registrada con NIT'),
    ('Empleado Ventanilla',      'Consulta saldos y abre cuentas'),
    ('Empleado Comercial',       'Gestiona productos y crea solicitudes'),
    ('Empleado Empresa',         'Crea transferencias y pagos masivos'),
    ('Supervisor Empresa',       'Aprueba o rechaza transferencias de alto valor'),
    ('Analista Interno',         'Aprueba préstamos y accede a bitácora completa'),
    ('Administrador',            'Administrador del sistema con acceso total');

INSERT INTO cat_estado_usuario (nombre_estado) VALUES
    ('Activo'),
    ('Inactivo'),
    ('Bloqueado');
-- NOTA: 'Bloqueado' es requerido por el PDF (pag. 11):
-- "No se puede abrir una cuenta a un cliente cuyo Estado_Usuario este
--  como 'Inactivo' o 'Bloqueado'."
-- sp_bloquear_cliente y sp_cambiar_estado_usuario usan este estado.

-- ------------------------------------------------------------
-- BC-03: Catálogos de cuentas
-- ------------------------------------------------------------

INSERT INTO cat_tipo_cuenta (nombre_tipo) VALUES
    ('Ahorros'),
    ('Corriente'),
    ('Personal'),
    ('Empresarial');
-- NOTA PDF (pag. 5): "Pueden ser de tipo 'Ahorros', 'Corriente', 'Personal' o 'Empresarial'."
-- Se reemplaza 'Nomina' por 'Personal' segun el PDF.
-- 'Nomina' no es un tipo de cuenta en el PDF; es un CASO DE USO de pagos masivos
-- implementado en lote_transferencia / detalle_lote_transferencia (03b_tables_lote.sql).
-- EQUIVALENCIA DE ESTADOS: el PDF menciona 'Cancelada' como estado de cuenta (pag. 11).
-- Se usa 'Cancelada' para consistencia con el backend y frontend.
-- TRG-09 valida != 'Activa', por lo que cubre ambos terminos.
-- La tabla cat_estado_cuenta contiene: Activa, Bloqueada, Cancelada.

INSERT INTO cat_moneda (codigo_iso, nombre_moneda) VALUES
    ('COP', 'Peso Colombiano'),
    ('USD', 'Dolar Estadounidense'),
    ('EUR', 'Euro');

INSERT INTO cat_estado_cuenta (nombre_estado) VALUES
    ('Activa'),
    ('Bloqueada'),
    ('Cancelada');

-- ------------------------------------------------------------
-- BC-04: Catálogos de préstamos y máquina de estados
-- ------------------------------------------------------------

INSERT INTO cat_tipo_prestamo (nombre_tipo) VALUES
    ('Personal'),
    ('Hipotecario'),
    ('Vehicular'),
    ('Empresarial'),
    ('Educativo'),
    ('Libre Inversion');

INSERT INTO cat_estado_prestamo (nombre_estado, es_estado_final) VALUES
    ('Solicitado',   FALSE),
    ('En Revision',  FALSE),
    ('Aprobado',     FALSE),
    ('Rechazado',    TRUE),
    ('Desembolsado', TRUE),
    ('Cancelado',    TRUE);

-- Máquina de estados de préstamo (INV-15)
-- Solicitado(1)  → En Revision(2)  | Analista Interno(7)
-- Solicitado(1)  → Aprobado(3)     | Analista Interno(7)
-- Solicitado(1)  → Rechazado(4)    | Analista Interno(7)
-- En Revision(2) → Aprobado(3)     | Analista Interno(7)
-- En Revision(2) → Rechazado(4)    | Analista Interno(7)
-- Aprobado(3)    → Desembolsado(5) | Supervisor Empresa(6)
-- Aprobado(3)    → Cancelado(6)    | Analista Interno(7)
INSERT INTO prestamo_transicion_estado (id_estado_origen, id_estado_destino, id_rol_requerido) VALUES
    (1, 2, 7),
    (1, 3, 7),
    (1, 4, 7),
    (2, 3, 7),
    (2, 4, 7),
    (3, 5, 6),
    (3, 6, 7);

-- ------------------------------------------------------------
-- BC-05: Catálogos de transferencias, máquina de estados y umbral
-- ------------------------------------------------------------

INSERT INTO cat_estado_transferencia (nombre_estado, es_estado_final) VALUES
    ('Pendiente',               FALSE),
    ('En Espera de Aprobacion', FALSE),
    ('Aprobada',                FALSE),
    ('Ejecutada',               TRUE),
    ('Rechazada',               TRUE),
    ('Vencida',                 TRUE);

-- Máquina de estados de transferencia
-- Pendiente(1)             → Ejecutada(4)              | Empleado Empresa(5)
-- Pendiente(1)             → En Espera Aprobacion(2)   | Sistema  usamos rol Empleado Empresa(5)
-- En Espera Aprobacion(2)  → Aprobada(3)               | Supervisor Empresa(6)
-- En Espera Aprobacion(2)  → Rechazada(5)              | Supervisor Empresa(6)
-- En Espera Aprobacion(2)  → Vencida(6)                | Sistema  usamos rol Analista Interno(7)
-- Aprobada(3)              → Ejecutada(4)              | Sistema  usamos rol Analista Interno(7)
INSERT INTO transferencia_transicion_estado (id_estado_origen, id_estado_destino, id_rol_requerido) VALUES
    (1, 4, 5),
    (1, 2, 5),
    (2, 3, 6),
    (2, 5, 6),
    (2, 6, 7),
    (3, 4, 7);

-- Umbral inicial: 10,000,000 COP
INSERT INTO config_umbral_transferencia (monto_umbral, id_moneda, vigente) VALUES
    (10000000.00, 1, TRUE);

-- ------------------------------------------------------------
-- BC-07: Catálogo de categorías y productos bancarios
-- ------------------------------------------------------------

INSERT INTO cat_categoria_producto (nombre_categoria) VALUES
    ('Cuenta'),
    ('Credito'),
    ('Inversion'),
    ('Seguro'),
    ('Servicio');

INSERT INTO producto_bancario (codigo_producto, nombre_producto, id_categoria, requiere_aprobacion) VALUES
    ('PROD-001', 'Cuenta de Ahorros',          1, FALSE),
    ('PROD-002', 'Cuenta Corriente',           1, FALSE),
    ('PROD-003', 'Prestamo Personal',          2, TRUE),
    ('PROD-004', 'Prestamo Hipotecario',       2, TRUE),
    ('PROD-005', 'Prestamo Vehicular',         2, TRUE),
    ('PROD-006', 'CDT 90 dias',                3, FALSE),
    ('PROD-007', 'Seguro de Vida Basico',      4, FALSE),
    ('PROD-008', 'Transferencia Nacional',     5, FALSE),
    ('PROD-009', 'Transferencia Internacional',5, TRUE);

-- ------------------------------------------------------------
-- DATOS DE PRUEBA — Usuarios, Clientes, Cuentas
-- ------------------------------------------------------------

-- Usuarios del sistema
SET @id_usuario_sesion = 0; SET @rol_sesion = 'SISTEMA';

INSERT INTO usuario (nombre_completo, id_identificacion, correo_electronico, telefono, fecha_nacimiento, direccion, id_rol, id_estado_usuario) VALUES
    ('Ana Maria Lopez',      '1001234567', 'ana.lopez@email.com',      '3001234567', '1990-05-15', 'Calle 10 # 20-30, Bogota',    1, 1),
    ('Carlos Perez Ruiz',    '1009876543', 'carlos.perez@email.com',   '3109876543', '1985-08-22', 'Carrera 5 # 15-40, Medellin', 1, 1),
    ('Maria Torres',         '1005551234', 'maria.torres@email.com',   '3205551234', '1992-03-10', 'Av 30 # 45-60, Cali',         1, 1),
    ('Empresa ABC SAS',      '900123456',  'contacto@empresaabc.com',  '6011234567', NULL,         'Zona Industrial, Bogota',     2, 1),
    ('Pedro Ventanilla',     '1002223333', 'pedro.vent@banco.com',     '3002223333', '1988-07-20', 'Oficina Central, Bogota',     3, 1),
    ('Laura Comercial',      '1003334444', 'laura.com@banco.com',      '3003334444', '1991-11-05', 'Oficina Norte, Bogota',       4, 1),
    ('Juan Emp Empresa',     '1004445555', 'juan.emp@empresaabc.com',  '3004445555', '1987-04-18', 'Empresa ABC, Bogota',         5, 1),
    ('Sofia Supervisora',    '1005556666', 'sofia.sup@empresaabc.com', '3005556666', '1983-09-30', 'Empresa ABC, Bogota',         6, 1),
    ('Roberto Analista',     '1006667777', 'roberto.ana@banco.com',    '3006667777', '1979-12-12', 'Sede Principal, Bogota',      7, 1);

-- Clientes Persona Natural
INSERT INTO cliente_persona_natural (id_identificacion, tipo_identificacion, nombre_completo, correo_electronico, telefono, fecha_nacimiento, direccion, id_usuario) VALUES
    ('1001234567', 'Cedula', 'Ana Maria Lopez',   'ana.lopez@email.com',    '3001234567', '1990-05-15', 'Calle 10 # 20-30, Bogota',    1),
    ('1009876543', 'Cedula', 'Carlos Perez Ruiz', 'carlos.perez@email.com', '3109876543', '1985-08-22', 'Carrera 5 # 15-40, Medellin', 2),
    ('1005551234', 'Cedula', 'Maria Torres',      'maria.torres@email.com', '3205551234', '1992-03-10', 'Av 30 # 45-60, Cali',         3);

-- Cliente Empresa (representante legal = Ana Maria Lopez)
INSERT INTO cliente_empresa (nit, razon_social, correo_electronico, telefono, direccion, id_representante_legal, id_usuario) VALUES
    ('900123456', 'Empresa ABC SAS', 'contacto@empresaabc.com', '6011234567', 'Zona Industrial, Bogota', '1001234567', 4);

-- Cuentas bancarias
INSERT INTO cuenta_bancaria (numero_cuenta, id_tipo_cuenta, id_titular, tipo_titular, saldo_actual, id_moneda, id_estado_cuenta, fecha_apertura, id_usuario_apertura) VALUES
    ('001-0001-001', 1, '1001234567', 'PERSONA_NATURAL', 5000000.00,  1, 1, CURDATE(), 5),
    ('001-0002-001', 1, '1009876543', 'PERSONA_NATURAL', 12000000.00, 1, 1, CURDATE(), 5),
    ('001-0003-001', 2, '1005551234', 'PERSONA_NATURAL', 8500000.00,  1, 1, CURDATE(), 5),
    ('002-0001-001', 4, '900123456',  'EMPRESA',         50000000.00, 1, 1, CURDATE(), 5),
    ('002-0002-001', 4, '900123456',  'EMPRESA',         25000000.00, 1, 1, CURDATE(), 5);

-- ------------------------------------------------------------
-- PERMISOS DE USUARIOS DE BASE DE DATOS
-- ------------------------------------------------------------

-- db_sistema: ejecuta todos los SPs e inserta en bitácora
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_registrar_bitacora    TO 'db_sistema'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_ejecutar_transferencia TO 'db_sistema'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_desembolsar_prestamo  TO 'db_sistema'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_aprobar_prestamo      TO 'db_sistema'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_rechazar_prestamo     TO 'db_sistema'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_aprobar_transferencia TO 'db_sistema'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_rechazar_transferencia TO 'db_sistema'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_bloquear_cuenta       TO 'db_sistema'@'%';
GRANT INSERT ON banco_ddd.bitacora_cola TO 'db_sistema'@'%';

-- db_analista: aprueba/rechaza/desembolsa préstamos, lee bitácora y préstamos
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_aprobar_prestamo     TO 'db_analista'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_rechazar_prestamo    TO 'db_analista'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_desembolsar_prestamo TO 'db_analista'@'%';
GRANT SELECT ON banco_ddd.v_prestamos_analista TO 'db_analista'@'%';
GRANT SELECT ON banco_ddd.v_bitacora_analista  TO 'db_analista'@'%';
GRANT SELECT ON banco_ddd.usuario              TO 'db_analista'@'%';

-- db_supervisor: aprueba/rechaza transferencias
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_aprobar_transferencia  TO 'db_supervisor'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_rechazar_transferencia TO 'db_supervisor'@'%';
GRANT SELECT ON banco_ddd.v_transferencias_supervisor TO 'db_supervisor'@'%';

-- db_cliente_pn: ve sus cuentas, préstamos y transferencias
GRANT SELECT ON banco_ddd.v_cuentas_cliente_pn        TO 'db_cliente_pn'@'%';
GRANT SELECT ON banco_ddd.v_prestamos_cliente_pn      TO 'db_cliente_pn'@'%';
GRANT SELECT ON banco_ddd.v_transferencias_cliente_pn TO 'db_cliente_pn'@'%';
GRANT SELECT ON banco_ddd.v_bitacora_cliente_pn       TO 'db_cliente_pn'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_ejecutar_transferencia TO 'db_cliente_pn'@'%';

-- db_cliente_empresa: ve cuentas y préstamos de su empresa
GRANT SELECT ON banco_ddd.v_cuentas_empresa    TO 'db_cliente_empresa'@'%';
GRANT SELECT ON banco_ddd.v_prestamos_empresa  TO 'db_cliente_empresa'@'%';
GRANT SELECT ON banco_ddd.v_bitacora_empresa   TO 'db_cliente_empresa'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_aprobar_transferencia  TO 'db_cliente_empresa'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_rechazar_transferencia TO 'db_cliente_empresa'@'%';

-- db_emp_ventanilla: consulta cuentas y abre cuentas
GRANT SELECT ON banco_ddd.v_cuentas_ventanilla TO 'db_emp_ventanilla'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_bloquear_cuenta TO 'db_emp_ventanilla'@'%';

-- db_emp_comercial: gestiona clientes y productos
GRANT SELECT, INSERT, UPDATE ON banco_ddd.producto_bancario          TO 'db_emp_comercial'@'%';
GRANT SELECT, INSERT, UPDATE ON banco_ddd.cliente_persona_natural    TO 'db_emp_comercial'@'%';
GRANT SELECT, INSERT, UPDATE ON banco_ddd.cliente_empresa            TO 'db_emp_comercial'@'%';
GRANT SELECT ON banco_ddd.usuario TO 'db_emp_comercial'@'%';

-- db_emp_empresa: crea transferencias
GRANT SELECT ON banco_ddd.v_transferencias_empresa_op TO 'db_emp_empresa'@'%';
GRANT EXECUTE ON PROCEDURE banco_ddd.sp_ejecutar_transferencia TO 'db_emp_empresa'@'%';

FLUSH PRIVILEGES;

-- ------------------------------------------------------------
-- VERIFICACIÓN FINAL
-- ------------------------------------------------------------

SELECT 'cat_rol'                    AS tabla, COUNT(*) AS registros FROM cat_rol
UNION ALL SELECT 'cat_estado_usuario',         COUNT(*) FROM cat_estado_usuario
UNION ALL SELECT 'cat_tipo_cuenta',            COUNT(*) FROM cat_tipo_cuenta
UNION ALL SELECT 'cat_moneda',                 COUNT(*) FROM cat_moneda
UNION ALL SELECT 'cat_estado_cuenta',          COUNT(*) FROM cat_estado_cuenta
UNION ALL SELECT 'cat_tipo_prestamo',          COUNT(*) FROM cat_tipo_prestamo
UNION ALL SELECT 'cat_estado_prestamo',        COUNT(*) FROM cat_estado_prestamo
UNION ALL SELECT 'prestamo_transicion_estado', COUNT(*) FROM prestamo_transicion_estado
UNION ALL SELECT 'cat_estado_transferencia',   COUNT(*) FROM cat_estado_transferencia
UNION ALL SELECT 'transferencia_transicion',   COUNT(*) FROM transferencia_transicion_estado
UNION ALL SELECT 'config_umbral',              COUNT(*) FROM config_umbral_transferencia
UNION ALL SELECT 'cat_categoria_producto',     COUNT(*) FROM cat_categoria_producto
UNION ALL SELECT 'producto_bancario',          COUNT(*) FROM producto_bancario
UNION ALL SELECT 'usuario',                    COUNT(*) FROM usuario
UNION ALL SELECT 'cliente_persona_natural',    COUNT(*) FROM cliente_persona_natural
UNION ALL SELECT 'cliente_empresa',            COUNT(*) FROM cliente_empresa
UNION ALL SELECT 'cuenta_bancaria',            COUNT(*) FROM cuenta_bancaria;
