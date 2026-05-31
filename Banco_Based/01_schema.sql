-- ============================================================
-- 01_schema.sql
-- Sistema de Gestión Bancaria  DDD Core Transaccional
-- Crea la base de datos, configura charset y habilita eventos
-- Ejecutar primero, como usuario root o con privilegios CREATE
-- ============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;

DROP DATABASE IF EXISTS banco_ddd;
CREATE DATABASE banco_ddd
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Estandarizar collation de la base de datos (por si ya existia con otra collation)
ALTER DATABASE banco_ddd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE banco_ddd;

-- Habilitar Event Scheduler para vencimiento automático de transferencias (RP-12)
-- ADVERTENCIA: En entornos cloud (AWS RDS, Google Cloud SQL, Azure MySQL),
-- SET GLOBAL requiere privilegio SUPER. Usar el panel de configuracion del proveedor
-- para habilitar event_scheduler=ON, o comentar esta linea si ya esta habilitado.
SET GLOBAL event_scheduler = ON;

-- Habilitar CHECK constraints (MySQL 8.0+)
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ============================================================
-- USUARIOS DE BASE DE DATOS POR ROL (BC-01 / BC-07 Security)
-- ============================================================

DROP USER IF EXISTS 'db_cliente_pn'@'%';
DROP USER IF EXISTS 'db_cliente_empresa'@'%';
DROP USER IF EXISTS 'db_emp_ventanilla'@'%';
DROP USER IF EXISTS 'db_emp_comercial'@'%';
DROP USER IF EXISTS 'db_emp_empresa'@'%';
DROP USER IF EXISTS 'db_supervisor'@'%';
DROP USER IF EXISTS 'db_analista'@'%';
DROP USER IF EXISTS 'db_sistema'@'%';

CREATE USER 'db_cliente_pn'@'%'      IDENTIFIED BY 'ClientePN_2026!';
CREATE USER 'db_cliente_empresa'@'%' IDENTIFIED BY 'ClienteEmp_2026!';
CREATE USER 'db_emp_ventanilla'@'%'  IDENTIFIED BY 'Ventanilla_2026!';
CREATE USER 'db_emp_comercial'@'%'   IDENTIFIED BY 'Comercial_2026!';
CREATE USER 'db_emp_empresa'@'%'     IDENTIFIED BY 'EmpEmpresa_2026!';
CREATE USER 'db_supervisor'@'%'      IDENTIFIED BY 'Supervisor_2026!';
CREATE USER 'db_analista'@'%'        IDENTIFIED BY 'Analista_2026!';
CREATE USER 'db_sistema'@'%'         IDENTIFIED BY 'Sistema_2026!';

-- Permisos se asignan en 07_seed_data.sql después de crear vistas y SPs
