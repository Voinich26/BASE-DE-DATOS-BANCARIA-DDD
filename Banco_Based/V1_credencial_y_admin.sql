-- ============================================================
-- V1_credencial_y_admin.sql
-- Crea tabla credencial_usuario, agrega usuario ADMINISTRADOR
-- e inserta contraseñas BCrypt para todos los usuarios semilla.
--
-- Contraseña de todos los usuarios: Banco2026!
-- Contraseña del admin:             Admin2026!
-- ============================================================

USE banco_ddd;

-- ── 1. Tabla credencial_usuario ───────────────────────────────
CREATE TABLE IF NOT EXISTS credencial_usuario (
    id_usuario      INT UNSIGNED NOT NULL,
    password_hash   VARCHAR(255) NOT NULL COMMENT 'BCrypt hash de la contraseña',
    fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cambio    DATETIME     NULL     ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_credencial   PRIMARY KEY (id_usuario),
    CONSTRAINT fk_cred_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Credenciales de autenticación JWT — contraseñas BCrypt';

-- ── 2. Tabla token_revocado (si no existe ya) ─────────────────
CREATE TABLE IF NOT EXISTS token_revocado (
    id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    jti              VARCHAR(36)      NOT NULL,
    id_usuario       INT UNSIGNED     NOT NULL,
    tipo_token       ENUM('ACCESS','REFRESH') NOT NULL,
    fecha_revocacion DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME         NOT NULL,
    motivo           VARCHAR(100)     NULL,
    CONSTRAINT pk_token_revocado  PRIMARY KEY (id),
    CONSTRAINT uq_token_jti       UNIQUE (jti),
    CONSTRAINT fk_token_usuario   FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_token_jti           (jti),
    INDEX idx_token_expiracion    (fecha_expiracion),
    INDEX idx_token_usuario       (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Tabla intento_login (si no existe ya) ──────────────────
CREATE TABLE IF NOT EXISTS intento_login (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    correo_electronico  VARCHAR(150)    NOT NULL,
    ip_origen           VARCHAR(45)     NOT NULL,
    exitoso             BOOLEAN         NOT NULL DEFAULT FALSE,
    fecha_intento       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    user_agent          VARCHAR(300)    NULL,
    CONSTRAINT pk_intento_login PRIMARY KEY (id),
    INDEX idx_intento_correo_fecha  (correo_electronico, fecha_intento),
    INDEX idx_intento_ip_fecha      (ip_origen, fecha_intento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Agregar rol ADMINISTRADOR si no existe ─────────────────
INSERT IGNORE INTO cat_rol (nombre_rol, descripcion)
VALUES ('Administrador', 'Administrador del sistema con acceso total');

-- ── 5. Crear usuario ADMINISTRADOR ───────────────────────────
-- Obtener id del rol Administrador y estado Activo
SET @id_rol_admin = (SELECT id_rol FROM cat_rol WHERE nombre_rol = 'Administrador' LIMIT 1);
SET @id_estado_activo = (SELECT id_estado_usuario FROM cat_estado_usuario WHERE nombre_estado = 'Activo' LIMIT 1);

INSERT IGNORE INTO usuario
    (id_usuario, nombre_completo, id_identificacion, correo_electronico,
     telefono, id_rol, id_estado_usuario)
VALUES
    (100, 'Administrador Sistema', 'ADMIN-001', 'admin@banco.com',
     '0000000000', @id_rol_admin, @id_estado_activo);

-- ── 6. Insertar contraseñas BCrypt para todos los usuarios ────
-- Contraseña de usuarios 1-12: Banco2026!
-- Contraseña del admin (100):  Admin2026!

INSERT IGNORE INTO credencial_usuario (id_usuario, password_hash) VALUES
(1,   '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(2,   '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(3,   '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(4,   '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(5,   '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(6,   '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(7,   '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(8,   '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(9,   '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(10,  '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(11,  '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(12,  '$2b$10$smNWLMp6WX2P/bRFOooJoujdBUBNZ.lWG4p5YRJF3KYCUxpve2YEu'),
(100, '$2b$10$Lj35I.AsFT.VMZSYMW4yPe1eXnaOQJplzuXbsa/spl/mG35ypjGj.');

-- ── 7. Verificación final ─────────────────────────────────────
SELECT
    u.id_usuario,
    u.nombre_completo,
    u.correo_electronico,
    r.nombre_rol,
    CASE WHEN c.id_usuario IS NOT NULL THEN 'SI' ELSE 'NO' END AS tiene_credencial
FROM usuario u
JOIN cat_rol r ON u.id_rol = r.id_rol
LEFT JOIN credencial_usuario c ON u.id_usuario = c.id_usuario
ORDER BY u.id_usuario;
