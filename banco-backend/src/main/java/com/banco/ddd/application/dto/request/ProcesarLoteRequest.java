package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * BC-06: Request para procesar (ejecutar) un lote de pagos aprobado.
 */
@Getter @Setter
@Schema(description = "Solicitud de procesamiento de lote de pagos masivos")
public class ProcesarLoteRequest {

    @NotNull(message = "El ID del supervisor es obligatorio")
    @Schema(description = "ID del supervisor que autoriza el procesamiento", example = "3")
    private Long idSupervisor;
}
