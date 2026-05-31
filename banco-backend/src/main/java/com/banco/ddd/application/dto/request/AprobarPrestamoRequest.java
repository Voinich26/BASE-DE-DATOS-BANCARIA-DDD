package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter @Setter
@Schema(description = "Datos para aprobación de préstamo por analista")
public class AprobarPrestamoRequest {

    @NotNull
    private Long idAnalista;

    @NotNull
    @DecimalMin(value = "0.01", message = "El monto aprobado debe ser mayor a cero")
    private BigDecimal montoAprobado;

    @NotNull
    @DecimalMin(value = "0.0001", message = "La tasa de interés debe ser mayor a cero")
    private BigDecimal tasaInteres;

    @NotNull
    @Min(value = 1, message = "El plazo debe ser al menos 1 mes")
    private Integer plazoMeses;

    @NotBlank(message = "La cuenta destino de desembolso es obligatoria")
    @Size(max = 30)
    private String cuentaDestinoDesembolso;
}
