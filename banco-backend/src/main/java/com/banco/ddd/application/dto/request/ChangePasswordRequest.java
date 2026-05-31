package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Schema(description = "Solicitud de cambio de contraseña (usuario autenticado)")
public class ChangePasswordRequest {

    @NotBlank(message = "La contraseña actual es obligatoria")
    @Schema(description = "Contraseña actual del usuario")
    private String passwordActual;

    @NotBlank(message = "La nueva contraseña es obligatoria")
    @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
    @Schema(description = "Nueva contraseña (mín. 8 chars, 1 mayúscula, 1 dígito, 1 especial)",
            example = "NuevaClave2026!")
    private String passwordNuevo;

    @NotBlank(message = "La confirmación de contraseña es obligatoria")
    @Schema(description = "Confirmación de la nueva contraseña")
    private String passwordConfirmacion;
}
