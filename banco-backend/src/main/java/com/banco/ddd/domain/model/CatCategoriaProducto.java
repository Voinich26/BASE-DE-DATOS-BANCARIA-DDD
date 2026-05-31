package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * BC-07: Catálogo de categorías de productos bancarios.
 */
@Entity
@Table(name = "cat_categoria_producto")
@Getter @Setter @NoArgsConstructor
public class CatCategoriaProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_categoria")
    private Integer idCategoria;

    @Column(name = "nombre_categoria", nullable = false, unique = true, length = 60)
    private String nombreCategoria;
}
