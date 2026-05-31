package com.banco.ddd.infrastructure.adapter.in.web.controller;

import com.banco.ddd.application.dto.request.CrearTransferenciaRequest;
import com.banco.ddd.application.dto.request.RechazarTransferenciaRequest;
import com.banco.ddd.application.dto.response.*;
import com.banco.ddd.application.port.in.TransferenciaUseCase;
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
 * BC-05: Gestión del ciclo de vida de transferencias bancarias — API REST enterprise.
 *
 * <p>Base path: {@code /api/v1/transfers}</p>
 *
 * <p>Seguridad por rol:</p>
 * <ul>
 *   <li>CLIENTE — solo sus propias cuentas (ownership)</li>
 *   <li>EMPLEADO_VENTANILLA — crear transferencias</li>
 *   <li>SUPERVISOR_EMPRESA — aprobar/rechazar</li>
 *   <li>ANALISTA_INTERNO — consultas globales, métricas</li>
 *   <li>ADMINISTRADOR — acceso total</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/v1/transfers")
@RequiredArgsConstructor
@Tag(
    name        = "Transferencias",
    description = "BC-05: Creación, aprobación, rechazo y trazabilidad de transferencias bancarias"
)
@SecurityRequirement(name = "bearerAuth")
public class TransferenciaController {

    private final TransferenciaUseCase transferenciaUseCase;

    // ── POST /v1/transfers ────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Crear transferencia",
        description = """
            Crea una transferencia entre cuentas bancarias.

            **Flujo automático:**
            - El trigger `TRG-09` asigna `fecha_vencimiento` (+60 min)
            - Si el monto supera el umbral configurado → estado `En Espera de Aprobacion`
            - Si no supera el umbral → estado `Pendiente` → se ejecuta automáticamente

            **Validaciones previas al SP:**
            - Ownership: el caller debe ser dueño de la cuenta origen
            - Cuenta origen activa y con saldo suficiente
            - Cuenta destino existente
            - Prevención de duplicados (ventana de 60 segundos)
            - Origen ≠ Destino
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "201", description = "Transferencia creada",
            content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = """
                    {
                      "success": true,
                      "message": "Transferencia creada",
                      "data": {
                        "idTransferencia": 42,
                        "cuentaOrigen": "001-123456789-0",
                        "cuentaDestino": "001-987654321-0",
                        "monto": 500000.00,
                        "estadoTransferencia": "Ejecutada",
                        "requiereAprobacion": false,
                        "nombreUsuarioCreador": "Juan Pérez",
                        "fechaCreacion": "2026-05-24T10:30:00",
                        "fechaVencimiento": "2026-05-24T11:30:00",
                        "saldoOrigenAntes": 2000000.00,
                        "saldoOrigenDespues": 1500000.00,
                        "estadoFinal": true
                      }
                    }
                    """))
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Datos inválidos"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "No es dueño de la cuenta origen"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Saldo insuficiente, cuenta inactiva o duplicado detectado")
    })
    public ResponseEntity<ApiResponse<TransferenciaDetalleResponse>> crear(
            @Valid @RequestBody CrearTransferenciaRequest request,
            @AuthenticationPrincipal UserDetails caller) {

        MDC.put("operacion", "POST /v1/transfers");
        try {
            log.info("Crear transferencia — origen={} destino={} monto={}",
                    request.getCuentaOrigen(), request.getCuentaDestino(), request.getMonto());
            TransferenciaDetalleResponse response =
                    transferenciaUseCase.crearTransferencia(request, caller);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.created("Transferencia creada", response));
        } finally {
            MDC.remove("operacion");
        }
    }

    // ── GET /v1/transfers/{id} ────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Obtener transferencia por ID",
        description = """
            Retorna el detalle completo de una transferencia.

            **Ownership:** los clientes solo pueden ver transferencias de sus cuentas.
            Los roles administrativos pueden ver cualquier transferencia.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Transferencia encontrada"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Sin permisos"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "No encontrada")
    })
    public ResponseEntity<ApiResponse<TransferenciaDetalleResponse>> obtener(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails caller) {

        return ResponseEntity.ok(ApiResponse.ok(
                transferenciaUseCase.obtenerDetalle(id, caller)));
    }

    // ── GET /v1/transfers/history ─────────────────────────────────────────────

    @GetMapping("/history")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Historial de transferencias con filtros",
        description = """
            Lista paginada de transferencias con filtros opcionales.

            **Filtros disponibles:** estado, cuentaOrigen, cuentaDestino

            **Ownership:** los clientes solo ven sus propias cuentas.
            """
    )
    public ResponseEntity<ApiResponse<PagedResponse<TransferenciaResponse>>> historial(
            @Parameter(description = "Filtrar por estado")        @RequestParam(required = false) String estado,
            @Parameter(description = "Filtrar por cuenta origen") @RequestParam(required = false) String cuentaOrigen,
            @Parameter(description = "Filtrar por cuenta destino")@RequestParam(required = false) String cuentaDestino,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "fechaCreacion") String sortBy,
            @RequestParam(defaultValue = "desc")          String sortDir,
            @AuthenticationPrincipal UserDetails caller) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        var pageable = PageRequest.of(page, size, sort);

        return ResponseEntity.ok(ApiResponse.ok(
                transferenciaUseCase.historial(estado, cuentaOrigen, cuentaDestino,
                        pageable, caller)));
    }

    // ── GET /v1/transfers/account/{accountNumber} ─────────────────────────────

    @GetMapping("/account/{accountNumber}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Transferencias de una cuenta",
        description = "Lista todas las transferencias donde la cuenta es origen o destino."
    )
    public ResponseEntity<ApiResponse<PagedResponse<TransferenciaResponse>>> porCuenta(
            @PathVariable String accountNumber,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails caller) {

        var pageable = PageRequest.of(page, size, Sort.by("fechaCreacion").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                transferenciaUseCase.porCuenta(accountNumber, pageable, caller)));
    }

    // ── GET /v1/transfers/pending ─────────────────────────────────────────────

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ANALISTA_INTERNO','ADMINISTRADOR')")
    @Operation(
        summary     = "Transferencias pendientes de aprobación",
        description = """
            Lista todas las transferencias en estado `En Espera de Aprobacion`.

            **Roles permitidos:** SUPERVISOR_EMPRESA, ANALISTA_INTERNO, ADMINISTRADOR

            Ordenadas por fecha de creación ascendente (más antiguas primero).
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200", description = "Lista de pendientes",
            content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = """
                    {
                      "success": true,
                      "message": "OK",
                      "data": {
                        "content": [
                          {
                            "idTransferencia": 15,
                            "cuentaOrigen": "001-111111111-0",
                            "cuentaDestino": "001-222222222-0",
                            "monto": 5000000.00,
                            "estadoTransferencia": "En Espera de Aprobacion",
                            "requiereAprobacion": true,
                            "fechaCreacion": "2026-05-24T09:00:00",
                            "fechaVencimiento": "2026-05-24T10:00:00"
                          }
                        ],
                        "totalElements": 1,
                        "totalPages": 1
                      }
                    }
                    """))
        )
    })
    public ResponseEntity<ApiResponse<PagedResponse<TransferenciaResponse>>> pendientes(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        var pageable = PageRequest.of(page, size, Sort.by("fechaCreacion").ascending());
        return ResponseEntity.ok(ApiResponse.ok(
                transferenciaUseCase.pendientesAprobacion(pageable)));
    }

    // ── POST /v1/transfers/{id}/approve ───────────────────────────────────────

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    @Operation(
        summary     = "Aprobar transferencia",
        description = """
            Aprueba una transferencia en espera vía `sp_aprobar_transferencia`.

            **Roles permitidos:** SUPERVISOR_EMPRESA, ADMINISTRADOR

            El SP valida que la transferencia no haya vencido y ejecuta el movimiento
            de saldos si la aprobación es exitosa.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Transferencia aprobada y ejecutada"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Estado inválido o transferencia vencida")
    })
    public ResponseEntity<ApiResponse<TransferenciaDetalleResponse>> aprobar(
            @PathVariable Long id,
            @RequestParam Long idSupervisor) {

        log.info("Aprobar transferencia id={} por supervisor id={}", id, idSupervisor);
        TransferenciaDetalleResponse response =
                transferenciaUseCase.aprobarTransferencia(id, idSupervisor);
        return ResponseEntity.ok(ApiResponse.ok("Transferencia aprobada y ejecutada", response));
    }

    // ── POST /v1/transfers/{id}/reject ────────────────────────────────────────

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    @Operation(
        summary     = "Rechazar transferencia",
        description = """
            Rechaza una transferencia en espera vía `sp_rechazar_transferencia`.

            **Roles permitidos:** SUPERVISOR_EMPRESA, ADMINISTRADOR

            El motivo queda registrado en la bitácora y en el historial de transiciones.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Transferencia rechazada"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Estado inválido")
    })
    public ResponseEntity<ApiResponse<TransferenciaDetalleResponse>> rechazar(
            @PathVariable Long id,
            @Valid @RequestBody RechazarTransferenciaRequest request) {

        log.info("Rechazar transferencia id={} por supervisor id={}",
                id, request.getIdSupervisor());
        TransferenciaDetalleResponse response =
                transferenciaUseCase.rechazarTransferencia(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Transferencia rechazada", response));
    }

    // ── GET /v1/transfers/dashboard ───────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Dashboard transaccional del usuario",
        description = """
            Retorna el dashboard transaccional consolidado del usuario autenticado.

            Incluye:
            - Métricas de transferencias enviadas/recibidas
            - Conteo por estado (pendientes, en espera, ejecutadas, rechazadas, vencidas)
            - Montos totales enviados y recibidos
            - Monto en espera de aprobación
            - Últimas 10 transferencias
            """
    )
    public ResponseEntity<ApiResponse<TransferenciaDashboardResponse>> dashboard(
            @AuthenticationPrincipal UserDetails caller) {

        log.debug("Dashboard transferencias solicitado por usuario={}", caller.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(
                transferenciaUseCase.obtenerDashboard(caller)));
    }

    // ── GET /v1/transfers/{id}/timeline ───────────────────────────────────────

    @GetMapping("/{id}/timeline")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Timeline de estados de una transferencia",
        description = """
            Retorna el historial completo de transiciones de estado de una transferencia.

            Cada entrada muestra:
            - Estado anterior → Estado nuevo
            - Fecha y hora de la transición
            - Usuario que realizó la acción (o "Sistema" para automáticas)
            - Motivo (si aplica)

            **Ownership:** los clientes solo pueden ver sus propias transferencias.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200", description = "Timeline obtenido",
            content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = """
                    {
                      "success": true,
                      "data": {
                        "idTransferencia": 42,
                        "estadoActual": "Ejecutada",
                        "estadoFinal": true,
                        "vencida": false,
                        "transiciones": [
                          {
                            "estadoAnterior": "INICIO",
                            "estadoNuevo": "Pendiente",
                            "fechaTransicion": "2026-05-24T10:30:00",
                            "nombreUsuario": "Sistema",
                            "motivo": null
                          },
                          {
                            "estadoAnterior": "Pendiente",
                            "estadoNuevo": "Ejecutada",
                            "fechaTransicion": "2026-05-24T10:30:01",
                            "nombreUsuario": "Sistema",
                            "motivo": null
                          }
                        ]
                      }
                    }
                    """))
        )
    })
    public ResponseEntity<ApiResponse<TransferenciaTimelineResponse>> timeline(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails caller) {

        return ResponseEntity.ok(ApiResponse.ok(
                transferenciaUseCase.obtenerTimeline(id, caller)));
    }

    // ── GET /v1/transfers/metrics ─────────────────────────────────────────────

    @GetMapping("/metrics")
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    @Operation(
        summary     = "Métricas operativas del módulo de transferencias",
        description = """
            Retorna métricas operativas globales del sistema de transferencias.

            **Roles permitidos:** ANALISTA_INTERNO, SUPERVISOR_EMPRESA, ADMINISTRADOR

            Incluye:
            - Distribución por estado
            - Montos totales, promedio, máximo y mínimo
            - Tasas de éxito y rechazo
            - Transferencias pendientes y vencidas
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
                        "totalTransferencias": 250,
                        "distribucionPorEstado": {
                          "Ejecutada": 200,
                          "Pendiente": 5,
                          "En Espera de Aprobacion": 3,
                          "Rechazada": 30,
                          "Vencida": 12
                        },
                        "montoTotalProcesado": 125000000.00,
                        "montoPromedio": 625000.00,
                        "montoMaximo": 10000000.00,
                        "montoMinimo": 1000.00,
                        "pendientesEjecucion": 5,
                        "enEsperaAprobacion": 3,
                        "vencidas": 12,
                        "tasaExito": 80.0,
                        "tasaRechazo": 12.0,
                        "generadoEn": "2026-05-24T10:30:00"
                      }
                    }
                    """))
        )
    })
    public ResponseEntity<ApiResponse<TransferenciaMetricasResponse>> metricas() {
        log.debug("Métricas de transferencias solicitadas");
        return ResponseEntity.ok(ApiResponse.ok(transferenciaUseCase.obtenerMetricas()));
    }
}
