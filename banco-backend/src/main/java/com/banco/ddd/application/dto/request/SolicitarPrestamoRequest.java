package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter @Setter
@Schema(description = "Solicitud de préstamo bancario")
public class SolicitarPrestamoRequest {

    @NotBlank
    @Size(max = 30)
    private String idClienteSolicitante;

    @NotBlank(message = "Tipo de cliente: PERSONA_NATURAL o EMPRESA")
    private String tipoCliente;

    @NotBlank(message = "El tipo de préstamo es obligatorio")
    private String nombreTipoPrestamo;

    @NotNull
    @DecimalMin(value = "0.01", message = "El monto solicitado debe ser mayor a cero")
    private BigDecimal montoSolicitado;

    @NotNull(message = "El usuario solicitante es obligatorio")
    private Long idUsuarioSolicitante;
}
