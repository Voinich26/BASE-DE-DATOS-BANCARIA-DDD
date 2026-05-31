package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * BC-07: Aggregate Root — Producto Bancario.
 */
@Entity
@Table(name = "producto_bancario")
@Getter @Setter @NoArgsConstructor
public class ProductoBancario {

    @Id
    @Column(name = "codigo_producto", length = 20)
    private String codigoProducto;

    @Column(name = "nombre_producto", nullable = false, unique = true, length = 100)
    private String nombreProducto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_categoria", nullable = false)
    private CatCategoriaProducto categoria;

    @Column(name = "requiere_aprobacion", nullable = false)
    private boolean requiereAprobacion;

    @Column(name = "activo", nullable = false)
    private boolean activo;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_modificacion")
    private LocalDateTime fechaModificacion;
}
