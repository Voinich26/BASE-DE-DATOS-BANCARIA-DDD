package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Solicitud de desembolso de préstamo aprobado.
 */
@Getter @Setter
@Schema(description = "Datos para desembolso de préstamo aprobado")
public class DesembolsarPrestamoRequest {

    @NotNull(message = "El ID del supervisor es obligatorio")
    @Schema(description = "ID del supervisor que autoriza el desembolso", example = "5")
    private Long idSupervisor;
}
