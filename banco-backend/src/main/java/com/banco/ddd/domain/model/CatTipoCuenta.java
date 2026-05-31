package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cat_tipo_cuenta")
@Getter @Setter @NoArgsConstructor
public class CatTipoCuenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_cuenta")
    private Integer idTipoCuenta;

    @Column(name = "nombre_tipo", nullable = false, unique = true, length = 50)
    private String nombreTipo;
}
