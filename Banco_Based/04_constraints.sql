-- ============================================================
-- 04_constraints.sql
-- Vistas de seguridad por rol (Row-Level Security)
-- Ejecutar después de 03_tables.sql
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- VISTAS DE SEGURIDAD POR ROL (RP-15 al RP-21)
-- Vistas genéricas del dominio sin filtrado de sesión
-- El filtrado por usuario/rol se delega a: SPs, backend, queries parametrizadas
-- (MySQL 8 no permite variables de sesión en vistas)
-- ------------------------------------------------------------

-- RP-15: Cliente Persona Natural — cuentas de personas naturales (filtrado por SP/backend)
CREATE OR REPLACE VIEW v_cuentas_cliente_pn AS
    SELECT cb.numero_cuenta, cb.id_tipo_cuenta, cb.saldo_actual,
           cb.id_moneda, cb.id_estado_cuenta, cb.fecha_apertura,
           cpn.id_usuario, cpn.id_identificacion
    FROM cuenta_bancaria cb
    JOIN cliente_persona_natural cpn
         ON cb.id_titular = cpn.id_identificacion
        AND cb.tipo_titular = 'PERSONA_NATURAL';

-- RP-15: Cliente Persona Natural — préstamos de personas naturales (filtrado por SP/backend)
CREATE OR REPLACE VIEW v_prestamos_cliente_pn AS
    SELECT p.id_prestamo, p.id_tipo_prestamo, p.monto_solicitado,
           p.monto_aprobado, p.tasa_interes, p.plazo_meses,
           p.id_estado_prestamo, p.fecha_solicitud,
           p.fecha_aprobacion, p.fecha_desembolso,
           cpn.id_usuario, cpn.id_identificacion
    FROM prestamo p
    JOIN cliente_persona_natural cpn
         ON p.id_cliente_solicitante = cpn.id_identificacion
        AND p.tipo_cliente = 'PERSONA_NATURAL';

-- RP-15: Cliente Persona Natural — transferencias (filtrado por SP/backend)
CREATE OR REPLACE VIEW v_transferencias_cliente_pn AS
    SELECT t.id_transferencia, t.cuenta_origen, t.cuenta_destino,
           t.monto, t.id_estado_transferencia,
           t.fecha_creacion, t.fecha_aprobacion,
           t.id_usuario_creador
    FROM transferencia t;

-- RP-16: Cliente Empresa — cuentas de empresas (filtrado por SP/backend)
CREATE OR REPLACE VIEW v_cuentas_empresa AS
    SELECT cb.numero_cuenta, cb.id_tipo_cuenta, cb.saldo_actual,
           cb.id_moneda, cb.id_estado_cuenta, cb.fecha_apertura,
           ce.id_usuario, ce.nit
    FROM cuenta_bancaria cb
    JOIN cliente_empresa ce
         ON cb.id_titular = ce.nit
        AND cb.tipo_titular = 'EMPRESA';

-- RP-16: Cliente Empresa — préstamos de empresas (filtrado por SP/backend)
CREATE OR REPLACE VIEW v_prestamos_empresa AS
    SELECT p.id_prestamo, p.id_tipo_prestamo, p.monto_solicitado,
           p.monto_aprobado, p.tasa_interes, p.plazo_meses,
           p.id_estado_prestamo, p.fecha_solicitud,
           p.fecha_aprobacion, p.fecha_desembolso,
           ce.id_usuario, ce.nit
    FROM prestamo p
    JOIN cliente_empresa ce
         ON p.id_cliente_solicitante = ce.nit
        AND p.tipo_cliente = 'EMPRESA';

-- RP-17: Empleado Ventanilla  todas las cuentas, sin datos de riesgo
CREATE OR REPLACE VIEW v_cuentas_ventanilla AS
    SELECT numero_cuenta, id_tipo_cuenta, id_titular, tipo_titular,
           saldo_actual, id_moneda, id_estado_cuenta, fecha_apertura
    FROM cuenta_bancaria;

-- RP-19: Empleado Empresa — transferencias de empresas (filtrado por SP/backend)
CREATE OR REPLACE VIEW v_transferencias_empresa_op AS
    SELECT t.id_transferencia, t.cuenta_origen, t.cuenta_destino,
           t.monto, t.id_estado_transferencia,
           t.fecha_creacion, t.fecha_vencimiento, t.requiere_aprobacion,
           ce.id_usuario, ce.nit
    FROM transferencia t
    JOIN cuenta_bancaria cb ON t.cuenta_origen = cb.numero_cuenta
    JOIN cliente_empresa ce ON cb.id_titular = ce.nit AND cb.tipo_titular = 'EMPRESA';

-- RP-20: Supervisor Empresa — transferencias pendientes de aprobación (filtrado por SP/backend)
CREATE OR REPLACE VIEW v_transferencias_supervisor AS
    SELECT t.id_transferencia, t.cuenta_origen, t.cuenta_destino,
           t.monto, t.id_estado_transferencia,
           t.fecha_creacion, t.fecha_vencimiento,
           t.requiere_aprobacion, ce.id_usuario, ce.nit
    FROM transferencia t
    JOIN cuenta_bancaria cb ON t.cuenta_origen = cb.numero_cuenta
    JOIN cliente_empresa ce ON cb.id_titular = ce.nit AND cb.tipo_titular = 'EMPRESA'
    WHERE t.requiere_aprobacion = TRUE
      AND t.id_estado_transferencia = (
          SELECT id_estado_transferencia FROM cat_estado_transferencia
          WHERE nombre_estado = 'En Espera de Aprobacion'
      );

-- RP-21: Analista Interno — todos los préstamos
CREATE OR REPLACE VIEW v_prestamos_analista AS
    SELECT * FROM prestamo;

-- RP-21: Analista Interno — bitácora completa (solo lectura)
-- NOTA: ORDER BY se omite en la vista (MySQL 8 lo ignora sin LIMIT).
-- Usar ORDER BY en la consulta que consuma esta vista.
CREATE OR REPLACE VIEW v_bitacora_analista AS
    SELECT id_bitacora, tipo_operacion, fecha_hora_operacion,
           id_usuario, rol_usuario, id_producto_afectado,
           tipo_producto, datos_detalle
    FROM bitacora_cola;

-- ============================================================
-- VISTAS DE BITACORA PARA CLIENTES (PDF pag. 12)
-- "Pueden ver el historial de sus propias operaciones registradas
--  en la Bitacora, filtrado por su ID_Producto_Afectado."
-- ============================================================

-- v_bitacora_cliente_pn
-- Bitácora completa con información de usuario y producto (filtrado por SP/backend)
-- Productos del cliente PN: sus cuentas (numero_cuenta) y sus prestamos (id_prestamo).
CREATE OR REPLACE VIEW v_bitacora_cliente_pn AS
    SELECT
        bc.id_bitacora,
        bc.tipo_operacion,
        bc.fecha_hora_operacion,
        bc.id_usuario,
        bc.rol_usuario,
        bc.id_producto_afectado,
        bc.tipo_producto,
        bc.datos_detalle
    FROM bitacora_cola bc;

-- v_bitacora_empresa
-- Bitácora completa con información de usuario y producto (filtrado por SP/backend)
-- Productos de la empresa: sus cuentas (numero_cuenta) y sus prestamos (id_prestamo).
CREATE OR REPLACE VIEW v_bitacora_empresa AS
    SELECT
        bc.id_bitacora,
        bc.tipo_operacion,
        bc.fecha_hora_operacion,
        bc.id_usuario,
        bc.rol_usuario,
        bc.id_producto_afectado,
        bc.tipo_producto,
        bc.datos_detalle
    FROM bitacora_cola bc;
