-- ============================================================
-- V1__credencial_usuario.sql
-- Tabla de credenciales de autenticación (contraseñas BCrypt).
-- Separada de `usuario` para no contaminar el modelo de dominio.
-- Ejecutar UNA VEZ en banco_ddd después de 07_seed_data.sql
-- ============================================================

USE banco_ddd;

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

-- ============================================================
-- Contraseñas iniciales para usuarios de prueba (seed).
-- Hash BCrypt de "Banco2026!" (strength=12)
-- CAMBIAR EN PRODUCCIÓN.
-- ============================================================
-- INSERT INTO credencial_usuario (id_usuario, password_hash)
-- SELECT id_usuario,
--        '$2a$12$exampleHashHere...'   -- reemplazar con hash real
-- FROM usuario
-- WHERE id_estado_usuario = (SELECT id_estado_usuario FROM cat_estado_usuario WHERE nombre_estado = 'Activo');
