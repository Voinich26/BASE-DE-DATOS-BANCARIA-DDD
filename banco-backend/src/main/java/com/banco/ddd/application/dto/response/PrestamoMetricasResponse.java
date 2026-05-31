package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Métricas operativas del módulo de préstamos.
 * Solo accesible para ANALISTA_INTERNO, SUPERVISOR_EMPRESA y ADMINISTRADOR.
 */
@Getter
@Builder
@Schema(description = "Métricas operativas del módulo de préstamos")
public class PrestamoMetricasResponse {

    // ── Volumen ───────────────────────────────────────────────────────────────

    @Schema(description = "Total de préstamos en el sistema")
    private long totalPrestamos;

    @Schema(description = "Distribución por estado: { 'Solicitado': 10, 'Aprobado': 5, ... }")
    private Map<String, Long> distribucionPorEstado;

    @Schema(description = "Distribución por tipo de préstamo")
    private Map<String, Long> distribucionPorTipo;

    // ── Montos ────────────────────────────────────────────────────────────────

    @Schema(description = "Cartera total desembolsada activa")
    private BigDecimal carteraTotalActiva;

    @Schema(description = "Monto total solicitado históricamente")
    private BigDecimal montoTotalSolicitado;

    @Schema(description = "Monto total aprobado históricamente")
    private BigDecimal montoTotalAprobado;

    @Schema(description = "Monto promedio por préstamo aprobado")
    private BigDecimal montoPromedioAprobado;

    @Schema(description = "Monto máximo aprobado")
    private BigDecimal montoMaximoAprobado;

    @Schema(description = "Monto mínimo aprobado")
    private BigDecimal montoMinimoAprobado;

    // ── Operacional ───────────────────────────────────────────────────────────

    @Schema(description = "Préstamos pendientes de revisión (Solicitado)")
    private long pendientesRevision;

    @Schema(description = "Préstamos aprobados pendientes de desembolso")
    private long pendientesDesembolso;

    @Schema(description = "Tasa de aprobación (aprobados / solicitados)")
    private double tasaAprobacion;

    @Schema(description = "Tasa de rechazo (rechazados / solicitados)")
    private double tasaRechazo;

    @Schema(description = "Tasa de desembolso (desembolsados / aprobados)")
    private double tasaDesembolso;

    // ── Temporal ──────────────────────────────────────────────────────────────

    @Schema(description = "Fecha de generación de las métricas")
    private LocalDateTime generadoEn;
}
