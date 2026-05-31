package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Solicitud de bloqueo de cuenta bancaria.
 */
@Getter @Setter
@Schema(description = "Solicitud de bloqueo de cuenta bancaria")
public class BloquearCuentaRequest {

    @NotBlank(message = "El motivo del bloqueo es obligatorio")
    @Size(max = 300, message = "El motivo no puede superar 300 caracteres")
    @Schema(description = "Motivo del bloqueo", example = "Actividad sospechosa detectada por el sistema")
    private String motivo;
}
