package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * BC-06: Métricas operativas globales del módulo de pagos masivos.
 * Solo accesible para ANALISTA_INTERNO, SUPERVISOR_EMPRESA y ADMINISTRADOR.
 */
@Getter
@Builder
@Schema(description = "Métricas operativas globales del módulo de pagos masivos")
public class LoteMetricasResponse {

    // ── Volumen ───────────────────────────────────────────────────────────────

    @Schema(description = "Total de lotes en el sistema")
    private long totalLotes;

    @Schema(description = "Distribución por estado: { 'Pendiente': 5, 'Procesado': 120, ... }")
    private Map<String, Long> distribucionPorEstado;

    @Schema(description = "Total de ítems procesados en todos los lotes")
    private long totalItemsProcesados;

    @Schema(description = "Total de ítems fallidos en todos los lotes")
    private long totalItemsFallidos;

    // ── Montos ────────────────────────────────────────────────────────────────

    @Schema(description = "Monto total procesado en todos los lotes")
    private BigDecimal montoTotalProcesado;

    @Schema(description = "Monto promedio por lote")
    private BigDecimal montoPromedioPorLote;

    @Schema(description = "Monto máximo de un lote")
    private BigDecimal montoMaximoLote;

    @Schema(description = "Monto mínimo de un lote")
    private BigDecimal montoMinimoLote;

    // ── Tasas ─────────────────────────────────────────────────────────────────

    @Schema(description = "Tasa de éxito de lotes procesados (%)")
    private double tasaExitoLotes;

    @Schema(description = "Tasa de rechazo de lotes (%)")
    private double tasaRechazoLotes;

    @Schema(description = "Tasa de éxito de ítems individuales (%)")
    private double tasaExitoItems;

    // ── Top empresas ──────────────────────────────────────────────────────────

    @Schema(description = "Top 5 empresas por volumen de pagos procesados")
    private List<EmpresaResumenItem> topEmpresasPorVolumen;

    @Schema(description = "Fecha de generación de las métricas")
    private LocalDateTime generadoEn;

    // ── Inner DTO ─────────────────────────────────────────────────────────────

    @Getter
    @Builder
    @Schema(description = "Resumen de empresa en el ranking de pagos masivos")
    public static class EmpresaResumenItem {

        @Schema(description = "NIT de la empresa")
        private String nitEmpresa;

        @Schema(description = "Razón social")
        private String razonSocial;

        @Schema(description = "Total de lotes creados")
        private long totalLotes;

        @Schema(description = "Monto total procesado")
        private BigDecimal montoTotalProcesado;
    }
}
