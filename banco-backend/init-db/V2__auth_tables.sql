-- ============================================================
-- V2__auth_tables.sql
-- Tablas de autenticación enterprise para el módulo BC-01.
-- Ejecutar DESPUÉS de V1__credencial_usuario.sql
-- ============================================================

USE banco_ddd;

-- ============================================================
-- TABLA: token_revocado
-- Blacklist de tokens JWT revocados (logout seguro, rotation).
-- ============================================================
CREATE TABLE IF NOT EXISTS token_revocado (
    id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    jti              VARCHAR(36)      NOT NULL COMMENT 'JWT ID único (UUID)',
    id_usuario       INT UNSIGNED     NOT NULL,
    tipo_token       ENUM('ACCESS','REFRESH') NOT NULL COMMENT 'Tipo de token revocado',
    fecha_revocacion DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                     COMMENT 'Momento en que se revocó el token',
    fecha_expiracion DATETIME         NOT NULL
                     COMMENT 'Expiración original del token — para limpieza automática',
    motivo           VARCHAR(100)     NULL
                     COMMENT 'logout | refresh_rotation | password_change | admin_revoke',

    CONSTRAINT pk_token_revocado  PRIMARY KEY (id),
    CONSTRAINT uq_token_jti       UNIQUE (jti),
    CONSTRAINT fk_token_usuario   FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    INDEX idx_token_jti           (jti),
    INDEX idx_token_expiracion    (fecha_expiracion),
    INDEX idx_token_usuario       (id_usuario)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Blacklist de tokens JWT revocados — logout seguro y refresh rotation';


-- ============================================================
-- TABLA: intento_login
-- Auditoría de intentos de login para brute-force protection.
-- ============================================================
CREATE TABLE IF NOT EXISTS intento_login (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    correo_electronico  VARCHAR(150)    NOT NULL
                        COMMENT 'Correo usado en el intento (puede no existir)',
    ip_origen           VARCHAR(45)     NOT NULL
                        COMMENT 'IPv4 o IPv6 del cliente',
    exitoso             BOOLEAN         NOT NULL DEFAULT FALSE
                        COMMENT 'TRUE si el login fue exitoso',
    fecha_intento       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                        COMMENT 'Timestamp con precisión de milisegundos',
    user_agent          VARCHAR(300)    NULL
                        COMMENT 'User-Agent del navegador/cliente',

    CONSTRAINT pk_intento_login PRIMARY KEY (id),

    INDEX idx_intento_correo_fecha  (correo_electronico, fecha_intento),
    INDEX idx_intento_ip_fecha      (ip_origen, fecha_intento),
    INDEX idx_intento_exitoso       (exitoso, fecha_intento)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Auditoría de intentos de login — brute-force protection y trazabilidad';


-- ============================================================
-- EVENTO: Limpieza automática de intentos de login antiguos
-- Elimina registros con más de 90 días para mantener la tabla compacta.
-- Requiere que el Event Scheduler esté habilitado:
--   SET GLOBAL event_scheduler = ON;
-- ============================================================
DROP EVENT IF EXISTS evt_limpiar_intentos_login;

CREATE EVENT evt_limpiar_intentos_login
    ON SCHEDULE EVERY 1 DAY
    STARTS CURRENT_TIMESTAMP
    DO
        DELETE FROM intento_login
        WHERE fecha_intento < DATE_SUB(NOW(), INTERVAL 90 DAY);


-- ============================================================
-- EVENTO: Limpieza automática de tokens revocados expirados
-- Los tokens ya expirados no necesitan seguir en la blacklist.
-- ============================================================
DROP EVENT IF EXISTS evt_limpiar_tokens_revocados;

CREATE EVENT evt_limpiar_tokens_revocados
    ON SCHEDULE EVERY 1 HOUR
    STARTS CURRENT_TIMESTAMP
    DO
        DELETE FROM token_revocado
        WHERE fecha_expiracion < NOW();
