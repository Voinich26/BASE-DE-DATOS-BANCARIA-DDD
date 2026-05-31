package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Schema(description = "Credenciales de autenticación")
public class LoginRequest {

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Formato de correo inválido")
    @Schema(description = "Correo electrónico del usuario", example = "usuario@banco.com")
    private String correoElectronico;

    @NotBlank(message = "La contraseña es obligatoria")
    @Schema(description = "Contraseña del usuario")
    private String password;
}
