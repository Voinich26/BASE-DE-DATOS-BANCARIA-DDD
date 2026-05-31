package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * BC-01 Auth: Tokens JWT revocados (blacklist).
 * Permite logout seguro y revocación de refresh tokens.
 *
 * DDL — ejecutar en banco_ddd:
 * <pre>
 * CREATE TABLE token_revocado (
 *     id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
 *     jti             VARCHAR(36)      NOT NULL COMMENT 'JWT ID único',
 *     id_usuario      INT UNSIGNED     NOT NULL,
 *     tipo_token      ENUM('ACCESS','REFRESH') NOT NULL,
 *     fecha_revocacion DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *     fecha_expiracion DATETIME        NOT NULL COMMENT 'Para limpieza automática',
 *     motivo          VARCHAR(100)     NULL,
 *     CONSTRAINT pk_token_revocado  PRIMARY KEY (id),
 *     CONSTRAINT uq_token_jti       UNIQUE (jti),
 *     CONSTRAINT fk_token_usuario   FOREIGN KEY (id_usuario)
 *         REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
 *     INDEX idx_token_jti           (jti),
 *     INDEX idx_token_expiracion    (fecha_expiracion)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
 *   COMMENT='Blacklist de tokens JWT revocados';
 * </pre>
 */
@Entity
@Table(name = "token_revocado")
@Getter @Setter @NoArgsConstructor
public class TokenRevocado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "jti", nullable = false, unique = true, length = 36)
    private String jti;

    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_token", nullable = false, length = 10)
    private TipoToken tipoToken;

    @Column(name = "fecha_revocacion", nullable = false, updatable = false)
    private LocalDateTime fechaRevocacion;

    @Column(name = "fecha_expiracion", nullable = false)
    private LocalDateTime fechaExpiracion;

    @Column(name = "motivo", length = 100)
    private String motivo;

    public TokenRevocado(String jti, Long idUsuario, TipoToken tipoToken,
                          LocalDateTime fechaExpiracion, String motivo) {
        this.jti             = jti;
        this.idUsuario       = idUsuario;
        this.tipoToken       = tipoToken;
        this.fechaRevocacion = LocalDateTime.now();
        this.fechaExpiracion = fechaExpiracion;
        this.motivo          = motivo;
    }

    public enum TipoToken { ACCESS, REFRESH }
}
