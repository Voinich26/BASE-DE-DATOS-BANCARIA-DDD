package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Schema(description = "Solicitud de cierre de sesión")
public class LogoutRequest {

    @NotBlank(message = "El refresh token es obligatorio para logout seguro")
    @Schema(description = "Refresh token a revocar")
    private String refreshToken;
}
