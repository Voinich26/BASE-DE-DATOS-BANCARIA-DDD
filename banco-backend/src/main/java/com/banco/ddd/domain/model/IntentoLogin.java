package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * BC-01 Auth: Registro de intentos de login fallidos para brute-force protection.
 *
 * DDL — ejecutar en banco_ddd:
 * <pre>
 * CREATE TABLE intento_login (
 *     id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 *     correo_electronico  VARCHAR(150)    NOT NULL,
 *     ip_origen           VARCHAR(45)     NOT NULL COMMENT 'IPv4 o IPv6',
 *     exitoso             BOOLEAN         NOT NULL DEFAULT FALSE,
 *     fecha_intento       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 *     user_agent          VARCHAR(300)    NULL,
 *     CONSTRAINT pk_intento_login PRIMARY KEY (id),
 *     INDEX idx_intento_correo  (correo_electronico, fecha_intento),
 *     INDEX idx_intento_ip      (ip_origen, fecha_intento)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
 *   COMMENT='Auditoría de intentos de login para brute-force protection';
 * </pre>
 */
@Entity
@Table(name = "intento_login")
@Getter @Setter @NoArgsConstructor
public class IntentoLogin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "correo_electronico", nullable = false, length = 150)
    private String correoElectronico;

    @Column(name = "ip_origen", nullable = false, length = 45)
    private String ipOrigen;

    @Column(name = "exitoso", nullable = false)
    private boolean exitoso;

    @Column(name = "fecha_intento", nullable = false, updatable = false)
    private LocalDateTime fechaIntento;

    @Column(name = "user_agent", length = 300)
    private String userAgent;

    public IntentoLogin(String correoElectronico, String ipOrigen,
                         boolean exitoso, String userAgent) {
        this.correoElectronico = correoElectronico;
        this.ipOrigen          = ipOrigen;
        this.exitoso           = exitoso;
        this.fechaIntento      = LocalDateTime.now();
        this.userAgent         = userAgent;
    }
}
