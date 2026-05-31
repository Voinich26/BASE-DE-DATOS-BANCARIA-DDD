-- ============================================================
-- 03_tables.sql
-- Tablas principales (Aggregate Roots y entidades de dominio)
-- Ejecutar después de 02_catalogs.sql
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- BC-01: Identidad y Acceso — Aggregate Root: Usuario
-- ------------------------------------------------------------

CREATE TABLE usuario (
    id_usuario          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    id_relacionado      VARCHAR(30)      NULL     COMMENT 'ID del cliente asociado (persona/empresa)',
    nombre_completo     VARCHAR(200)     NOT NULL,
    id_identificacion   VARCHAR(30)      NOT NULL COMMENT 'Cédula, DNI, NIT  único en el sistema',
    correo_electronico  VARCHAR(150)     NOT NULL,
    telefono            VARCHAR(15)      NOT NULL,
    fecha_nacimiento    DATE             NULL,
    direccion           VARCHAR(300)     NULL,
    id_rol              TINYINT UNSIGNED NOT NULL,
    id_estado_usuario   TINYINT UNSIGNED NOT NULL,
    fecha_creacion      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  DATETIME         NULL     ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_usuario                PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuario_identificacion UNIQUE      (id_identificacion),
    CONSTRAINT uq_usuario_correo         UNIQUE      (correo_electronico),
    CONSTRAINT fk_usuario_rol            FOREIGN KEY (id_rol)            REFERENCES cat_rol(id_rol)            ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_usuario_estado         FOREIGN KEY (id_estado_usuario) REFERENCES cat_estado_usuario(id_estado_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_usuario_correo        CHECK (correo_electronico LIKE '%@%.%'),
    CONSTRAINT chk_usuario_telefono      CHECK (CHAR_LENGTH(telefono) BETWEEN 7 AND 15)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-01: Aggregate Root — Usuario del sistema';

CREATE INDEX idx_usuario_rol    ON usuario(id_rol);
CREATE INDEX idx_usuario_estado ON usuario(id_estado_usuario);

-- ------------------------------------------------------------
-- BC-02: Gestión de Clientes — Aggregate Root: ClientePersonaNatural
-- ------------------------------------------------------------

CREATE TABLE cliente_persona_natural (
    id_identificacion   VARCHAR(30)  NOT NULL COMMENT 'PK natural — cédula/DNI/pasaporte',
    tipo_identificacion VARCHAR(20)  NOT NULL COMMENT 'Cedula, DNI, Pasaporte, etc.',
    nombre_completo     VARCHAR(200) NOT NULL,
    correo_electronico  VARCHAR(150) NOT NULL,
    telefono            VARCHAR(15)  NOT NULL,
    fecha_nacimiento    DATE         NOT NULL,
    direccion           VARCHAR(300) NOT NULL,
    id_usuario          INT UNSIGNED NOT NULL COMMENT 'FK a BC-01',
    fecha_registro      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  DATETIME     NULL,
    CONSTRAINT pk_cliente_pn                PRIMARY KEY (id_identificacion),
    CONSTRAINT uq_cliente_pn_correo         UNIQUE      (correo_electronico),
    CONSTRAINT uq_cliente_pn_usuario        UNIQUE      (id_usuario),
    CONSTRAINT fk_cliente_pn_usuario        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_cliente_pn_correo        CHECK (correo_electronico LIKE '%@%.%'),
    CONSTRAINT chk_cliente_pn_telefono      CHECK (CHAR_LENGTH(telefono) BETWEEN 7 AND 15)
    -- NOTA: validacion de mayoria de edad se implementa en TRG-02 (trg_before_insert_cliente_pn)
    -- porque MySQL 8 no permite CURDATE() en CHECK constraints (ERROR 3814)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-02: Aggregate Root  Cliente Persona Natural';

-- ------------------------------------------------------------
-- BC-02: Aggregate Root: ClienteEmpresa
-- ------------------------------------------------------------

CREATE TABLE cliente_empresa (
    nit                    VARCHAR(30)  NOT NULL COMMENT 'PK natural — NIT único',
    razon_social           VARCHAR(200) NOT NULL,
    correo_electronico     VARCHAR(150) NOT NULL,
    telefono               VARCHAR(15)  NOT NULL,
    direccion              VARCHAR(300) NOT NULL,
    id_representante_legal VARCHAR(30)  NOT NULL COMMENT 'FK a cliente_persona_natural — INV-07',
    id_usuario             INT UNSIGNED NOT NULL COMMENT 'FK a BC-01',
    fecha_registro         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion     DATETIME     NULL,
    CONSTRAINT pk_cliente_empresa                PRIMARY KEY (nit),
    CONSTRAINT uq_cliente_empresa_correo         UNIQUE      (correo_electronico),
    CONSTRAINT uq_cliente_empresa_usuario        UNIQUE      (id_usuario),
    CONSTRAINT fk_cliente_empresa_rep_legal      FOREIGN KEY (id_representante_legal) REFERENCES cliente_persona_natural(id_identificacion) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cliente_empresa_usuario        FOREIGN KEY (id_usuario)             REFERENCES usuario(id_usuario)                        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_cliente_empresa_correo        CHECK (correo_electronico LIKE '%@%.%'),
    CONSTRAINT chk_cliente_empresa_telefono      CHECK (CHAR_LENGTH(telefono) BETWEEN 7 AND 15)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-02: Aggregate Root  Cliente Empresa';

CREATE INDEX idx_cliente_empresa_rep ON cliente_empresa(id_representante_legal);

-- ------------------------------------------------------------
-- BC-03: Cuentas Bancarias — Aggregate Root: CuentaBancaria
-- ------------------------------------------------------------

CREATE TABLE cuenta_bancaria (
    numero_cuenta       VARCHAR(30)                       NOT NULL COMMENT 'PK natural — INV-12',
    id_tipo_cuenta      TINYINT UNSIGNED                  NOT NULL,
    id_titular          VARCHAR(30)                       NOT NULL COMMENT 'ID del cliente (persona/empresa)',
    tipo_titular        ENUM('PERSONA_NATURAL','EMPRESA') NOT NULL COMMENT 'Discriminador de tipo de titular',
    saldo_actual        DECIMAL(18,2)                     NOT NULL DEFAULT 0.00,
    id_moneda           TINYINT UNSIGNED                  NOT NULL COMMENT 'Inmutable tras apertura — INV-13',
    id_estado_cuenta    TINYINT UNSIGNED                  NOT NULL,
    fecha_apertura      DATE                              NOT NULL,
    id_usuario_apertura INT UNSIGNED                      NOT NULL COMMENT 'Quién abrió la cuenta',
    fecha_creacion      DATETIME                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  DATETIME                          NULL,
    CONSTRAINT pk_cuenta_bancaria           PRIMARY KEY (numero_cuenta),
    CONSTRAINT fk_cuenta_tipo               FOREIGN KEY (id_tipo_cuenta)      REFERENCES cat_tipo_cuenta(id_tipo_cuenta)       ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cuenta_moneda             FOREIGN KEY (id_moneda)           REFERENCES cat_moneda(id_moneda)                 ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cuenta_estado             FOREIGN KEY (id_estado_cuenta)    REFERENCES cat_estado_cuenta(id_estado_cuenta)   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cuenta_usuario_apertura   FOREIGN KEY (id_usuario_apertura) REFERENCES usuario(id_usuario)                   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_cuenta_saldo             CHECK (saldo_actual >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-03: Aggregate Root — Cuenta Bancaria';

CREATE INDEX idx_cuenta_titular ON cuenta_bancaria(id_titular, tipo_titular);
CREATE INDEX idx_cuenta_estado  ON cuenta_bancaria(id_estado_cuenta);

-- ------------------------------------------------------------
-- BC-04: Préstamos  Aggregate Root: Prestamo
-- ------------------------------------------------------------

CREATE TABLE prestamo (
    id_prestamo               INT UNSIGNED                      NOT NULL AUTO_INCREMENT,
    id_tipo_prestamo          TINYINT UNSIGNED                  NOT NULL,
    id_cliente_solicitante    VARCHAR(30)                       NOT NULL COMMENT 'ID persona natural o empresa',
    tipo_cliente              ENUM('PERSONA_NATURAL','EMPRESA') NOT NULL,
    monto_solicitado          DECIMAL(18,2)                     NOT NULL,
    monto_aprobado            DECIMAL(18,2)                     NULL,
    tasa_interes              DECIMAL(6,4)                      NULL,
    plazo_meses               SMALLINT UNSIGNED                 NULL,
    id_estado_prestamo        TINYINT UNSIGNED                  NOT NULL,
    id_usuario_solicitante    INT UNSIGNED                      NOT NULL,
    id_analista_aprobador     INT UNSIGNED                      NULL,
    fecha_solicitud           DATETIME                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion          DATETIME                          NULL,
    fecha_desembolso          DATETIME                          NULL,
    cuenta_destino_desembolso VARCHAR(30)                       NULL,
    fecha_modificacion        DATETIME                          NULL,
    CONSTRAINT pk_prestamo                  PRIMARY KEY (id_prestamo),
    CONSTRAINT fk_prestamo_tipo             FOREIGN KEY (id_tipo_prestamo)       REFERENCES cat_tipo_prestamo(id_tipo_prestamo)   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_prestamo_estado           FOREIGN KEY (id_estado_prestamo)     REFERENCES cat_estado_prestamo(id_estado_prestamo) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_prestamo_solicitante      FOREIGN KEY (id_usuario_solicitante) REFERENCES usuario(id_usuario)                   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_prestamo_analista         FOREIGN KEY (id_analista_aprobador)  REFERENCES usuario(id_usuario)                   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_prestamo_cuenta_destino   FOREIGN KEY (cuenta_destino_desembolso) REFERENCES cuenta_bancaria(numero_cuenta)     ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_prestamo_monto_sol       CHECK (monto_solicitado > 0),
    CONSTRAINT chk_prestamo_monto_apr       CHECK (monto_aprobado   IS NULL OR monto_aprobado > 0),
    CONSTRAINT chk_prestamo_tasa            CHECK (tasa_interes     IS NULL OR tasa_interes   > 0),
    CONSTRAINT chk_prestamo_plazo           CHECK (plazo_meses      IS NULL OR plazo_meses    > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-04: Aggregate Root  Préstamo';

CREATE INDEX idx_prestamo_cliente ON prestamo(id_cliente_solicitante, tipo_cliente);
CREATE INDEX idx_prestamo_estado  ON prestamo(id_estado_prestamo);
CREATE INDEX idx_prestamo_analista ON prestamo(id_analista_aprobador);

-- ------------------------------------------------------------
-- BC-04: Máquina de estados de préstamo (INV-15)
-- ------------------------------------------------------------

CREATE TABLE prestamo_transicion_estado (
    id_estado_origen  TINYINT UNSIGNED NOT NULL,
    id_estado_destino TINYINT UNSIGNED NOT NULL,
    id_rol_requerido  TINYINT UNSIGNED NOT NULL COMMENT 'Rol que puede ejecutar esta transición',
    CONSTRAINT pk_prestamo_transicion PRIMARY KEY (id_estado_origen, id_estado_destino),
    CONSTRAINT fk_pte_origen          FOREIGN KEY (id_estado_origen)  REFERENCES cat_estado_prestamo(id_estado_prestamo) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pte_destino         FOREIGN KEY (id_estado_destino) REFERENCES cat_estado_prestamo(id_estado_prestamo) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pte_rol             FOREIGN KEY (id_rol_requerido)  REFERENCES cat_rol(id_rol)                         ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-04: Transiciones válidas de estado de préstamo';

-- ------------------------------------------------------------
-- BC-05: Transferencias — Aggregate Root: Transferencia
-- ------------------------------------------------------------

CREATE TABLE transferencia (
    id_transferencia        INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    cuenta_origen           VARCHAR(30)      NOT NULL,
    cuenta_destino          VARCHAR(30)      NOT NULL,
    monto                   DECIMAL(18,2)    NOT NULL,
    id_estado_transferencia TINYINT UNSIGNED NOT NULL,
    id_usuario_creador      INT UNSIGNED     NOT NULL,
    id_usuario_aprobador    INT UNSIGNED     NULL,
    fecha_creacion          DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion        DATETIME         NULL,
    fecha_vencimiento       DATETIME         NOT NULL DEFAULT '1970-01-01 00:00:01' COMMENT 'Sobreescrito por TRG-09 con fecha_creacion + 60 min. El DEFAULT es solo fallback de seguridad.',
    requiere_aprobacion     BOOLEAN          NOT NULL DEFAULT FALSE,
    saldo_origen_antes      DECIMAL(18,2)    NULL COMMENT 'Snapshot para bitácora',
    saldo_destino_antes     DECIMAL(18,2)    NULL COMMENT 'Snapshot para bitácora',
    saldo_origen_despues    DECIMAL(18,2)    NULL COMMENT 'Snapshot para bitácora',
    saldo_destino_despues   DECIMAL(18,2)    NULL COMMENT 'Snapshot para bitácora',
    CONSTRAINT pk_transferencia             PRIMARY KEY (id_transferencia),
    CONSTRAINT fk_transf_origen             FOREIGN KEY (cuenta_origen)           REFERENCES cuenta_bancaria(numero_cuenta)              ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_transf_destino            FOREIGN KEY (cuenta_destino)          REFERENCES cuenta_bancaria(numero_cuenta)              ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_transf_estado             FOREIGN KEY (id_estado_transferencia) REFERENCES cat_estado_transferencia(id_estado_transferencia) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_transf_creador            FOREIGN KEY (id_usuario_creador)      REFERENCES usuario(id_usuario)                        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_transf_aprobador          FOREIGN KEY (id_usuario_aprobador)    REFERENCES usuario(id_usuario)                        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_transf_monto             CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-05: Aggregate Root  Transferencia';

CREATE INDEX idx_transf_origen   ON transferencia(cuenta_origen);
CREATE INDEX idx_transf_destino  ON transferencia(cuenta_destino);
CREATE INDEX idx_transf_estado   ON transferencia(id_estado_transferencia);
CREATE INDEX idx_transf_venc     ON transferencia(fecha_vencimiento);

-- BC-05: Máquina de estados de transferencia

CREATE TABLE transferencia_transicion_estado (
    id_estado_origen  TINYINT UNSIGNED NOT NULL,
    id_estado_destino TINYINT UNSIGNED NOT NULL,
    id_rol_requerido  TINYINT UNSIGNED NOT NULL,
    CONSTRAINT pk_transf_transicion PRIMARY KEY (id_estado_origen, id_estado_destino),
    CONSTRAINT fk_tte_origen        FOREIGN KEY (id_estado_origen)  REFERENCES cat_estado_transferencia(id_estado_transferencia) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tte_destino       FOREIGN KEY (id_estado_destino) REFERENCES cat_estado_transferencia(id_estado_transferencia) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tte_rol           FOREIGN KEY (id_rol_requerido)  REFERENCES cat_rol(id_rol) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-05: Transiciones válidas de estado de transferencia';

-- BC-05: Configuración de umbral de aprobación

CREATE TABLE config_umbral_transferencia (
    id_config          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    monto_umbral       DECIMAL(18,2)    NOT NULL,
    id_moneda          TINYINT UNSIGNED NOT NULL,
    vigente            BOOLEAN          NOT NULL DEFAULT TRUE,
    fecha_modificacion DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_config_umbral   PRIMARY KEY (id_config),
    CONSTRAINT fk_umbral_moneda   FOREIGN KEY (id_moneda) REFERENCES cat_moneda(id_moneda) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_umbral_monto   CHECK (monto_umbral > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-05: Umbral configurable para aprobación de transferencias';

-- ------------------------------------------------------------
-- BC-06: Bitácora (cola relacional  sincroniza con MongoDB)
-- ------------------------------------------------------------

CREATE TABLE bitacora_cola (
    id_bitacora           VARCHAR(36)  NOT NULL COMMENT 'UUID v4 generado por SP-03',
    tipo_operacion        VARCHAR(50)  NOT NULL,
    fecha_hora_operacion  DATETIME(3)  NOT NULL COMMENT 'Precisión de milisegundos',
    id_usuario            INT UNSIGNED NOT NULL,
    rol_usuario           VARCHAR(60)  NOT NULL,
    id_producto_afectado  VARCHAR(30)  NOT NULL,
    tipo_producto         VARCHAR(20)  NOT NULL,
    datos_detalle         JSON         NOT NULL,
    sincronizado          BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'TRUE cuando fue enviado a MongoDB',
    CONSTRAINT pk_bitacora_cola PRIMARY KEY (id_bitacora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-06: Cola de auditoría  sincroniza con MongoDB';

CREATE INDEX idx_bitacora_usuario   ON bitacora_cola(id_usuario);
CREATE INDEX idx_bitacora_tipo      ON bitacora_cola(tipo_operacion);
CREATE INDEX idx_bitacora_fecha     ON bitacora_cola(fecha_hora_operacion);
CREATE INDEX idx_bitacora_producto  ON bitacora_cola(id_producto_afectado);

-- ------------------------------------------------------------
-- BC-07: Productos Bancarios — Aggregate Root: ProductoBancario
-- ------------------------------------------------------------

CREATE TABLE producto_bancario (
    codigo_producto      VARCHAR(20)      NOT NULL,
    nombre_producto      VARCHAR(100)     NOT NULL,
    id_categoria         TINYINT UNSIGNED NOT NULL,
    requiere_aprobacion  BOOLEAN          NOT NULL DEFAULT FALSE,
    activo               BOOLEAN          NOT NULL DEFAULT TRUE,
    fecha_creacion       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion   DATETIME         NULL,
    CONSTRAINT pk_producto_bancario        PRIMARY KEY (codigo_producto),
    CONSTRAINT uq_producto_bancario_nombre UNIQUE      (nombre_producto),
    CONSTRAINT fk_producto_categoria       FOREIGN KEY (id_categoria) REFERENCES cat_categoria_producto(id_categoria) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-07: Aggregate Root  Producto Bancario';

CREATE INDEX idx_producto_categoria ON producto_bancario(id_categoria);
