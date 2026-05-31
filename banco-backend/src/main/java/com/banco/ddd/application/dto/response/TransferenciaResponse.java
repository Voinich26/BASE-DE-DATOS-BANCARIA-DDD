package com.banco.ddd.application.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class TransferenciaResponse {

    private Long       idTransferencia;
    private String     cuentaOrigen;
    private String     cuentaDestino;
    private BigDecimal monto;
    private String     estadoTransferencia;
    private Long       idUsuarioCreador;
    private String     nombreUsuarioCreador;
    private Long       idUsuarioAprobador;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime fechaCreacion;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime fechaAprobacion;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime fechaVencimiento;

    private boolean    requiereAprobacion;
    private BigDecimal saldoOrigenAntes;
    private BigDecimal saldoOrigenDespues;
    private BigDecimal saldoDestinoAntes;
    private BigDecimal saldoDestinoDespues;

    /** true si el estado es final (Ejecutada, Rechazada, Vencida) */
    private boolean    estadoFinal;

    /** true si la transferencia ha vencido y no está en estado final */
    private boolean    vencida;
}
