package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Almacena la contraseña hasheada (BCrypt) de cada usuario.
 * Tabla separada de `usuario` para no contaminar el modelo de dominio
 * con datos de autenticación. Se crea junto con el usuario.
 *
 * DDL (ejecutar una sola vez en banco_ddd):
 * <pre>
 * CREATE TABLE credencial_usuario (
 *     id_usuario      INT UNSIGNED NOT NULL,
 *     password_hash   VARCHAR(255) NOT NULL,
 *     fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *     fecha_cambio    DATETIME     NULL     ON UPDATE CURRENT_TIMESTAMP,
 *     CONSTRAINT pk_credencial   PRIMARY KEY (id_usuario),
 *     CONSTRAINT fk_cred_usuario FOREIGN KEY (id_usuario)
 *         REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 * </pre>
 */
@Entity
@Table(name = "credencial_usuario")
@Getter @Setter @NoArgsConstructor
public class CredencialUsuario {

    @Id
    @Column(name = "id_usuario")
    private Long idUsuario;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_cambio")
    private LocalDateTime fechaCambio;

    public CredencialUsuario(Usuario usuario, String passwordHash) {
        this.usuario       = usuario;
        this.passwordHash  = passwordHash;
        this.fechaCreacion = LocalDateTime.now();
    }
}
