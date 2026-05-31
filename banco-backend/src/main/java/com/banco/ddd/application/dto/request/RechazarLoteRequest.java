package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * BC-06: Request para rechazar un lote de pagos masivos.
 */
@Getter @Setter
@Schema(description = "Solicitud de rechazo de lote de pagos masivos")
public class RechazarLoteRequest {

    @NotNull(message = "El ID del supervisor es obligatorio")
    @Schema(description = "ID del supervisor que rechaza el lote", example = "3")
    private Long idSupervisor;

    @NotBlank(message = "El motivo de rechazo es obligatorio")
    @Size(max = 500, message = "El motivo no puede superar 500 caracteres")
    @Schema(description = "Motivo del rechazo", example = "Saldo insuficiente en cuenta empresarial principal")
    private String motivo;
}
