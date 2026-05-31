package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * BC-03: Aggregate Root — Cuenta Bancaria.
 */
@Entity
@Table(name = "cuenta_bancaria")
@Getter @Setter @NoArgsConstructor
public class CuentaBancaria {

    @Id
    @Column(name = "numero_cuenta", length = 30)
    private String numeroCuenta;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_tipo_cuenta", nullable = false)
    private CatTipoCuenta tipoCuenta;

    @Column(name = "id_titular", nullable = false, length = 30)
    private String idTitular;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_titular", nullable = false, length = 20)
    private TipoTitular tipoTitular;

    @Column(name = "saldo_actual", nullable = false, precision = 18, scale = 2)
    private BigDecimal saldoActual;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_moneda", nullable = false)
    private CatMoneda moneda;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_estado_cuenta", nullable = false)
    private CatEstadoCuenta estadoCuenta;

    @Column(name = "fecha_apertura", nullable = false)
    private LocalDate fechaApertura;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_apertura", nullable = false)
    private Usuario usuarioApertura;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_modificacion")
    private LocalDateTime fechaModificacion;

    public enum TipoTitular {
        PERSONA_NATURAL, EMPRESA
    }
}
