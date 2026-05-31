package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cat_estado_cuenta")
@Getter @Setter @NoArgsConstructor
public class CatEstadoCuenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_estado_cuenta")
    private Integer idEstadoCuenta;

    @Column(name = "nombre_estado", nullable = false, unique = true, length = 30)
    private String nombreEstado;
}
