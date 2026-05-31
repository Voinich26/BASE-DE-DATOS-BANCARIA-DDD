package com.banco.ddd.infrastructure.adapter.in.web.controller;

import com.banco.ddd.application.dto.request.ChangePasswordRequest;
import com.banco.ddd.application.dto.request.LoginRequest;
import com.banco.ddd.application.dto.request.LogoutRequest;
import com.banco.ddd.application.dto.request.RefreshTokenRequest;
import com.banco.ddd.application.dto.request.ResetPasswordRequest;
import com.banco.ddd.application.dto.response.AuthResponse;
import com.banco.ddd.application.dto.response.UsuarioInfoResponse;
import com.banco.ddd.application.port.in.AuthUseCase;
import com.banco.ddd.application.service.UsuarioService;
import com.banco.ddd.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * BC-01: Endpoints de autenticación y autorización enterprise.
 *
 * <p>Todos los endpoints de este controlador siguen el patrón:</p>
 * <ul>
 *   <li>Respuesta uniforme {@code ApiResponse<T>}</li>
 *   <li>Validación de entrada con Bean Validation</li>
 *   <li>Logging con MDC para trazabilidad</li>
 *   <li>Documentación OpenAPI completa</li>
 * </ul>
 *
 * <p>Base path: {@code /api/v1/auth}</p>
 */
@Slf4j
@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Tag(
    name        = "Autenticación",
    description = "Gestión de sesiones JWT: login, logout, refresh token, cambio de contraseña"
)
public class AuthController {

    private final AuthUseCase    authUseCase;
    private final UsuarioService usuarioService;

    // ── POST /v1/auth/login ───────────────────────────────────────────────────

    @PostMapping("/login")
    @Operation(
        summary     = "Iniciar sesión",
        description = """
            Autentica al usuario con correo y contraseña.
            
            **Flujo:**
            1. Verifica brute-force protection (máx. 5 intentos en 30 min)
            2. Valida estado de la cuenta (Activo / Bloqueado)
            3. Verifica credenciales BCrypt
            4. Emite access token (24h) y refresh token (7 días)
            5. Registra el intento en la auditoría
            
            **Roles disponibles:** CLIENTE_PERSONA, CLIENTE_EMPRESA, EMPLEADO_VENTANILLA,
            ANALISTA_INTERNO, SUPERVISOR_EMPRESA, ADMINISTRADOR
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description  = "Login exitoso — retorna par de tokens JWT",
            content      = @Content(
                mediaType = "application/json",
                examples  = @ExampleObject(value = """
                    {
                      "success": true,
                      "message": "Login exitoso",
                      "data": {
                        "accessToken":  "eyJhbGciOiJIUzI1NiJ9...",
                        "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
                        "tokenType":    "Bearer",
                        "expiresIn":    86400,
                        "idUsuario":    42,
                        "nombreCompleto": "Juan Pérez García",
                        "correoElectronico": "juan.perez@banco.com",
                        "rol": "CLIENTE_PERSONA"
                      },
                      "timestamp": "2026-05-24T10:30:00"
                    }
                    """)
            )
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "401",
            description  = "Credenciales inválidas"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "423",
            description  = "Cuenta bloqueada por exceso de intentos fallidos"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "429",
            description  = "Demasiados intentos desde la misma IP"
        )
    })
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        log.info("Solicitud de login — correo={}", request.getCorreoElectronico());
        AuthResponse response = authUseCase.login(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Login exitoso", response));
    }

    // ── POST /v1/auth/refresh ─────────────────────────────────────────────────

    @PostMapping("/refresh")
    @Operation(
        summary     = "Renovar access token",
        description = """
            Rota el refresh token y emite un nuevo par de tokens JWT.
            
            **Refresh Token Rotation:** el refresh token actual se revoca y se emite
            uno nuevo. Si se detecta reutilización de un refresh token ya revocado,
            se invalidan TODOS los tokens del usuario (posible token replay attack).
            
            **Importante:** guardar el nuevo refresh token recibido en la respuesta.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description  = "Tokens renovados exitosamente"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "401",
            description  = "Refresh token inválido, expirado o revocado"
        )
    })
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {

        log.debug("Solicitud de refresh token");
        AuthResponse response = authUseCase.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.ok("Token renovado exitosamente", response));
    }

    // ── POST /v1/auth/logout ──────────────────────────────────────────────────

    @PostMapping("/logout")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Cerrar sesión",
        description = """
            Revoca el access token y el refresh token del usuario.
            
            **Logout seguro:** ambos tokens se añaden a la blacklist (tabla `token_revocado`).
            Cualquier intento posterior de usar esos tokens será rechazado.
            
            **Requiere:** header `Authorization: Bearer <accessToken>`
            **Body:** `{ "refreshToken": "<refreshToken>" }`
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description  = "Sesión cerrada exitosamente"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "401",
            description  = "No autenticado"
        )
    })
    public ResponseEntity<ApiResponse<Void>> logout(
            @Valid @RequestBody LogoutRequest request,
            HttpServletRequest httpRequest) {

        log.info("Solicitud de logout");
        authUseCase.logout(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Sesión cerrada exitosamente", null));
    }

    // ── POST /v1/auth/change-password ─────────────────────────────────────────

    @PostMapping("/change-password")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Cambiar contraseña",
        description = """
            Cambia la contraseña del usuario autenticado.
            
            **Política de contraseñas bancaria:**
            - Mínimo 8 caracteres, máximo 72
            - Al menos 1 letra mayúscula
            - Al menos 1 letra minúscula
            - Al menos 1 dígito
            - Al menos 1 carácter especial (!@#$%^&*...)
            - No puede ser igual a la contraseña actual
            
            **Efecto de seguridad:** revoca TODOS los tokens activos del usuario,
            forzando re-login en todos los dispositivos.
            
            **Requiere:** header `Authorization: Bearer <accessToken>`
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description  = "Contraseña cambiada exitosamente"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "400",
            description  = "Contraseñas no coinciden o no cumplen la política"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "401",
            description  = "Contraseña actual incorrecta o no autenticado"
        )
    })
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {

        log.info("Solicitud de cambio de contraseña");
        authUseCase.changePassword(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(
                "Contraseña actualizada. Por seguridad, inicie sesión nuevamente", null));
    }

    // ── POST /v1/auth/reset-password ──────────────────────────────────────────

    @PostMapping("/reset-password")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SUPERVISOR_EMPRESA')")
    @Operation(
        summary     = "Restablecer contraseña (admin)",
        description = """
            Restablece la contraseña de cualquier usuario del sistema.
            
            **Acceso restringido:** solo ADMINISTRADOR y SUPERVISOR_EMPRESA.
            
            En un entorno de producción real, este flujo incluiría:
            - Verificación OTP por SMS/email
            - Token de reset con expiración corta
            - Notificación al usuario afectado
            
            **Efecto de seguridad:** revoca todos los tokens activos del usuario afectado.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description  = "Contraseña restablecida exitosamente"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "403",
            description  = "Sin permisos para esta operación"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "404",
            description  = "Usuario no encontrado"
        )
    })
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        log.info("Solicitud de reset de contraseña para correo={}",
                request.getCorreoElectronico());

        usuarioService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(
                "Contraseña restablecida exitosamente. El usuario debe iniciar sesión nuevamente",
                null));
    }

    // ── GET /v1/auth/me ───────────────────────────────────────────────────────

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Perfil del usuario autenticado",
        description = """
            Retorna la información del usuario actualmente autenticado.
            
            Útil para que el frontend obtenga el perfil completo después del login
            sin necesidad de decodificar el JWT en el cliente.
            
            **Requiere:** header `Authorization: Bearer <accessToken>`
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description  = "Perfil del usuario",
            content      = @Content(
                mediaType = "application/json",
                schema    = @Schema(implementation = UsuarioInfoResponse.class),
                examples  = @ExampleObject(value = """
                    {
                      "success": true,
                      "message": "OK",
                      "data": {
                        "idUsuario": 42,
                        "nombreCompleto": "Juan Pérez García",
                        "correoElectronico": "juan.perez@banco.com",
                        "idIdentificacion": "1234567890",
                        "telefono": "+57 300 123 4567",
                        "fechaNacimiento": "1990-05-15",
                        "rol": "CLIENTE_PERSONA",
                        "estadoUsuario": "Activo",
                        "fechaCreacion": "2026-01-15T09:00:00"
                      },
                      "timestamp": "2026-05-24T10:35:00"
                    }
                    """)
            )
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "401",
            description  = "No autenticado"
        )
    })
    public ResponseEntity<ApiResponse<UsuarioInfoResponse>> me(HttpServletRequest httpRequest) {
        UsuarioInfoResponse response = authUseCase.me(httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
