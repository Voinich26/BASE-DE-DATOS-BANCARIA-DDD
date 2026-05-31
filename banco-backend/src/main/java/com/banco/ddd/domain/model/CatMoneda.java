package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cat_moneda")
@Getter @Setter @NoArgsConstructor
public class CatMoneda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_moneda")
    private Integer idMoneda;

    @Column(name = "codigo_iso", nullable = false, unique = true, length = 3)
    private String codigoIso;

    @Column(name = "nombre_moneda", nullable = false, length = 50)
    private String nombreMoneda;
}
