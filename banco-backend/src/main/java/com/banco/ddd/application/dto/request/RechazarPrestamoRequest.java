package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Solicitud de rechazo de préstamo por analista.
 */
@Getter @Setter
@Schema(description = "Datos para rechazo de préstamo por analista")
public class RechazarPrestamoRequest {

    @NotNull(message = "El ID del analista es obligatorio")
    @Schema(description = "ID del analista que rechaza", example = "3")
    private Long idAnalista;

    @Size(max = 500, message = "El motivo no puede superar 500 caracteres")
    @Schema(description = "Motivo del rechazo", example = "Capacidad de pago insuficiente según análisis crediticio")
    private String motivo;
}
