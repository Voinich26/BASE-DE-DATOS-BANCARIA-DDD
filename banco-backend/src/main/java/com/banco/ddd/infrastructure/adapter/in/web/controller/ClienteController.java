package com.banco.ddd.infrastructure.adapter.in.web.controller;

import com.banco.ddd.application.dto.request.CrearClienteEmpresaRequest;
import com.banco.ddd.application.dto.request.CrearClientePersonaRequest;
import com.banco.ddd.application.dto.response.ClienteEmpresaResponse;
import com.banco.ddd.application.dto.response.ClientePersonaResponse;
import com.banco.ddd.application.service.ClienteService;
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
 * BC-02: Gestión de clientes (personas naturales y empresas).
 */
@RestController
@RequestMapping("/v1/clientes")
@RequiredArgsConstructor
@Tag(name = "Clientes", description = "BC-02: Gestión de clientes personas naturales y empresas")
@SecurityRequirement(name = "bearerAuth")
public class ClienteController {

    private final ClienteService clienteService;

    // ── Persona Natural ──────────────────────────────────────────────────────

    @GetMapping("/personas")
    @Operation(summary = "Listar clientes persona natural")
    public ResponseEntity<ApiResponse<PagedResponse<ClientePersonaResponse>>> listarPersonas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("fechaRegistro").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                new PagedResponse<>(clienteService.listarPersonas(pageable))));
    }

    @GetMapping("/personas/{id}")
    @Operation(summary = "Obtener cliente persona natural por identificación")
    public ResponseEntity<ApiResponse<ClientePersonaResponse>> obtenerPersona(
            @PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(clienteService.obtenerPersona(id)));
    }

    @PostMapping("/personas")
    @Operation(summary = "Registrar cliente persona natural (vía SP sp_crear_cliente_persona)")
    @PreAuthorize("hasAnyRole('EMPLEADO_VENTANILLA','EMPLEADO_COMERCIAL','ANALISTA_INTERNO')")
    public ResponseEntity<ApiResponse<ClientePersonaResponse>> crearPersona(
            @Valid @RequestBody CrearClientePersonaRequest request) {
        ClientePersonaResponse response = clienteService.crearPersona(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Cliente persona natural registrado", response));
    }

    @PutMapping("/personas/{id}")
    @Operation(summary = "Actualizar datos de contacto de persona natural")
    public ResponseEntity<ApiResponse<ClientePersonaResponse>> actualizarPersona(
            @PathVariable String id,
            @RequestParam(required = false) String correo,
            @RequestParam(required = false) String telefono,
            @RequestParam(required = false) String direccion) {
        return ResponseEntity.ok(ApiResponse.ok(
                clienteService.actualizarPersona(id, correo, telefono, direccion)));
    }

    // ── Empresa ──────────────────────────────────────────────────────────────

    @GetMapping("/empresas")
    @Operation(summary = "Listar clientes empresa")
    public ResponseEntity<ApiResponse<PagedResponse<ClienteEmpresaResponse>>> listarEmpresas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("fechaRegistro").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                new PagedResponse<>(clienteService.listarEmpresas(pageable))));
    }

    @GetMapping("/empresas/{nit}")
    @Operation(summary = "Obtener empresa por NIT")
    public ResponseEntity<ApiResponse<ClienteEmpresaResponse>> obtenerEmpresa(
            @PathVariable String nit) {
        return ResponseEntity.ok(ApiResponse.ok(clienteService.obtenerEmpresa(nit)));
    }

    @PostMapping("/empresas")
    @Operation(summary = "Registrar empresa cliente (vía SP sp_crear_cliente_empresa)")
    @PreAuthorize("hasAnyRole('EMPLEADO_COMERCIAL','ANALISTA_INTERNO')")
    public ResponseEntity<ApiResponse<ClienteEmpresaResponse>> crearEmpresa(
            @Valid @RequestBody CrearClienteEmpresaRequest request) {
        ClienteEmpresaResponse response = clienteService.crearEmpresa(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Empresa cliente registrada", response));
    }

    @PutMapping("/empresas/{nit}")
    @Operation(summary = "Actualizar datos de contacto de empresa")
    public ResponseEntity<ApiResponse<ClienteEmpresaResponse>> actualizarEmpresa(
            @PathVariable String nit,
            @RequestParam(required = false) String correo,
            @RequestParam(required = false) String telefono,
            @RequestParam(required = false) String direccion) {
        return ResponseEntity.ok(ApiResponse.ok(
                clienteService.actualizarEmpresa(nit, correo, telefono, direccion)));
    }

    // ── Bloqueo ───────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/bloquear")
    @Operation(summary = "Bloquear cliente (persona o empresa)")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ANALISTA_INTERNO')")
    public ResponseEntity<ApiResponse<Void>> bloquear(
            @PathVariable String id,
            @RequestParam String tipoCliente,
            @RequestParam(required = false, defaultValue = "") String motivo) {
        clienteService.bloquearCliente(id, tipoCliente, motivo);
        return ResponseEntity.ok(ApiResponse.ok("Cliente bloqueado", null));
    }
}
