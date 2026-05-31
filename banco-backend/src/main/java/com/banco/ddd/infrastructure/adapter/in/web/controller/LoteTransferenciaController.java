package com.banco.ddd.infrastructure.adapter.in.web.controller;

import com.banco.ddd.application.dto.request.CrearLoteTransferenciaRequest;
import com.banco.ddd.application.dto.request.ProcesarLoteRequest;
import com.banco.ddd.application.dto.request.RechazarLoteRequest;
import com.banco.ddd.application.dto.response.*;
import com.banco.ddd.application.port.in.LoteTransferenciaUseCase;
import com.banco.ddd.shared.response.ApiResponse;
import com.banco.ddd.shared.response.PagedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * BC-06: Pagos Masivos y Nómina Empresarial — API REST enterprise.
 *
 * <p>Base path: {@code /api/v1/batches}</p>
 *
 * <p>Seguridad por rol:</p>
 * <ul>
 *   <li>CLIENTE_EMPRESA — crear lotes y ver sus propios lotes (ownership)</li>
 *   <li>SUPERVISOR_EMPRESA — procesar y rechazar lotes, ver todos</li>
 *   <li>ANALISTA_INTERNO — consultas globales y métricas</li>
 *   <li>ADMINISTRADOR — acceso total</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/v1/batches")
@RequiredArgsConstructor
@Tag(
    name        = "Pagos Masivos",
    description = "BC-06: Creación, procesamiento y trazabilidad de lotes de pagos masivos y nómina empresarial"
)
@SecurityRequirement(name = "bearerAuth")
public class LoteTransferenciaController {

    private final LoteTransferenciaUseCase loteUseCase;

    // ── POST /v1/batches ──────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('CLIENTE_EMPRESA','EMPLEADO_VENTANILLA','SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    @Operation(
        summary     = "Crear lote de pagos masivos",
        description = """
            Crea un nuevo lote de pagos masivos o nómina empresarial.

            **Validaciones previas al SP:**
            - Ownership: el caller debe pertenecer a la empresa indicada
            - Anti-duplicados: no debe existir un lote con el mismo concepto en las últimas 24 horas
            - Todas las cuentas origen deben estar activas
            - Todas las cuentas destino deben existir
            - Origen ≠ Destino en cada ítem
            - Mínimo 1 ítem, máximo 500 ítems

            **SP invocado:** `sp_crear_lote_transferencia`
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "201", description = "Lote creado exitosamente",
            content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = """
                    {
                      "success": true,
                      "message": "Lote de pagos creado exitosamente",
                      "data": {
                        "idLote": 12,
                        "nitEmpresa": "900123456-1",
                        "razonSocialEmpresa": "Empresa ABC S.A.S.",
                        "concepto": "Nómina Mayo 2026",
                        "estadoLote": "Pendiente",
                        "estadoFinal": false,
                        "totalItems": 3,
                        "montoTotal": 4500000.00,
                        "fechaCreacion": "2026-05-24T10:00:00"
                      }
                    }
                    """))
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Datos inválidos"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "No pertenece a la empresa"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Duplicado, cuenta inactiva o saldo insuficiente")
    })
    public ResponseEntity<ApiResponse<LoteTransferenciaDetalleResponse>> crear(
            @Valid @RequestBody CrearLoteTransferenciaRequest request,
            @AuthenticationPrincipal UserDetails caller) {

        MDC.put("operacion", "POST /v1/batches");
        try {
            log.info("Crear lote — empresa={} concepto={} items={}",
                    request.getNitEmpresa(), request.getConcepto(),
                    request.getTransferencias() != null ? request.getTransferencias().size() : 0);
            LoteTransferenciaDetalleResponse response = loteUseCase.crearLote(request, caller);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.created("Lote de pagos creado exitosamente", response));
        } finally {
            MDC.remove("operacion");
        }
    }

    // ── GET /v1/batches ───────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Historial de lotes con filtros",
        description = """
            Lista paginada de lotes con filtros opcionales.

            **Ownership:** las empresas solo ven sus propios lotes.
            Los roles administrativos pueden ver todos los lotes.

            **Filtros disponibles:** estado, nitEmpresa (solo admin/supervisor)
            """
    )
    public ResponseEntity<ApiResponse<PagedResponse<LoteTransferenciaResponse>>> historial(
            @Parameter(description = "Filtrar por estado del lote")
            @RequestParam(required = false) String estado,
            @Parameter(description = "Filtrar por NIT de empresa (solo admin/supervisor)")
            @RequestParam(required = false) String nitEmpresa,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "fechaCreacion") String sortBy,
            @RequestParam(defaultValue = "desc")          String sortDir,
            @AuthenticationPrincipal UserDetails caller) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        var pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(ApiResponse.ok(
                loteUseCase.historial(estado, nitEmpresa, pageable, caller)));
    }

    // ── GET /v1/batches/{id} ──────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Obtener lote por ID",
        description = """
            Retorna el detalle completo de un lote con todos sus ítems.

            **Ownership:** las empresas solo pueden ver sus propios lotes.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lote encontrado"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Sin permisos"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Lote no encontrado")
    })
    public ResponseEntity<ApiResponse<LoteTransferenciaDetalleResponse>> obtener(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails caller) {

        return ResponseEntity.ok(ApiResponse.ok(loteUseCase.obtenerDetalle(id, caller)));
    }

    // ── GET /v1/batches/{id}/details ──────────────────────────────────────────

    @GetMapping("/{id}/details")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Ítems paginados de un lote",
        description = "Retorna los ítems (transferencias individuales) de un lote de forma paginada."
    )
    public ResponseEntity<ApiResponse<PagedResponse<LoteTransferenciaDetalleResponse.DetalleItemResponse>>> detalles(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal UserDetails caller) {

        var pageable = PageRequest.of(page, size, Sort.by("orden").ascending());
        return ResponseEntity.ok(ApiResponse.ok(
                loteUseCase.obtenerDetalles(id, pageable, caller)));
    }

    // ── GET /v1/batches/{id}/timeline ─────────────────────────────────────────

    @GetMapping("/{id}/timeline")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Timeline de eventos de un lote",
        description = """
            Retorna el historial de eventos del lote: creación, aprobación, procesamiento o rechazo.

            **Ownership:** las empresas solo pueden ver sus propios lotes.
            """
    )
    public ResponseEntity<ApiResponse<LoteTimelineResponse>> timeline(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails caller) {

        return ResponseEntity.ok(ApiResponse.ok(loteUseCase.obtenerTimeline(id, caller)));
    }

    // ── GET /v1/batches/dashboard ─────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Dashboard empresarial de pagos masivos",
        description = """
            Retorna el dashboard consolidado de la empresa autenticada.

            Incluye:
            - Conteo de lotes por estado
            - Montos totales históricos y procesados
            - Monto pendiente de procesamiento
            - Tasa de éxito de ítems
            - Últimos 5 lotes
            """
    )
    public ResponseEntity<ApiResponse<LoteDashboardResponse>> dashboard(
            @AuthenticationPrincipal UserDetails caller) {

        log.debug("Dashboard lotes solicitado por usuario={}", caller.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(loteUseCase.obtenerDashboard(caller)));
    }

    // ── GET /v1/batches/metrics ───────────────────────────────────────────────

    @GetMapping("/metrics")
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    @Operation(
        summary     = "Métricas operativas del módulo de pagos masivos",
        description = """
            Retorna métricas operativas globales del sistema de pagos masivos.

            **Roles permitidos:** ANALISTA_INTERNO, SUPERVISOR_EMPRESA, ADMINISTRADOR

            Incluye:
            - Distribución por estado
            - Montos totales, promedio, máximo y mínimo
            - Tasas de éxito y rechazo de lotes e ítems
            - Top 5 empresas por volumen procesado
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200", description = "Métricas generadas",
            content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = """
                    {
                      "success": true,
                      "data": {
                        "totalLotes": 45,
                        "distribucionPorEstado": {
                          "Pendiente": 3,
                          "En Revision": 2,
                          "Aprobado": 1,
                          "Procesado": 35,
                          "Rechazado": 4
                        },
                        "totalItemsProcesados": 1800,
                        "totalItemsFallidos": 50,
                        "montoTotalProcesado": 540000000.00,
                        "tasaExitoLotes": 77.78,
                        "tasaRechazoLotes": 8.89,
                        "tasaExitoItems": 97.30,
                        "generadoEn": "2026-05-24T10:30:00"
                      }
                    }
                    """))
        )
    })
    public ResponseEntity<ApiResponse<LoteMetricasResponse>> metricas() {
        log.debug("Métricas de lotes solicitadas");
        return ResponseEntity.ok(ApiResponse.ok(loteUseCase.obtenerMetricas()));
    }

    // ── POST /v1/batches/{id}/process ─────────────────────────────────────────

    @PostMapping("/{id}/process")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    @Operation(
        summary     = "Procesar lote de pagos",
        description = """
            Procesa todos los ítems de un lote aprobado vía `sp_procesar_lote_transferencia`.

            **Roles permitidos:** SUPERVISOR_EMPRESA, ADMINISTRADOR

            El SP itera sobre cada ítem del lote, ejecuta la transferencia correspondiente
            y actualiza los contadores de éxito/fallo. El procesamiento es atómico por ítem
            (un fallo individual no cancela el resto).

            **Estado requerido:** Pendiente o Aprobado
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200", description = "Lote procesado",
            content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = """
                    {
                      "success": true,
                      "message": "Lote procesado exitosamente",
                      "data": {
                        "idLote": 12,
                        "estadoLote": "Procesado",
                        "estadoFinal": true,
                        "totalItems": 3,
                        "itemsExitosos": 3,
                        "itemsFallidos": 0,
                        "montoTotal": 4500000.00,
                        "montoProcesado": 4500000.00,
                        "porcentajeExito": 100.0
                      }
                    }
                    """))
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Estado inválido para procesamiento")
    })
    public ResponseEntity<ApiResponse<LoteTransferenciaDetalleResponse>> procesar(
            @PathVariable Long id,
            @Valid @RequestBody ProcesarLoteRequest request) {

        MDC.put("operacion", "POST /v1/batches/{id}/process");
        try {
            log.info("Procesar lote id={} por supervisor id={}", id, request.getIdSupervisor());
            LoteTransferenciaDetalleResponse response = loteUseCase.procesarLote(id, request);
            return ResponseEntity.ok(ApiResponse.ok("Lote procesado exitosamente", response));
        } finally {
            MDC.remove("operacion");
        }
    }

    // ── POST /v1/batches/{id}/reject ──────────────────────────────────────────

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    @Operation(
        summary     = "Rechazar lote de pagos",
        description = """
            Rechaza un lote que aún no ha sido procesado.

            **Roles permitidos:** SUPERVISOR_EMPRESA, ADMINISTRADOR

            El motivo queda registrado en el lote para trazabilidad.
            Solo se pueden rechazar lotes en estados no finales.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lote rechazado"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Estado inválido para rechazo")
    })
    public ResponseEntity<ApiResponse<LoteTransferenciaDetalleResponse>> rechazar(
            @PathVariable Long id,
            @Valid @RequestBody RechazarLoteRequest request) {

        MDC.put("operacion", "POST /v1/batches/{id}/reject");
        try {
            log.info("Rechazar lote id={} por supervisor id={} motivo={}",
                    id, request.getIdSupervisor(), request.getMotivo());
            LoteTransferenciaDetalleResponse response = loteUseCase.rechazarLote(id, request);
            return ResponseEntity.ok(ApiResponse.ok("Lote rechazado", response));
        } finally {
            MDC.remove("operacion");
        }
    }
}
