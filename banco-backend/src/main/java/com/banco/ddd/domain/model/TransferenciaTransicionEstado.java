package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * BC-05: Registro de transiciones de estado de una transferencia.
 * Tabla: transferencia_transicion_estado
 *
 * <p>Cada vez que una transferencia cambia de estado (trigger o SP),
 * se inserta un registro aquí para trazabilidad completa del ciclo de vida.</p>
 */
@Entity
@Table(name = "transferencia_transicion_estado")
@Getter @Setter @NoArgsConstructor
public class TransferenciaTransicionEstado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_transicion")
    private Long idTransicion;

    @Column(name = "id_transferencia", nullable = false)
    private Long idTransferencia;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_estado_anterior")
    private CatEstadoTransferencia estadoAnterior;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_estado_nuevo", nullable = false)
    private CatEstadoTransferencia estadoNuevo;

    @Column(name = "fecha_transicion", nullable = false, updatable = false)
    private LocalDateTime fechaTransicion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(name = "motivo", length = 500)
    private String motivo;
}
