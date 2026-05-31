package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Métricas operativas del módulo de transferencias.
 * Solo accesible para roles administrativos (ANALISTA_INTERNO, SUPERVISOR_EMPRESA).
 */
@Getter
@Builder
@Schema(description = "Métricas operativas del módulo de transferencias")
public class TransferenciaMetricasResponse {

    // ── Volumen global ────────────────────────────────────────────────────────

    @Schema(description = "Total de transferencias en el sistema")
    private long totalTransferencias;

    @Schema(description = "Distribución por estado: { 'Ejecutada': 150, 'Pendiente': 3, ... }")
    private Map<String, Long> distribucionPorEstado;

    // ── Montos ────────────────────────────────────────────────────────────────

    @Schema(description = "Monto total procesado (transferencias ejecutadas)")
    private BigDecimal montoTotalProcesado;

    @Schema(description = "Monto promedio por transferencia ejecutada")
    private BigDecimal montoPromedio;

    @Schema(description = "Monto máximo registrado")
    private BigDecimal montoMaximo;

    @Schema(description = "Monto mínimo registrado")
    private BigDecimal montoMinimo;

    // ── Operacional ───────────────────────────────────────────────────────────

    @Schema(description = "Transferencias pendientes de ejecución")
    private long pendientesEjecucion;

    @Schema(description = "Transferencias en espera de aprobación")
    private long enEsperaAprobacion;

    @Schema(description = "Transferencias vencidas sin procesar")
    private long vencidas;

    @Schema(description = "Tasa de éxito (ejecutadas / total creadas)")
    private double tasaExito;

    @Schema(description = "Tasa de rechazo (rechazadas / total creadas)")
    private double tasaRechazo;

    // ── Temporal ──────────────────────────────────────────────────────────────

    @Schema(description = "Fecha de generación de las métricas")
    private LocalDateTime generadoEn;
}
