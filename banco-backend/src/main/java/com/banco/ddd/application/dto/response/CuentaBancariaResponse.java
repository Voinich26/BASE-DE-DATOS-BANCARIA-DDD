package com.banco.ddd.application.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class CuentaBancariaResponse {

    private String     numeroCuenta;
    private String     tipoCuenta;
    private String     idTitular;
    private String     tipoTitular;
    private BigDecimal saldoActual;
    private String     moneda;
    private String     codigoIsoMoneda;
    private String     estadoCuenta;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate  fechaApertura;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime fechaCreacion;
}
