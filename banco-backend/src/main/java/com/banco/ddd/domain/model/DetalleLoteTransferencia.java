package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * BC-06: Entidad — Detalle de un lote de transferencias.
 *
 * <p>Cada registro representa una transferencia individual dentro del lote.
 * El estado refleja si fue procesada exitosamente, falló o está pendiente.</p>
 *
 * <p>Tabla: {@code detalle_lote_transferencia}</p>
 */
@Entity
@Table(name = "detalle_lote_transferencia")
@Getter @Setter @NoArgsConstructor
public class DetalleLoteTransferencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_detalle")
    private Long idDetalle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_lote", nullable = false)
    private LoteTransferencia lote;

    @Column(name = "cuenta_origen", nullable = false, length = 30)
    private String cuentaOrigen;

    @Column(name = "cuenta_destino", nullable = false, length = 30)
    private String cuentaDestino;

    @Column(name = "monto", nullable = false, precision = 18, scale = 2)
    private BigDecimal monto;

    @Column(name = "concepto_detalle", length = 200)
    private String conceptoDetalle;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_estado_detalle", nullable = false)
    private CatEstadoLote estadoDetalle;

    /**
     * ID de la transferencia generada al procesar este detalle.
     * Null si aún no se ha procesado o si falló.
     */
    @Column(name = "id_transferencia_generada")
    private Long idTransferenciaGenerada;

    @Column(name = "mensaje_error", length = 500)
    private String mensajeError;

    @Column(name = "orden", nullable = false)
    private Integer orden;
}
