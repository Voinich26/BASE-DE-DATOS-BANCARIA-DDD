package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cat_estado_prestamo")
@Getter @Setter @NoArgsConstructor
public class CatEstadoPrestamo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_estado_prestamo")
    private Integer idEstadoPrestamo;

    @Column(name = "nombre_estado", nullable = false, unique = true, length = 40)
    private String nombreEstado;

    @Column(name = "es_estado_final", nullable = false)
    private boolean esEstadoFinal;
}
