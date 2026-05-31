package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter @Setter
@Schema(description = "Operación de caja: depósito o retiro")
public class OperacionCajaRequest {

    @NotBlank(message = "El número de cuenta es obligatorio")
    @Size(max = 30)
    private String numeroCuenta;

    @NotNull
    @DecimalMin(value = "0.01", message = "El monto debe ser mayor a cero")
    private BigDecimal monto;

    @NotNull(message = "El usuario que realiza la operación es obligatorio")
    private Long idUsuario;

    @Size(max = 200)
    private String concepto;
}
