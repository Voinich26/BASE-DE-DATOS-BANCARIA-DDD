-- ============================================================
-- 03b_tables_lote.sql
-- Tablas para Pagos Masivos / Nomina (BC-05 extension)
-- Ejecutar despues de 03_tables.sql
-- PDF: 'Puede crear transferencias y pagos masivos (nomina)'
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Catalogo de estados de lote
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cat_estado_lote (
    id_estado_lote TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_estado  VARCHAR(40)      NOT NULL,
    es_estado_final BOOLEAN         NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_cat_estado_lote        PRIMARY KEY (id_estado_lote),
    CONSTRAINT uq_cat_estado_lote_nombre UNIQUE      (nombre_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-05: Estados de un lote de transferencias';

-- Estados iniciales del lote
INSERT IGNORE INTO cat_estado_lote (nombre_estado, es_estado_final) VALUES
    ('Pendiente',   FALSE),
    ('Procesando',  FALSE),
    ('Completado',  TRUE),
    ('Con Errores', TRUE),
    ('Cancelado',   TRUE);

-- ------------------------------------------------------------
-- lote_transferencia: cabecera del pago masivo / nomina
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lote_transferencia (
    id_lote              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    descripcion          VARCHAR(200)     NOT NULL COMMENT 'Ej: Nomina Enero 2026',
    cuenta_origen        VARCHAR(30)      NOT NULL COMMENT 'Cuenta empresa que debita',
    id_usuario_creador   INT UNSIGNED     NOT NULL COMMENT 'Empleado de Empresa que crea el lote',
    id_estado_lote       TINYINT UNSIGNED NOT NULL,
    total_registros      INT UNSIGNED     NOT NULL DEFAULT 0,
    total_monto          DECIMAL(18,2)    NOT NULL DEFAULT 0.00,
    registros_exitosos   INT UNSIGNED     NOT NULL DEFAULT 0,
    registros_fallidos   INT UNSIGNED     NOT NULL DEFAULT 0,
    fecha_creacion       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_procesamiento  DATETIME         NULL COMMENT 'Cuando se ejecuto el lote',
    CONSTRAINT pk_lote_transferencia     PRIMARY KEY (id_lote),
    CONSTRAINT fk_lote_cuenta_origen     FOREIGN KEY (cuenta_origen)      REFERENCES cuenta_bancaria(numero_cuenta) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lote_usuario_creador   FOREIGN KEY (id_usuario_creador) REFERENCES usuario(id_usuario)           ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lote_estado            FOREIGN KEY (id_estado_lote)     REFERENCES cat_estado_lote(id_estado_lote) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_lote_monto            CHECK (total_monto >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-05: Cabecera de pago masivo o nomina';

CREATE INDEX idx_lote_cuenta_origen   ON lote_transferencia(cuenta_origen);
CREATE INDEX idx_lote_estado          ON lote_transferencia(id_estado_lote);
CREATE INDEX idx_lote_usuario_creador ON lote_transferencia(id_usuario_creador);

-- ------------------------------------------------------------
-- detalle_lote_transferencia: cada linea del pago masivo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_lote_transferencia (
    id_detalle           INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    id_lote              INT UNSIGNED     NOT NULL,
    cuenta_destino       VARCHAR(30)      NOT NULL COMMENT 'Cuenta beneficiaria',
    monto                DECIMAL(18,2)    NOT NULL,
    concepto             VARCHAR(200)     NULL COMMENT 'Ej: Salario empleado X',
    id_transferencia     INT UNSIGNED     NULL COMMENT 'FK a transferencia generada al procesar',
    estado_linea         ENUM('Pendiente','Ejecutada','Fallida') NOT NULL DEFAULT 'Pendiente',
    mensaje_error        VARCHAR(300)     NULL COMMENT 'Motivo del fallo si estado_linea=Fallida',
    CONSTRAINT pk_detalle_lote           PRIMARY KEY (id_detalle),
    CONSTRAINT fk_detalle_lote           FOREIGN KEY (id_lote)          REFERENCES lote_transferencia(id_lote)       ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_detalle_cuenta_destino FOREIGN KEY (cuenta_destino)   REFERENCES cuenta_bancaria(numero_cuenta)    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_detalle_transferencia  FOREIGN KEY (id_transferencia) REFERENCES transferencia(id_transferencia)   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_detalle_monto         CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BC-05: Linea individual de un pago masivo';

CREATE INDEX idx_detalle_lote         ON detalle_lote_transferencia(id_lote);
CREATE INDEX idx_detalle_cuenta_dest  ON detalle_lote_transferencia(cuenta_destino);
CREATE INDEX idx_detalle_estado_linea ON detalle_lote_transferencia(estado_linea);
