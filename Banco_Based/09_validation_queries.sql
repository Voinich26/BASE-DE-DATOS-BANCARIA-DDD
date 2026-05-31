-- ============================================================
-- 09_validation_queries.sql
-- Consultas de verificación operativa después de ejecutar los scripts.
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 1) Versión y modo de MySQL
SELECT VERSION() AS mysql_version;
SELECT @@sql_mode AS sql_mode;
SELECT @@event_scheduler AS event_scheduler;

-- 2) Tablas clave creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'banco_ddd'
  AND table_name IN (
      'usuario', 'cliente_persona_natural', 'cliente_empresa',
      'cuenta_bancaria', 'prestamo', 'transferencia',
      'prestamo_transicion_estado', 'transferencia_transicion_estado',
      'config_umbral_transferencia', 'producto_bancario',
      'cat_rol', 'cat_estado_usuario', 'cat_tipo_cuenta',
      'cat_moneda', 'cat_estado_cuenta', 'cat_tipo_prestamo',
      'cat_estado_prestamo', 'cat_categoria_producto', 'cat_estado_lote',
      'lote_transferencia', 'detalle_lote_transferencia', 'bitacora_cola'
  )
ORDER BY table_name;

-- 3) Triggers existentes
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'banco_ddd'
  AND trigger_name IN (
      'trg_before_insert_usuario', 'trg_before_update_usuario',
      'trg_before_insert_cliente_pn', 'trg_before_insert_cuenta',
      'trg_before_update_cuenta', 'trg_after_update_cuenta',
      'trg_before_insert_prestamo', 'trg_before_update_prestamo',
      'trg_after_update_prestamo', 'trg_before_insert_transferencia',
      'trg_after_insert_transferencia', 'trg_before_update_transferencia',
      'trg_after_update_transferencia', 'trg_before_insert_umbral',
      'trg_after_insert_usuario', 'trg_after_insert_cliente_pn',
      'trg_after_insert_cliente_empresa', 'trg_after_insert_cuenta',
      'trg_after_insert_prestamo'
  )
ORDER BY trigger_name;

-- 4) Procedimientos almacenados creados
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'banco_ddd'
  AND routine_type = 'PROCEDURE'
  AND routine_name IN (
      'sp_registrar_bitacora', 'sp_ejecutar_transferencia',
      'sp_ejecutar_transferencia_interna', 'sp_aprobar_prestamo',
      'sp_rechazar_prestamo', 'sp_desembolsar_prestamo',
      'sp_aprobar_transferencia', 'sp_rechazar_transferencia',
      'sp_bloquear_cuenta', 'sp_crear_usuario', 'sp_cambiar_estado_usuario',
      'sp_asignar_rol', 'sp_crear_cliente_persona',
      'sp_crear_cuenta', 'sp_depositar', 'sp_retirar',
      'sp_cancelar_cuenta', 'sp_solicitar_prestamo',
      'sp_crear_lote_transferencia', 'sp_procesar_lote_transferencia'
  )
ORDER BY routine_name;

-- 5) Eventos activos
SELECT EVENT_NAME, STATUS, LAST_ALTERED, LAST_EXECUTED
FROM information_schema.events
WHERE EVENT_SCHEMA = 'banco_ddd'
  AND EVENT_NAME = 'evt_vencimiento_transferencias';

-- 6) Vistas existentes
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'banco_ddd'
  AND table_name IN (
      'v_cuentas_cliente_pn', 'v_prestamos_cliente_pn',
      'v_transferencias_cliente_pn', 'v_cuentas_empresa',
      'v_prestamos_empresa', 'v_cuentas_ventanilla',
      'v_transferencias_empresa_op', 'v_transferencias_supervisor',
      'v_prestamos_analista', 'v_bitacora_analista',
      'v_bitacora_cliente_pn', 'v_bitacora_empresa'
  )
ORDER BY table_name;

-- 7) Datos seed cargados
SELECT 'cat_rol' AS objeto, COUNT(*) AS cantidad FROM cat_rol
UNION ALL
SELECT 'cat_estado_usuario', COUNT(*) FROM cat_estado_usuario
UNION ALL
SELECT 'cat_tipo_cuenta', COUNT(*) FROM cat_tipo_cuenta
UNION ALL
SELECT 'cat_moneda', COUNT(*) FROM cat_moneda
UNION ALL
SELECT 'cat_estado_cuenta', COUNT(*) FROM cat_estado_cuenta
UNION ALL
SELECT 'cat_tipo_prestamo', COUNT(*) FROM cat_tipo_prestamo
UNION ALL
SELECT 'cat_estado_prestamo', COUNT(*) FROM cat_estado_prestamo
UNION ALL
SELECT 'cat_categoria_producto', COUNT(*) FROM cat_categoria_producto
UNION ALL
SELECT 'producto_bancario', COUNT(*) FROM producto_bancario
UNION ALL
SELECT 'config_umbral_transferencia', COUNT(*) FROM config_umbral_transferencia;

-- 8) Bitácora funcionando
SELECT COUNT(*) AS total_bitacora FROM bitacora_cola;
SELECT COUNT(*) AS bitacora_transferencia
FROM bitacora_cola
WHERE tipo_producto = 'TRANSFERENCIA';
SELECT COUNT(*) AS bitacora_prestamo
FROM bitacora_cola
WHERE tipo_producto = 'PRESTAMO';

-- 9) Transferencias ejecutadas
SELECT COUNT(*) AS transferencias_ejecutadas
FROM transferencia t
JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
WHERE cet.nombre_estado = 'Ejecutada';
SELECT COUNT(*) AS transferencias_aprobadas
FROM transferencia t
JOIN cat_estado_transferencia cet ON t.id_estado_transferencia = cet.id_estado_transferencia
WHERE cet.nombre_estado = 'Aprobada';

-- 10) Préstamos aprobados / desembolsados
SELECT COUNT(*) AS prestamos_aprobados
FROM prestamo p
JOIN cat_estado_prestamo cep ON p.id_estado_prestamo = cep.id_estado_prestamo
WHERE cep.nombre_estado IN ('Aprobado', 'Desembolsado');
SELECT COUNT(*) AS prestamos_desembolsados
FROM prestamo p
JOIN cat_estado_prestamo cep ON p.id_estado_prestamo = cep.id_estado_prestamo
WHERE cep.nombre_estado = 'Desembolsado';

-- 11) Pagos masivos creados
SELECT COUNT(*) AS lotes_totales FROM lote_transferencia;
SELECT COUNT(*) AS lineas_totales FROM detalle_lote_transferencia;
SELECT COUNT(*) AS lotes_completados
FROM lote_transferencia lt
JOIN cat_estado_lote cel ON lt.id_estado_lote = cel.id_estado_lote
WHERE cel.nombre_estado = 'Completado';
SELECT COUNT(*) AS lotes_con_errores
FROM lote_transferencia lt
JOIN cat_estado_lote cel ON lt.id_estado_lote = cel.id_estado_lote
WHERE cel.nombre_estado = 'Con Errores';
