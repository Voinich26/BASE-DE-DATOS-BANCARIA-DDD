package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * BC-06: Dashboard empresarial de lotes de pagos masivos.
 */
@Getter
@Builder
@Schema(description = "Dashboard empresarial de lotes de pagos masivos / nómina")
public class LoteDashboardResponse {

    @Schema(description = "NIT de la empresa")
    private String nitEmpresa;

    @Schema(description = "Razón social de la empresa")
    private String razonSocialEmpresa;

    // ── Conteos por estado ────────────────────────────────────────────────────

    @Schema(description = "Total de lotes creados")
    private long totalLotes;

    @Schema(description = "Lotes pendientes de revisión")
    private long lotesPendientes;

    @Schema(description = "Lotes en revisión")
    private long lotesEnRevision;

    @Schema(description = "Lotes aprobados pendientes de procesamiento")
    private long lotesAprobados;

    @Schema(description = "Lotes procesados exitosamente")
    private long lotesProcesados;

    @Schema(description = "Lotes rechazados")
    private long lotesRechazados;

    // ── Montos ────────────────────────────────────────────────────────────────

    @Schema(description = "Monto total histórico de todos los lotes")
    private BigDecimal montoTotalHistorico;

    @Schema(description = "Monto total efectivamente procesado")
    private BigDecimal montoTotalProcesado;

    @Schema(description = "Monto pendiente de procesamiento (lotes aprobados)")
    private BigDecimal montoPendienteProcesamiento;

    // ── Ítems ─────────────────────────────────────────────────────────────────

    @Schema(description = "Total de transferencias individuales procesadas")
    private long totalTransferenciasEjecutadas;

    @Schema(description = "Total de transferencias fallidas")
    private long totalTransferenciasFallidas;

    @Schema(description = "Tasa de éxito global de ítems (%)")
    private double tasaExitoItems;

    // ── Últimos lotes ─────────────────────────────────────────────────────────

    @Schema(description = "Últimos 5 lotes de la empresa")
    private List<LoteTransferenciaResponse> ultimosLotes;

    @Schema(description = "Fecha de generación del dashboard")
    private LocalDateTime generadoEn;
}
