package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Respuesta del endpoint GET /auth/me.
 * Expone el perfil del usuario autenticado sin datos sensibles.
 */
@Getter
@Builder
@Schema(description = "Información del usuario autenticado")
public class UsuarioInfoResponse {

    @Schema(description = "ID interno del usuario", example = "42")
    private Long idUsuario;

    @Schema(description = "Nombre completo", example = "Juan Pérez García")
    private String nombreCompleto;

    @Schema(description = "Correo electrónico (username)", example = "juan.perez@banco.com")
    private String correoElectronico;

    @Schema(description = "Número de identificación", example = "1234567890")
    private String idIdentificacion;

    @Schema(description = "Teléfono de contacto", example = "+57 300 123 4567")
    private String telefono;

    @Schema(description = "Fecha de nacimiento", example = "1990-05-15")
    private LocalDate fechaNacimiento;

    @Schema(description = "Dirección registrada", example = "Calle 123 # 45-67, Bogotá")
    private String direccion;

    @Schema(description = "Rol asignado en el sistema", example = "CLIENTE_PERSONA")
    private String rol;

    @Schema(description = "Estado actual de la cuenta", example = "Activo")
    private String estadoUsuario;

    @Schema(description = "Fecha de creación de la cuenta")
    private LocalDateTime fechaCreacion;

    @Schema(description = "Fecha de última modificación")
    private LocalDateTime fechaModificacion;
}
