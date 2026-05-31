package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Solicitud de rechazo de transferencia.
 */
@Getter @Setter
@Schema(description = "Solicitud de rechazo de transferencia por supervisor")
public class RechazarTransferenciaRequest {

    @NotNull(message = "El ID del supervisor es obligatorio")
    @Schema(description = "ID del supervisor que rechaza", example = "5")
    private Long idSupervisor;

    @Size(max = 500, message = "El motivo no puede superar 500 caracteres")
    @Schema(description = "Motivo del rechazo", example = "Monto supera el límite autorizado para este cliente")
    private String motivo;
}
