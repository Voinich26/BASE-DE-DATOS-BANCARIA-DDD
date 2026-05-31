package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter @Setter
@Schema(description = "Datos para apertura de cuenta bancaria")
public class CrearCuentaRequest {

    @NotBlank
    @Size(max = 30)
    private String numeroCuenta;

    @NotBlank(message = "El tipo de cuenta es obligatorio")
    private String nombreTipoCuenta;

    @NotBlank(message = "El titular es obligatorio")
    @Size(max = 30)
    private String idTitular;

    @NotBlank(message = "El tipo de titular es obligatorio: PERSONA_NATURAL o EMPRESA")
    private String tipoTitular;

    @NotBlank(message = "El código ISO de moneda es obligatorio (ej: COP, USD)")
    @Size(min = 3, max = 3)
    private String codigoIsoMoneda;

    @NotNull
    @DecimalMin(value = "0.00", message = "El saldo inicial no puede ser negativo")
    private BigDecimal saldoInicial;

    @NotNull(message = "El usuario que abre la cuenta es obligatorio")
    private Long idUsuarioApertura;
}
