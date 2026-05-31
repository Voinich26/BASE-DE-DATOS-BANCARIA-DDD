package com.banco.ddd.application.port.in;

import com.banco.ddd.application.dto.request.ChangePasswordRequest;
import com.banco.ddd.application.dto.request.LoginRequest;
import com.banco.ddd.application.dto.request.LogoutRequest;
import com.banco.ddd.application.dto.request.RefreshTokenRequest;
import com.banco.ddd.application.dto.response.AuthResponse;
import com.banco.ddd.application.dto.response.UsuarioInfoResponse;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Puerto de entrada (driving port) para el módulo de autenticación.
 * Define el contrato del caso de uso de autenticación y autorización.
 *
 * <p>Implementado por {@code AuthService} en la capa de aplicación.</p>
 */
public interface AuthUseCase {

    /**
     * Autentica al usuario con correo y contraseña.
     * Registra el intento en la auditoría y aplica brute-force protection.
     *
     * @param request     credenciales del usuario
     * @param httpRequest request HTTP para extraer IP y User-Agent
     * @return tokens JWT (access + refresh) e información del usuario
     */
    AuthResponse login(LoginRequest request, HttpServletRequest httpRequest);

    /**
     * Rota el refresh token: revoca el actual y emite un nuevo par de tokens.
     * Implementa refresh token rotation para prevenir token replay.
     *
     * @param request contiene el refresh token vigente
     * @return nuevo par de tokens JWT
     */
    AuthResponse refreshToken(RefreshTokenRequest request);

    /**
     * Cierra la sesión del usuario revocando ambos tokens (access + refresh).
     *
     * @param request     contiene el refresh token a revocar
     * @param httpRequest request HTTP para extraer el access token del header
     */
    void logout(LogoutRequest request, HttpServletRequest httpRequest);

    /**
     * Cambia la contraseña del usuario autenticado.
     * Valida la contraseña actual, aplica política de contraseñas y revoca
     * todos los tokens activos (fuerza re-login).
     *
     * @param request     nueva contraseña y confirmación
     * @param httpRequest request HTTP para obtener el usuario autenticado
     */
    void changePassword(ChangePasswordRequest request, HttpServletRequest httpRequest);

    /**
     * Retorna la información del usuario actualmente autenticado.
     *
     * @param httpRequest request HTTP con el token JWT
     * @return datos del perfil del usuario
     */
    UsuarioInfoResponse me(HttpServletRequest httpRequest);
}
