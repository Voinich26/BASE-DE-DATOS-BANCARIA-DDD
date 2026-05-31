package com.banco.ddd.application.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * Respuesta de autenticación JWT.
 */
@Getter
@Builder
public class AuthResponse {

    private String  accessToken;
    private String  refreshToken;
    private String  tokenType;
    private long    expiresIn;
    private Long    idUsuario;
    private String  nombreCompleto;
    private String  correoElectronico;
    private String  rol;
}
