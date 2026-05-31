package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Catálogo de estados para lotes de pagos masivos / nómina.
 */
@Entity
@Table(name = "cat_estado_lote")
@Getter
@Setter
@NoArgsConstructor
public class CatEstadoLote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_estado_lote")
    private Integer idEstadoLote;

    @Column(name = "nombre_estado", nullable = false, length = 40)
    private String nombreEstado;

    @Column(name = "es_estado_final", nullable = false)
    private boolean esEstadoFinal;
}
