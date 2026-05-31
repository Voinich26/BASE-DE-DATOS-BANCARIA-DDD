package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * BC-04: Registro de transiciones de estado de un préstamo.
 * Tabla: prestamo_transicion_estado
 *
 * <p>Cada cambio de estado (trigger o SP) inserta un registro aquí
 * para trazabilidad completa del ciclo de vida del préstamo.</p>
 */
@Entity
@Table(name = "prestamo_transicion_estado")
@Getter @Setter @NoArgsConstructor
public class PrestamoTransicionEstado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_transicion")
    private Long idTransicion;

    @Column(name = "id_prestamo", nullable = false)
    private Long idPrestamo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_estado_anterior")
    private CatEstadoPrestamo estadoAnterior;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_estado_nuevo", nullable = false)
    private CatEstadoPrestamo estadoNuevo;

    @Column(name = "fecha_transicion", nullable = false, updatable = false)
    private LocalDateTime fechaTransicion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(name = "observaciones", length = 500)
    private String observaciones;
}
