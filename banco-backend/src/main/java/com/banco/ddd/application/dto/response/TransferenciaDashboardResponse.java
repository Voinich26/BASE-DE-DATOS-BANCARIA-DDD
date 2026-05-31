package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Dashboard transaccional del usuario autenticado.
 * Consolida métricas y actividad reciente de transferencias.
 */
@Getter
@Builder
@Schema(description = "Dashboard transaccional del usuario autenticado")
public class TransferenciaDashboardResponse {

    @Schema(description = "Cuentas del titular incluidas en el dashboard")
    private List<String> cuentasIncluidas;

    // ── Métricas globales ─────────────────────────────────────────────────────

    @Schema(description = "Total de transferencias enviadas")
    private long totalEnviadas;

    @Schema(description = "Total de transferencias recibidas")
    private long totalRecibidas;

    @Schema(description = "Transferencias pendientes de ejecución")
    private long totalPendientes;

    @Schema(description = "Transferencias en espera de aprobación")
    private long totalEnEspera;

    @Schema(description = "Transferencias ejecutadas exitosamente")
    private long totalEjecutadas;

    @Schema(description = "Transferencias rechazadas")
    private long totalRechazadas;

    @Schema(description = "Transferencias vencidas")
    private long totalVencidas;

    // ── Montos ────────────────────────────────────────────────────────────────

    @Schema(description = "Monto total enviado (transferencias ejecutadas)")
    private BigDecimal montoTotalEnviado;

    @Schema(description = "Monto total recibido (transferencias ejecutadas)")
    private BigDecimal montoTotalRecibido;

    @Schema(description = "Monto en espera de aprobación")
    private BigDecimal montoEnEspera;

    // ── Actividad reciente ────────────────────────────────────────────────────

    @Schema(description = "Últimas 10 transferencias")
    private List<TransferenciaResponse> ultimasTransferencias;

    @Schema(description = "Fecha de generación del dashboard")
    private LocalDateTime generadoEn;
}
