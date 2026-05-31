package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * BC-01: Catálogo de roles del sistema.
 */
@Entity
@Table(name = "cat_rol")
@Getter @Setter @NoArgsConstructor
public class CatRol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol")
    private Integer idRol;

    @Column(name = "nombre_rol", nullable = false, unique = true, length = 60)
    private String nombreRol;

    @Column(name = "descripcion", length = 300)
    private String descripcion;
}
