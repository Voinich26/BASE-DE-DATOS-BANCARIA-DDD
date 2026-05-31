-- ============================================================
-- 02_catalogs.sql
-- Tablas catálogo (Value Objects enumerados)
-- Ejecutar después de 01_schema.sql
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- BC-01: Identidad y Acceso
-- ------------------------------------------------------------

CREATE TABLE cat_rol (
    id_rol       TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_rol   VARCHAR(60)      NOT NULL,
    descripcion  VARCHAR(300)     NULL,
    CONSTRAINT pk_cat_rol        PRIMARY KEY (id_rol),
    CONSTRAINT uq_cat_rol_nombre UNIQUE      (nombre_rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-01: Catálogo de roles del sistema';

CREATE TABLE cat_estado_usuario (
    id_estado_usuario TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_estado     VARCHAR(30)      NOT NULL,
    CONSTRAINT pk_cat_estado_usuario        PRIMARY KEY (id_estado_usuario),
    CONSTRAINT uq_cat_estado_usuario_nombre UNIQUE      (nombre_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-01: Estados posibles de un usuario';

-- ------------------------------------------------------------
-- BC-03: Cuentas Bancarias
-- ------------------------------------------------------------

CREATE TABLE cat_tipo_cuenta (
    id_tipo_cuenta TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_tipo    VARCHAR(50)      NOT NULL,
    CONSTRAINT pk_cat_tipo_cuenta        PRIMARY KEY (id_tipo_cuenta),
    CONSTRAINT uq_cat_tipo_cuenta_nombre UNIQUE      (nombre_tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-03: Tipos de cuenta bancaria';

CREATE TABLE cat_moneda (
    id_moneda     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo_iso    CHAR(3)          NOT NULL,
    nombre_moneda VARCHAR(50)      NOT NULL,
    CONSTRAINT pk_cat_moneda        PRIMARY KEY (id_moneda),
    CONSTRAINT uq_cat_moneda_iso    UNIQUE      (codigo_iso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-03: Monedas aceptadas';

CREATE TABLE cat_estado_cuenta (
    id_estado_cuenta TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_estado    VARCHAR(30)      NOT NULL,
    CONSTRAINT pk_cat_estado_cuenta        PRIMARY KEY (id_estado_cuenta),
    CONSTRAINT uq_cat_estado_cuenta_nombre UNIQUE      (nombre_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-03: Estados de cuenta bancaria';

-- ------------------------------------------------------------
-- BC-04: Préstamos y Créditos
-- ------------------------------------------------------------

CREATE TABLE cat_tipo_prestamo (
    id_tipo_prestamo TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_tipo      VARCHAR(60)      NOT NULL,
    CONSTRAINT pk_cat_tipo_prestamo        PRIMARY KEY (id_tipo_prestamo),
    CONSTRAINT uq_cat_tipo_prestamo_nombre UNIQUE      (nombre_tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-04: Tipos de préstamo';

CREATE TABLE cat_estado_prestamo (
    id_estado_prestamo TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_estado      VARCHAR(40)      NOT NULL,
    es_estado_final    BOOLEAN          NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_cat_estado_prestamo        PRIMARY KEY (id_estado_prestamo),
    CONSTRAINT uq_cat_estado_prestamo_nombre UNIQUE      (nombre_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-04: Estados del ciclo de vida de un préstamo';

-- ------------------------------------------------------------
-- BC-05: Transferencias
-- ------------------------------------------------------------

CREATE TABLE cat_estado_transferencia (
    id_estado_transferencia TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_estado           VARCHAR(40)      NOT NULL,
    es_estado_final         BOOLEAN          NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_cat_estado_transferencia        PRIMARY KEY (id_estado_transferencia),
    CONSTRAINT uq_cat_estado_transferencia_nombre UNIQUE      (nombre_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-05: Estados del ciclo de vida de una transferencia';

-- ------------------------------------------------------------
-- BC-07: Productos Bancarios
-- ------------------------------------------------------------

CREATE TABLE cat_categoria_producto (
    id_categoria     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_categoria VARCHAR(60)      NOT NULL,
    CONSTRAINT pk_cat_categoria_producto        PRIMARY KEY (id_categoria),
    CONSTRAINT uq_cat_categoria_producto_nombre UNIQUE      (nombre_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-07: Categorías de productos bancarios';
