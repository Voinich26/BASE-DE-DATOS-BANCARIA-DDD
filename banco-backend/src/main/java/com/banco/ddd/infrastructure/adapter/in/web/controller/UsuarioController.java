package com.banco.ddd.infrastructure.adapter.in.web.controller;

import com.banco.ddd.application.dto.request.CrearUsuarioRequest;
import com.banco.ddd.application.dto.response.UsuarioResponse;
import com.banco.ddd.application.service.UsuarioService;
import com.banco.ddd.shared.response.ApiResponse;
import com.banco.ddd.shared.response.PagedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * BC-01: CRUD de usuarios del sistema.
 */
@RestController
@RequestMapping("/v1/usuarios")
@RequiredArgsConstructor
@Tag(name = "Usuarios", description = "BC-01: Gestión de usuarios del sistema")
@SecurityRequirement(name = "bearerAuth")
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping
    @Operation(summary = "Listar todos los usuarios")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ANALISTA_INTERNO','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse<PagedResponse<UsuarioResponse>>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        var pageable = PageRequest.of(page, size, Sort.by("fechaCreacion").descending());
        var result   = new PagedResponse<>(usuarioService.listarUsuarios(pageable));
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener usuario por ID")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UsuarioResponse>> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(usuarioService.obtenerPorId(id)));
    }

    @PostMapping
    @Operation(summary = "Crear nuevo usuario (vía SP sp_crear_usuario)")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ANALISTA_INTERNO','EMPLEADO_VENTANILLA','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse<UsuarioResponse>> crear(
            @Valid @RequestBody CrearUsuarioRequest request) {
        UsuarioResponse response = usuarioService.crearUsuario(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Usuario creado exitosamente", response));
    }

    @PatchMapping("/{id}/estado")
    @Operation(summary = "Cambiar estado de usuario (Activo/Inactivo/Bloqueado)")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ANALISTA_INTERNO','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse<Void>> cambiarEstado(
            @PathVariable Long id,
            @RequestParam String nuevoEstado,
            @RequestParam(required = false, defaultValue = "") String motivo) {
        usuarioService.cambiarEstado(id, nuevoEstado, motivo);
        return ResponseEntity.ok(ApiResponse.ok("Estado actualizado", null));
    }

    @PatchMapping("/{id}/rol")
    @Operation(summary = "Asignar rol a usuario")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse<Void>> asignarRol(
            @PathVariable Long id,
            @RequestParam String nombreRol) {
        usuarioService.asignarRol(id, nombreRol);
        return ResponseEntity.ok(ApiResponse.ok("Rol asignado", null));
    }
}
