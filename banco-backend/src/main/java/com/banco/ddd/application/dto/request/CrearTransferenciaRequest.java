package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter @Setter
@Schema(description = "Datos para crear una transferencia entre cuentas")
public class CrearTransferenciaRequest {

    @NotBlank(message = "La cuenta origen es obligatoria")
    @Size(max = 30)
    private String cuentaOrigen;

    @NotBlank(message = "La cuenta destino es obligatoria")
    @Size(max = 30)
    private String cuentaDestino;

    @NotNull
    @DecimalMin(value = "0.01", message = "El monto debe ser mayor a cero")
    private BigDecimal monto;

    @NotNull(message = "El usuario creador es obligatorio")
    private Long idUsuarioCreador;
}
