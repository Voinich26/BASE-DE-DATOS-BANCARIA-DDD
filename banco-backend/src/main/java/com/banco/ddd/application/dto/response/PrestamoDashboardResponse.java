package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Dashboard financiero de préstamos del cliente autenticado.
 */
@Getter
@Builder
@Schema(description = "Dashboard financiero de préstamos del cliente autenticado")
public class PrestamoDashboardResponse {

    @Schema(description = "ID del cliente")
    private String idCliente;

    @Schema(description = "Nombre del cliente")
    private String nombreCliente;

    // ── Resumen de préstamos ──────────────────────────────────────────────────

    @Schema(description = "Total de préstamos solicitados")
    private int totalSolicitados;

    @Schema(description = "Total de préstamos aprobados")
    private int totalAprobados;

    @Schema(description = "Total de préstamos desembolsados (activos)")
    private int totalDesembolsados;

    @Schema(description = "Total de préstamos rechazados")
    private int totalRechazados;

    @Schema(description = "Total de préstamos cancelados")
    private int totalCancelados;

    // ── Montos ────────────────────────────────────────────────────────────────

    @Schema(description = "Deuda total activa (préstamos desembolsados)")
    private BigDecimal deudaTotalActiva;

    @Schema(description = "Monto total solicitado históricamente")
    private BigDecimal montoTotalSolicitado;

    @Schema(description = "Monto total aprobado históricamente")
    private BigDecimal montoTotalAprobado;

    @Schema(description = "Monto pendiente de desembolso (aprobados no desembolsados)")
    private BigDecimal montoPendienteDesembolso;

    // ── Detalle de préstamos activos ──────────────────────────────────────────

    @Schema(description = "Préstamos activos (desembolsados)")
    private List<PrestamoResumenItem> prestamosActivos;

    @Schema(description = "Préstamos en proceso (solicitados o aprobados)")
    private List<PrestamoResumenItem> prestamosEnProceso;

    @Schema(description = "Fecha de generación del dashboard")
    private LocalDateTime generadoEn;

    // ── Inner DTO ─────────────────────────────────────────────────────────────

    @Getter
    @Builder
    @Schema(description = "Resumen de un préstamo en el dashboard")
    public static class PrestamoResumenItem {

        @Schema(description = "ID del préstamo")
        private Long idPrestamo;

        @Schema(description = "Tipo de préstamo")
        private String tipoPrestamo;

        @Schema(description = "Monto solicitado")
        private BigDecimal montoSolicitado;

        @Schema(description = "Monto aprobado")
        private BigDecimal montoAprobado;

        @Schema(description = "Tasa de interés")
        private BigDecimal tasaInteres;

        @Schema(description = "Plazo en meses")
        private Integer plazoMeses;

        @Schema(description = "Cuota mensual estimada")
        private BigDecimal cuotaMensual;

        @Schema(description = "Estado actual")
        private String estadoPrestamo;

        @Schema(description = "Fecha de solicitud")
        private LocalDateTime fechaSolicitud;

        @Schema(description = "Fecha de desembolso")
        private LocalDateTime fechaDesembolso;
    }
}
