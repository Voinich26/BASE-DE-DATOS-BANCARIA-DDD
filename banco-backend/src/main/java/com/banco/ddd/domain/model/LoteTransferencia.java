package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * BC-06: Aggregate Root — Lote de Transferencias (Pagos Masivos / Nómina Empresarial).
 *
 * <p>Representa un lote de pagos creado por una empresa para procesar
 * múltiples transferencias en una sola operación. El ciclo de vida es:
 * PENDIENTE → EN_REVISION → APROBADO → PROCESADO (o RECHAZADO).</p>
 *
 * <p>Tabla: {@code lote_transferencia}</p>
 */
@Entity
@Table(name = "lote_transferencia")
@Getter @Setter @NoArgsConstructor
public class LoteTransferencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_lote")
    private Long idLote;

    @Column(name = "nit_empresa", nullable = false, length = 30)
    private String nitEmpresa;

    @Column(name = "concepto", nullable = false, length = 300)
    private String concepto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_estado_lote", nullable = false)
    private CatEstadoLote estadoLote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_creador", nullable = false)
    private Usuario usuarioCreador;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_supervisor")
    private Usuario usuarioSupervisor;

    @Column(name = "total_items", nullable = false)
    private Integer totalItems;

    @Column(name = "items_exitosos")
    private Integer itemsExitosos;

    @Column(name = "items_fallidos")
    private Integer itemsFallidos;

    @Column(name = "monto_total", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoTotal;

    @Column(name = "monto_procesado", precision = 18, scale = 2)
    private BigDecimal montoProcesado;

    @Column(name = "motivo_rechazo", length = 500)
    private String motivoRechazo;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_procesamiento")
    private LocalDateTime fechaProcesamiento;

    @Column(name = "fecha_modificacion")
    private LocalDateTime fechaModificacion;

    @OneToMany(mappedBy = "lote", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("orden ASC")
    private List<DetalleLoteTransferencia> detalles = new ArrayList<>();
}
