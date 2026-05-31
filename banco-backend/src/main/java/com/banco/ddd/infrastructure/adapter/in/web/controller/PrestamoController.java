package com.banco.ddd.infrastructure.adapter.in.web.controller;

import com.banco.ddd.application.dto.request.AprobarPrestamoRequest;
import com.banco.ddd.application.dto.request.DesembolsarPrestamoRequest;
import com.banco.ddd.application.dto.request.RechazarPrestamoRequest;
import com.banco.ddd.application.dto.request.SolicitarPrestamoRequest;
import com.banco.ddd.application.dto.response.PrestamoDetalleResponse;
import com.banco.ddd.application.dto.response.PrestamoResponse;
import com.banco.ddd.application.service.PrestamoService;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * BC-04: Gestión del ciclo de vida de préstamos.
 * Base path: /api/v1/prestamos
 */
@RestController
@RequestMapping("/v1/prestamos")
@RequiredArgsConstructor
@Tag(name = "Préstamos", description = "BC-04: Solicitud, aprobación y desembolso de préstamos")
@SecurityRequirement(name = "bearerAuth")
public class PrestamoController {

    private final PrestamoService prestamoService;

    // ── GET /v1/prestamos ─────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar préstamos (filtrado por rol automáticamente)")
    public ResponseEntity<ApiResponse<PagedResponse<PrestamoResponse>>> listar(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails caller) {

        var pageable = PageRequest.of(page, size, Sort.by("fechaSolicitud").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                prestamoService.historial(null, null, null, pageable, caller)));
    }

    // ── GET /v1/prestamos/{id} ────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtener préstamo por ID")
    public ResponseEntity<ApiResponse<PrestamoDetalleResponse>> obtener(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails caller) {

        return ResponseEntity.ok(ApiResponse.ok(prestamoService.obtenerDetalle(id, caller)));
    }

    // ── GET /v1/prestamos/cliente/{idCliente} ─────────────────────────────────

    @GetMapping("/cliente/{idCliente}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Préstamos de un cliente")
    public ResponseEntity<ApiResponse<List<PrestamoResponse>>> porCliente(
            @PathVariable String idCliente,
            @AuthenticationPrincipal UserDetails caller) {

        return ResponseEntity.ok(ApiResponse.ok(
                prestamoService.prestamosPorCliente(idCliente, caller)));
    }

    // ── GET /v1/prestamos/estado/{estado} ─────────────────────────────────────

    @GetMapping("/estado/{estado}")
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    @Operation(summary = "Préstamos por estado (solo roles administrativos)")
    public ResponseEntity<ApiResponse<PagedResponse<PrestamoResponse>>> porEstado(
            @PathVariable String estado,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails caller) {

        var pageable = PageRequest.of(page, size, Sort.by("fechaSolicitud").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                prestamoService.historial(estado, null, null, pageable, caller)));
    }

    // ── POST /v1/prestamos ────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('CLIENTE_PERSONA_NATURAL','CLIENTE_EMPRESA','EMPLEADO_COMERCIAL'," +
                              "'CLIENTE_PERSONA','ADMINISTRADOR')")
    @Operation(summary = "Solicitar préstamo (vía SP sp_solicitar_prestamo)")
    public ResponseEntity<ApiResponse<PrestamoDetalleResponse>> solicitar(
            @Valid @RequestBody SolicitarPrestamoRequest request,
            @AuthenticationPrincipal UserDetails caller) {

        PrestamoDetalleResponse response = prestamoService.solicitarPrestamo(request, caller);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Solicitud de préstamo registrada", response));
    }

    // ── POST /v1/prestamos/{id}/aprobar ───────────────────────────────────────

    @PostMapping("/{id}/aprobar")
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','ADMINISTRADOR')")
    @Operation(summary = "Aprobar préstamo (Analista Interno o Administrador)")
    public ResponseEntity<ApiResponse<PrestamoDetalleResponse>> aprobar(
            @PathVariable Long id,
            @Valid @RequestBody AprobarPrestamoRequest request) {

        return ResponseEntity.ok(ApiResponse.ok("Préstamo aprobado",
                prestamoService.aprobarPrestamo(id, request)));
    }

    // ── POST /v1/prestamos/{id}/rechazar ──────────────────────────────────────

    @PostMapping("/{id}/rechazar")
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','ADMINISTRADOR')")
    @Operation(summary = "Rechazar préstamo (Analista Interno o Administrador)")
    public ResponseEntity<ApiResponse<PrestamoDetalleResponse>> rechazar(
            @PathVariable Long id,
            @Valid @RequestBody RechazarPrestamoRequest request) {

        return ResponseEntity.ok(ApiResponse.ok("Préstamo rechazado",
                prestamoService.rechazarPrestamo(id, request)));
    }

    // ── POST /v1/prestamos/{id}/desembolsar ───────────────────────────────────

    @PostMapping("/{id}/desembolsar")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    @Operation(summary = "Desembolsar préstamo aprobado (Supervisor o Administrador)")
    public ResponseEntity<ApiResponse<PrestamoDetalleResponse>> desembolsar(
            @PathVariable Long id,
            @Valid @RequestBody DesembolsarPrestamoRequest request) {

        return ResponseEntity.ok(ApiResponse.ok("Préstamo desembolsado",
                prestamoService.desembolsarPrestamo(id, request)));
    }
}
