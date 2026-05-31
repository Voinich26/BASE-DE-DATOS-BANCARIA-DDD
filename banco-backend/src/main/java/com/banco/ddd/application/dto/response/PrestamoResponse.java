package com.banco.ddd.application.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class PrestamoResponse {

    private Long       idPrestamo;
    private String     tipoPrestamo;
    private String     idClienteSolicitante;
    private String     tipoCliente;
    private BigDecimal montoSolicitado;
    private BigDecimal montoAprobado;
    private BigDecimal tasaInteres;
    private Integer    plazoMeses;
    private String     estadoPrestamo;
    private Long       idUsuarioSolicitante;
    private Long       idAnalistaAprobador;
    private LocalDateTime fechaSolicitud;
    private LocalDateTime fechaAprobacion;
    private LocalDateTime fechaDesembolso;
    private String     cuentaDestinoDesembolso;
}
