package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cat_tipo_prestamo")
@Getter @Setter @NoArgsConstructor
public class CatTipoPrestamo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_prestamo")
    private Integer idTipoPrestamo;

    @Column(name = "nombre_tipo", nullable = false, unique = true, length = 60)
    private String nombreTipo;
}
