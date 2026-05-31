package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * BC-01: Catálogo de estados de usuario.
 */
@Entity
@Table(name = "cat_estado_usuario")
@Getter @Setter @NoArgsConstructor
public class CatEstadoUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_estado_usuario")
    private Integer idEstadoUsuario;

    @Column(name = "nombre_estado", nullable = false, unique = true, length = 30)
    private String nombreEstado;
}
