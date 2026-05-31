package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * BC-04: Aggregate Root — Préstamo.
 */
@Entity
@Table(name = "prestamo")
@Getter @Setter @NoArgsConstructor
public class Prestamo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_prestamo")
    private Long idPrestamo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_tipo_prestamo", nullable = false)
    private CatTipoPrestamo tipoPrestamo;

    @Column(name = "id_cliente_solicitante", nullable = false, length = 30)
    private String idClienteSolicitante;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_cliente", nullable = false, length = 20)
    private TipoCliente tipoCliente;

    @Column(name = "monto_solicitado", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoSolicitado;

    @Column(name = "monto_aprobado", precision = 18, scale = 2)
    private BigDecimal montoAprobado;

    @Column(name = "tasa_interes", precision = 6, scale = 4)
    private BigDecimal tasaInteres;

    @Column(name = "plazo_meses")
    private Integer plazoMeses;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_estado_prestamo", nullable = false)
    private CatEstadoPrestamo estadoPrestamo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_solicitante", nullable = false)
    private Usuario usuarioSolicitante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_analista_aprobador")
    private Usuario analistaAprobador;

    @Column(name = "fecha_solicitud", nullable = false, updatable = false)
    private LocalDateTime fechaSolicitud;

    @Column(name = "fecha_aprobacion")
    private LocalDateTime fechaAprobacion;

    @Column(name = "fecha_desembolso")
    private LocalDateTime fechaDesembolso;

    @Column(name = "cuenta_destino_desembolso", length = 30)
    private String cuentaDestinoDesembolso;

    @Column(name = "fecha_modificacion")
    private LocalDateTime fechaModificacion;

    public enum TipoCliente {
        PERSONA_NATURAL, EMPRESA
    }
}
