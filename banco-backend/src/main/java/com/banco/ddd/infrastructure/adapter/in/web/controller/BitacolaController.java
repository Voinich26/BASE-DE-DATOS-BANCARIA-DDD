package com.banco.ddd.infrastructure.adapter.in.web.controller;

import com.banco.ddd.application.dto.response.BitacolaResponse;
import com.banco.ddd.application.service.BitacolaService;
import com.banco.ddd.shared.response.ApiResponse;
import com.banco.ddd.shared.response.PagedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * BC-06: Consulta de bitácora de auditoría (solo lectura).
 */
@RestController
@RequestMapping("/v1/bitacola")
@RequiredArgsConstructor
@Tag(name = "Bitácora", description = "BC-06: Auditoría de operaciones del sistema")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ANALISTA_INTERNO','ADMINISTRADOR')")
public class BitacolaController {

    private final BitacolaService bitacolaService;

    @GetMapping
    @Operation(summary = "Listar toda la bitácora")
    public ResponseEntity<ApiResponse<PagedResponse<BitacolaResponse>>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("fechaHoraOperacion").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                new PagedResponse<>(bitacolaService.listarBitacola(pageable))));
    }

    @GetMapping("/usuario/{idUsuario}")
    @Operation(summary = "Bitácora por usuario")
    public ResponseEntity<ApiResponse<PagedResponse<BitacolaResponse>>> porUsuario(
            @PathVariable Long idUsuario,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("fechaHoraOperacion").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                new PagedResponse<>(bitacolaService.bitacolaPorUsuario(idUsuario, pageable))));
    }

    @GetMapping("/operacion/{tipoOperacion}")
    @Operation(summary = "Bitácora por tipo de operación")
    public ResponseEntity<ApiResponse<PagedResponse<BitacolaResponse>>> porOperacion(
            @PathVariable String tipoOperacion,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("fechaHoraOperacion").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                new PagedResponse<>(bitacolaService.bitacolaPorTipoOperacion(tipoOperacion, pageable))));
    }

    @GetMapping("/producto/{idProducto}")
    @Operation(summary = "Bitácora por producto afectado")
    public ResponseEntity<ApiResponse<PagedResponse<BitacolaResponse>>> porProducto(
            @PathVariable String idProducto,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("fechaHoraOperacion").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                new PagedResponse<>(bitacolaService.bitacolaPorProducto(idProducto, pageable))));
    }

    @GetMapping("/rango")
    @Operation(summary = "Bitácora por rango de fechas")
    public ResponseEntity<ApiResponse<PagedResponse<BitacolaResponse>>> porRango(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("fechaHoraOperacion").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                new PagedResponse<>(bitacolaService.bitacolaPorRango(desde, hasta, pageable))));
    }
}
