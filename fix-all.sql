-- ============================================================
-- fix-all.sql  — Script maestro de corrección
-- Ejecutar DESPUÉS de haber corrido todos los scripts de Banco_Based/
-- ============================================================
-- Contraseñas:
--   admin@banco.com        → Admin2026!
--   supervisor@banco.com   → Banco2026!
--   analista@banco.com     → Banco2026!
--   Todos los demás        → Banco2026!
--
-- Hashes BCrypt strength=12 ($2a$12$) compatibles con
-- Spring Security BCryptPasswordEncoder(12)
-- ============================================================

USE banco_ddd;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 1. Asegurar que el rol Administrador existe ───────────────────────────────
INSERT IGNORE INTO cat_rol (nombre_rol, descripcion)
VALUES ('Administrador', 'Administrador del sistema con acceso total');

-- ── 2. Asegurar que el estado Activo existe ───────────────────────────────────
INSERT IGNORE INTO cat_estado_usuario (nombre_estado) VALUES ('Activo');

-- ── 3. Crear usuario admin@banco.com si no existe ────────────────────────────
SET @id_rol_admin    = (SELECT id_rol FROM cat_rol WHERE nombre_rol = 'Administrador' LIMIT 1);
SET @id_estado_activo = (SELECT id_estado_usuario FROM cat_estado_usuario WHERE nombre_estado = 'Activo' LIMIT 1);

INSERT IGNORE INTO usuario
    (id_usuario, nombre_completo, id_identificacion, correo_electronico,
     telefono, id_rol, id_estado_usuario)
VALUES
    (100, 'Administrador Sistema', 'ADMIN-001', 'admin@banco.com',
     '0000000000', @id_rol_admin, @id_estado_activo);

-- ── 4. Crear usuario supervisor@banco.com si no existe ───────────────────────
SET @id_rol_sup = (SELECT id_rol FROM cat_rol WHERE nombre_rol = 'Supervisor Empresa' LIMIT 1);

INSERT IGNORE INTO usuario
    (id_usuario, nombre_completo, id_identificacion, correo_electronico,
     telefono, id_rol, id_estado_usuario)
VALUES
    (101, 'Supervisor Banco', 'SUP-001', 'supervisor@banco.com',
     '3001234567', @id_rol_sup, @id_estado_activo);

-- ── 5. Crear usuario analista@banco.com si no existe ─────────────────────────
SET @id_rol_ana = (SELECT id_rol FROM cat_rol WHERE nombre_rol = 'Analista Interno' LIMIT 1);

INSERT IGNORE INTO usuario
    (id_usuario, nombre_completo, id_identificacion, correo_electronico,
     telefono, id_rol, id_estado_usuario)
VALUES
    (102, 'Analista Banco', 'ANA-001', 'analista@banco.com',
     '3007654321', @id_rol_ana, @id_estado_activo);

-- ── 6. Crear tabla credencial_usuario si no existe ───────────────────────────
CREATE TABLE IF NOT EXISTS credencial_usuario (
    id_usuario      INT UNSIGNED NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cambio    DATETIME     NULL     ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_credencial   PRIMARY KEY (id_usuario),
    CONSTRAINT fk_cred_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. Crear tabla token_revocado si no existe ───────────────────────────────
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

-- ── 8. Crear tabla intento_login si no existe ────────────────────────────────
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

-- ── 9. Insertar/actualizar contraseñas BCrypt strength=12 ────────────────────
-- Hash para "Admin2026!"  (BCrypt $2a$12$)
SET @hash_admin  = '$2a$12$6BbyOkQ0KIG3N1dWHWHDfuz3fMRVUizmqcuYsoUa9TSnrw8wTwiru';
-- Hash para "Banco2026!"  (BCrypt $2a$12$)
SET @hash_banco  = '$2a$12$oyoUBLCj0gepH8/4nZo9uevxe6pehf3fCshF.xs9rOvEE9OUN1Ubq';

-- Admin
INSERT INTO credencial_usuario (id_usuario, password_hash)
VALUES (100, @hash_admin)
ON DUPLICATE KEY UPDATE password_hash = @hash_admin;

-- Supervisor
INSERT INTO credencial_usuario (id_usuario, password_hash)
VALUES (101, @hash_banco)
ON DUPLICATE KEY UPDATE password_hash = @hash_banco;

-- Analista
INSERT INTO credencial_usuario (id_usuario, password_hash)
VALUES (102, @hash_banco)
ON DUPLICATE KEY UPDATE password_hash = @hash_banco;

-- Todos los usuarios del seed (ids 1-9) → Banco2026!
INSERT INTO credencial_usuario (id_usuario, password_hash)
SELECT u.id_usuario, @hash_banco
FROM usuario u
WHERE u.id_usuario BETWEEN 1 AND 9
ON DUPLICATE KEY UPDATE password_hash = @hash_banco;

-- ── 10. Corregir estado de cuenta 'Cerrada' → 'Cancelada' si existe ──────────
UPDATE cat_estado_cuenta SET nombre_estado = 'Cancelada' WHERE nombre_estado = 'Cerrada';

-- ── 11. Corregir estados de préstamo si usan nombres viejos ──────────────────
-- Si la tabla tiene 'En Estudio' en lugar de 'Solicitado', corregir
UPDATE cat_estado_prestamo SET nombre_estado = 'Solicitado'   WHERE nombre_estado = 'En Estudio';
UPDATE cat_estado_prestamo SET nombre_estado = 'Desembolsado' WHERE nombre_estado = 'Desembolsado';

-- Agregar estados faltantes si no existen
INSERT IGNORE INTO cat_estado_prestamo (nombre_estado, es_estado_final)
VALUES ('En Revision', FALSE);
INSERT IGNORE INTO cat_estado_prestamo (nombre_estado, es_estado_final)
VALUES ('Cancelado', TRUE);

-- ── 12. Agregar tipo de préstamo 'Educativo' si no existe ────────────────────
INSERT IGNORE INTO cat_tipo_prestamo (nombre_tipo) VALUES ('Educativo');

-- ── 13. Verificación final ────────────────────────────────────────────────────
SELECT
    u.id_usuario,
    u.correo_electronico,
    r.nombre_rol,
    eu.nombre_estado AS estado_usuario,
    CASE WHEN c.id_usuario IS NOT NULL THEN 'SI' ELSE 'NO' END AS tiene_credencial,
    LEFT(c.password_hash, 7) AS hash_prefix
FROM usuario u
JOIN cat_rol r ON u.id_rol = r.id_rol
JOIN cat_estado_usuario eu ON u.id_estado_usuario = eu.id_estado_usuario
LEFT JOIN credencial_usuario c ON u.id_usuario = c.id_usuario
ORDER BY u.id_usuario;

SELECT 'cat_estado_cuenta' AS tabla, nombre_estado FROM cat_estado_cuenta
UNION ALL
SELECT 'cat_estado_prestamo', nombre_estado FROM cat_estado_prestamo
UNION ALL
SELECT 'cat_tipo_prestamo', nombre_tipo FROM cat_tipo_prestamo;
