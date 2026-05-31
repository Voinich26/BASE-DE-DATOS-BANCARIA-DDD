package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * BC-05: Aggregate Root — Transferencia.
 */
@Entity
@Table(name = "transferencia")
@Getter @Setter @NoArgsConstructor
public class Transferencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_transferencia")
    private Long idTransferencia;

    @Column(name = "cuenta_origen", nullable = false, length = 30)
    private String cuentaOrigen;

    @Column(name = "cuenta_destino", nullable = false, length = 30)
    private String cuentaDestino;

    @Column(name = "monto", nullable = false, precision = 18, scale = 2)
    private BigDecimal monto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_estado_transferencia", nullable = false)
    private CatEstadoTransferencia estadoTransferencia;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_creador", nullable = false)
    private Usuario usuarioCreador;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_aprobador")
    private Usuario usuarioAprobador;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_aprobacion")
    private LocalDateTime fechaAprobacion;

    @Column(name = "fecha_vencimiento", nullable = false)
    private LocalDateTime fechaVencimiento;

    @Column(name = "requiere_aprobacion", nullable = false)
    private boolean requiereAprobacion;

    @Column(name = "saldo_origen_antes", precision = 18, scale = 2)
    private BigDecimal saldoOrigenAntes;

    @Column(name = "saldo_destino_antes", precision = 18, scale = 2)
    private BigDecimal saldoDestinoAntes;

    @Column(name = "saldo_origen_despues", precision = 18, scale = 2)
    private BigDecimal saldoOrigenDespues;

    @Column(name = "saldo_destino_despues", precision = 18, scale = 2)
    private BigDecimal saldoDestinoDespues;
}
