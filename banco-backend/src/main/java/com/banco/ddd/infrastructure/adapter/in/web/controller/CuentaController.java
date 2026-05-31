package com.banco.ddd.infrastructure.adapter.in.web.controller;

import com.banco.ddd.application.dto.request.BloquearCuentaRequest;
import com.banco.ddd.application.dto.request.CrearCuentaRequest;
import com.banco.ddd.application.dto.request.OperacionCajaRequest;
import com.banco.ddd.application.dto.response.CuentaBancariaResponse;
import com.banco.ddd.application.dto.response.CuentaDetalleResponse;
import com.banco.ddd.application.dto.response.CuentaResumenResponse;
import com.banco.ddd.application.dto.response.DashboardFinancieroResponse;
import com.banco.ddd.application.port.in.CuentaUseCase;
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
 * BC-03: Gestión de cuentas bancarias — API REST enterprise.
 *
 * <p>Base path: {@code /api/v1/accounts}</p>
 *
 * <p>Seguridad por rol:</p>
 * <ul>
 *   <li>CLIENTE_PERSONA / CLIENTE_EMPRESA — solo sus propias cuentas</li>
 *   <li>EMPLEADO_VENTANILLA — depósitos y retiros</li>
 *   <li>ANALISTA_INTERNO — apertura, cancelación, consultas</li>
 *   <li>SUPERVISOR_EMPRESA — bloqueo, reactivación, consultas globales</li>
 *   <li>ADMINISTRADOR — acceso total</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/v1/accounts")
@RequiredArgsConstructor
@Tag(
    name        = "Cuentas Bancarias",
    description = "BC-03: Apertura, consulta, operaciones de caja y gestión del ciclo de vida de cuentas"
)
@SecurityRequirement(name = "bearerAuth")
public class CuentaController {

    private final CuentaUseCase cuentaUseCase;

    // ── POST /v1/accounts ─────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('EMPLEADO_VENTANILLA','ANALISTA_INTERNO','ADMINISTRADOR')")
    @Operation(
        summary     = "Apertura de cuenta bancaria",
        description = """
            Abre una nueva cuenta bancaria vía stored procedure `sp_crear_cuenta`.
            
            **Tipos de cuenta disponibles:** Ahorros, Corriente, Nómina, Empresarial
            
            **Tipos de titular:** PERSONA_NATURAL, EMPRESA
            
            **Monedas:** COP (Peso Colombiano), USD (Dólar), EUR (Euro)
            
            **Idempotencia:** si el número de cuenta ya existe, retorna la cuenta existente.
            
            **Roles permitidos:** EMPLEADO_VENTANILLA, ANALISTA_INTERNO, ADMINISTRADOR
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "201", description = "Cuenta creada exitosamente",
            content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = """
                    {
                      "success": true,
                      "message": "Cuenta bancaria abierta",
                      "data": {
                        "numeroCuenta": "001-123456789-0",
                        "tipoCuenta": "Ahorros",
                        "idTitular": "1234567890",
                        "tipoTitular": "PERSONA_NATURAL",
                        "saldoActual": 500000.00,
                        "moneda": "Peso Colombiano",
                        "codigoIsoMoneda": "COP",
                        "estadoCuenta": "Activa",
                        "fechaApertura": "2026-05-24"
                      }
                    }
                    """))
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Datos inválidos"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Error de negocio del SP")
    })
    public ResponseEntity<ApiResponse<CuentaBancariaResponse>> crear(
            @Valid @RequestBody CrearCuentaRequest request) {

        MDC.put("operacion", "POST /v1/accounts");
        try {
            log.info("Apertura de cuenta — numeroCuenta={} titular={}",
                    request.getNumeroCuenta(), request.getIdTitular());
            CuentaBancariaResponse response = cuentaUseCase.crearCuenta(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.created("Cuenta bancaria abierta", response));
        } finally {
            MDC.remove("operacion");
        }
    }

    // ── GET /v1/accounts ──────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    @Operation(
        summary     = "Listar todas las cuentas (admin)",
        description = "Lista paginada de todas las cuentas del sistema. Solo roles administrativos."
    )
    public ResponseEntity<ApiResponse<PagedResponse<CuentaBancariaResponse>>> listar(
            @Parameter(description = "Número de página (0-based)") @RequestParam(defaultValue = "0")  int page,
            @Parameter(description = "Tamaño de página")           @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Campo de ordenamiento")      @RequestParam(defaultValue = "fechaCreacion") String sortBy,
            @Parameter(description = "Dirección: asc o desc")      @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        var pageable = PageRequest.of(page, size, sort);

        return ResponseEntity.ok(ApiResponse.ok(cuentaUseCase.listarCuentas(pageable)));
    }

    // ── GET /v1/accounts/dashboard ────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Dashboard financiero del cliente",
        description = """
            Retorna el dashboard financiero consolidado del usuario autenticado.
            
            Incluye:
            - Resumen de todas sus cuentas y saldos
            - Saldo total consolidado
            - Conteo por estado (activas, bloqueadas, canceladas)
            - Últimas 5 transferencias
            - Transferencias pendientes de aprobación
            
            **Nota:** empleados y administradores ven su propio perfil de usuario.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200", description = "Dashboard generado exitosamente",
            content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = """
                    {
                      "success": true,
                      "message": "OK",
                      "data": {
                        "idTitular": "1234567890",
                        "nombreTitular": "Juan Pérez García",
                        "totalCuentasActivas": 2,
                        "totalCuentasBloqueadas": 0,
                        "totalCuentasCanceladas": 1,
                        "saldoTotalConsolidado": 3500000.00,
                        "cuentas": [
                          { "numeroCuenta": "001-123456789-0", "tipoCuenta": "Ahorros",
                            "saldoActual": 2000000.00, "codigoIsoMoneda": "COP", "estadoCuenta": "Activa" },
                          { "numeroCuenta": "001-987654321-0", "tipoCuenta": "Corriente",
                            "saldoActual": 1500000.00, "codigoIsoMoneda": "COP", "estadoCuenta": "Activa" }
                        ],
                        "transferenciasPendientes": 1,
                        "ultimasTransferencias": [],
                        "generadoEn": "2026-05-24T10:30:00"
                      }
                    }
                    """))
        )
    })
    public ResponseEntity<ApiResponse<DashboardFinancieroResponse>> dashboard(
            @AuthenticationPrincipal UserDetails caller) {

        log.debug("Dashboard solicitado por usuario={}", caller.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(cuentaUseCase.obtenerDashboard(caller)));
    }

    // ── GET /v1/accounts/{accountNumber} ──────────────────────────────────────

    @GetMapping("/{accountNumber}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Obtener cuenta por número",
        description = """
            Retorna los datos de una cuenta bancaria.
            
            **Ownership:** los clientes solo pueden consultar sus propias cuentas.
            Los roles administrativos pueden consultar cualquier cuenta.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Cuenta encontrada"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Sin permisos para esta cuenta"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Cuenta no encontrada")
    })
    public ResponseEntity<ApiResponse<CuentaBancariaResponse>> obtener(
            @PathVariable String accountNumber,
            @AuthenticationPrincipal UserDetails caller) {

        return ResponseEntity.ok(ApiResponse.ok(
                cuentaUseCase.obtenerCuenta(accountNumber, caller)));
    }

    // ── GET /v1/accounts/{accountNumber}/detail ───────────────────────────────

    @GetMapping("/{accountNumber}/detail")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Detalle completo de cuenta",
        description = """
            Retorna el detalle completo de una cuenta incluyendo:
            - Información del titular (nombre)
            - Datos del usuario que abrió la cuenta
            - Conteo de transferencias como origen y destino
            """
    )
    public ResponseEntity<ApiResponse<CuentaDetalleResponse>> detalle(
            @PathVariable String accountNumber,
            @AuthenticationPrincipal UserDetails caller) {

        return ResponseEntity.ok(ApiResponse.ok(
                cuentaUseCase.obtenerDetalle(accountNumber, caller)));
    }

    // ── GET /v1/accounts/client/{clientId} ────────────────────────────────────

    @GetMapping("/client/{clientId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Cuentas de un cliente",
        description = """
            Lista las cuentas de un titular específico (cédula o NIT).
            
            **Ownership:** los clientes solo pueden consultar sus propias cuentas.
            Los roles administrativos pueden consultar cualquier titular.
            """
    )
    public ResponseEntity<ApiResponse<PagedResponse<CuentaBancariaResponse>>> porCliente(
            @PathVariable String clientId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails caller) {

        var pageable = PageRequest.of(page, size, Sort.by("fechaCreacion").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                cuentaUseCase.cuentasPorTitular(clientId, pageable, caller)));
    }

    // ── GET /v1/accounts/{accountNumber}/summary ──────────────────────────────

    @GetMapping("/{accountNumber}/summary")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary     = "Resumen de movimientos de una cuenta",
        description = """
            Retorna el resumen de actividad de una cuenta:
            - Saldo actual
            - Total de transferencias enviadas y recibidas
            - Montos totales enviados y recibidos
            - Últimas 5 transferencias con dirección (ENVIADA/RECIBIDA)
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200", description = "Resumen generado",
            content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = """
                    {
                      "success": true,
                      "message": "OK",
                      "data": {
                        "numeroCuenta": "001-123456789-0",
                        "tipoCuenta": "Ahorros",
                        "estadoCuenta": "Activa",
                        "saldoActual": 1500000.00,
                        "codigoIsoMoneda": "COP",
                        "totalTransferenciasEnviadas": 5,
                        "totalTransferenciasRecibidas": 3,
                        "montoTotalEnviado": 800000.00,
                        "montoTotalRecibido": 300000.00,
                        "ultimasTransferencias": [
                          {
                            "idTransferencia": 42,
                            "cuentaContraparte": "001-987654321-0",
                            "direccion": "ENVIADA",
                            "monto": 200000.00,
                            "estado": "Ejecutada",
                            "fecha": "2026-05-24T09:15:00"
                          }
                        ],
                        "fechaConsulta": "2026-05-24T10:30:00"
                      }
                    }
                    """))
        )
    })
    public ResponseEntity<ApiResponse<CuentaResumenResponse>> resumen(
            @PathVariable String accountNumber,
            @AuthenticationPrincipal UserDetails caller) {

        return ResponseEntity.ok(ApiResponse.ok(
                cuentaUseCase.obtenerResumen(accountNumber, caller)));
    }

    // ── POST /v1/accounts/deposit ─────────────────────────────────────────────

    @PostMapping("/deposit")
    @PreAuthorize("hasAnyRole('EMPLEADO_VENTANILLA','ADMINISTRADOR')")
    @Operation(
        summary     = "Depósito de caja",
        description = """
            Realiza un depósito en una cuenta bancaria vía `sp_depositar`.
            
            **Roles permitidos:** EMPLEADO_VENTANILLA, ADMINISTRADOR
            
            El SP valida que la cuenta esté activa y registra la operación en bitácora.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Depósito realizado"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Cuenta bloqueada o cancelada")
    })
    public ResponseEntity<ApiResponse<Void>> depositar(
            @Valid @RequestBody OperacionCajaRequest request) {

        log.info("Depósito — cuenta={} monto={}", request.getNumeroCuenta(), request.getMonto());
        cuentaUseCase.depositar(request);
        return ResponseEntity.ok(ApiResponse.ok("Depósito realizado exitosamente", null));
    }

    // ── POST /v1/accounts/withdraw ────────────────────────────────────────────

    @PostMapping("/withdraw")
    @PreAuthorize("hasAnyRole('EMPLEADO_VENTANILLA','ADMINISTRADOR')")
    @Operation(
        summary     = "Retiro de caja",
        description = """
            Realiza un retiro de una cuenta bancaria vía `sp_retirar`.
            
            **Roles permitidos:** EMPLEADO_VENTANILLA, ADMINISTRADOR
            
            Valida saldo suficiente antes de llamar al SP.
            El SP también valida y registra en bitácora.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Retiro realizado"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Saldo insuficiente o cuenta inactiva")
    })
    public ResponseEntity<ApiResponse<Void>> retirar(
            @Valid @RequestBody OperacionCajaRequest request) {

        log.info("Retiro — cuenta={} monto={}", request.getNumeroCuenta(), request.getMonto());
        cuentaUseCase.retirar(request);
        return ResponseEntity.ok(ApiResponse.ok("Retiro realizado exitosamente", null));
    }

    // ── PATCH /v1/accounts/{accountNumber}/block ──────────────────────────────

    @PatchMapping("/{accountNumber}/block")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ANALISTA_INTERNO','ADMINISTRADOR')")
    @Operation(
        summary     = "Bloquear cuenta bancaria",
        description = """
            Bloquea una cuenta bancaria vía `sp_bloquear_cuenta`.
            
            **Roles permitidos:** SUPERVISOR_EMPRESA, ANALISTA_INTERNO, ADMINISTRADOR
            
            El motivo es obligatorio para trazabilidad y auditoría.
            Una cuenta bloqueada no puede recibir ni enviar transferencias.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Cuenta bloqueada"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Cuenta ya cancelada")
    })
    public ResponseEntity<ApiResponse<Void>> bloquear(
            @PathVariable String accountNumber,
            @RequestParam Long idUsuario,
            @Valid @RequestBody BloquearCuentaRequest request) {

        log.info("Bloqueo de cuenta={} por usuario={} motivo={}",
                accountNumber, idUsuario, request.getMotivo());
        cuentaUseCase.bloquearCuenta(accountNumber, idUsuario, request.getMotivo());
        return ResponseEntity.ok(ApiResponse.ok("Cuenta bloqueada exitosamente", null));
    }

    // ── PATCH /v1/accounts/{accountNumber}/cancel ─────────────────────────────

    @PatchMapping("/{accountNumber}/cancel")
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','ADMINISTRADOR')")
    @Operation(
        summary     = "Cancelar cuenta bancaria",
        description = """
            Cancela/cierra una cuenta bancaria vía `sp_cancelar_cuenta`.
            
            **Roles permitidos:** ANALISTA_INTERNO, ADMINISTRADOR
            
            El SP valida que el saldo sea cero antes de cancelar.
            Una cuenta cancelada no puede ser reactivada.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Cuenta cancelada"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Saldo diferente de cero o ya cancelada")
    })
    public ResponseEntity<ApiResponse<Void>> cancelar(
            @PathVariable String accountNumber,
            @RequestParam Long idUsuario) {

        log.info("Cancelación de cuenta={} por usuario={}", accountNumber, idUsuario);
        cuentaUseCase.cancelarCuenta(accountNumber, idUsuario);
        return ResponseEntity.ok(ApiResponse.ok("Cuenta cancelada exitosamente", null));
    }

    // ── PATCH /v1/accounts/{accountNumber}/reactivate ─────────────────────────

    @PatchMapping("/{accountNumber}/reactivate")
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ANALISTA_INTERNO','ADMINISTRADOR')")
    @Operation(
        summary     = "Reactivar cuenta bloqueada",
        description = "Reactiva una cuenta previamente bloqueada vía `sp_reactivar_cuenta`."
    )
    public ResponseEntity<ApiResponse<Void>> reactivar(
            @PathVariable String accountNumber,
            @RequestParam Long idUsuario) {

        log.info("Reactivación de cuenta={} por usuario={}", accountNumber, idUsuario);
        cuentaUseCase.reactivarCuenta(accountNumber, idUsuario);
        return ResponseEntity.ok(ApiResponse.ok("Cuenta reactivada exitosamente", null));
    }
}
