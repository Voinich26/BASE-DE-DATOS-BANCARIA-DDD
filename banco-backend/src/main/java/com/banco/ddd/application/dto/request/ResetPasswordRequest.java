package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Solicitud de reset de contraseña (flujo administrativo).
 * En un sistema bancario real, este endpoint requiere verificación adicional
 * (OTP, token de email, etc.). Aquí se implementa la versión básica enterprise.
 */
@Getter @Setter
@Schema(description = "Solicitud de restablecimiento de contraseña")
public class ResetPasswordRequest {

    @NotBlank(message = "El correo electrónico es obligatorio")
    @Email(message = "Formato de correo inválido")
    @Schema(description = "Correo del usuario que solicita el reset", example = "usuario@banco.com")
    private String correoElectronico;

    @NotBlank(message = "La nueva contraseña es obligatoria")
    @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
    @Schema(description = "Nueva contraseña (debe cumplir política bancaria)", example = "NuevaClave2026!")
    private String passwordNuevo;

    @NotBlank(message = "La confirmación de contraseña es obligatoria")
    @Schema(description = "Confirmación de la nueva contraseña")
    private String passwordConfirmacion;
}
