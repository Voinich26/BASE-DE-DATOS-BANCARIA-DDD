package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Resumen de actividad de una cuenta bancaria.
 * Incluye últimas transferencias y métricas de movimientos.
 */
@Getter
@Builder
@Schema(description = "Resumen de actividad de una cuenta bancaria")
public class CuentaResumenResponse {

    @Schema(description = "Número de cuenta")
    private String numeroCuenta;

    @Schema(description = "Tipo de cuenta")
    private String tipoCuenta;

    @Schema(description = "Estado actual")
    private String estadoCuenta;

    @Schema(description = "Saldo actual")
    private BigDecimal saldoActual;

    @Schema(description = "Moneda")
    private String codigoIsoMoneda;

    // ── Métricas de transferencias ────────────────────────────────────────────

    @Schema(description = "Total de transferencias enviadas")
    private long totalTransferenciasEnviadas;

    @Schema(description = "Total de transferencias recibidas")
    private long totalTransferenciasRecibidas;

    @Schema(description = "Monto total enviado en transferencias")
    private BigDecimal montoTotalEnviado;

    @Schema(description = "Monto total recibido en transferencias")
    private BigDecimal montoTotalRecibido;

    @Schema(description = "Últimas transferencias (máx. 5)")
    private List<TransferenciaResumenItem> ultimasTransferencias;

    @Schema(description = "Fecha de consulta")
    private LocalDateTime fechaConsulta;

    // ── Inner DTO ─────────────────────────────────────────────────────────────

    @Getter
    @Builder
    @Schema(description = "Item de transferencia en el resumen")
    public static class TransferenciaResumenItem {

        @Schema(description = "ID de la transferencia")
        private Long idTransferencia;

        @Schema(description = "Cuenta contraparte (origen o destino)")
        private String cuentaContraparte;

        @Schema(description = "Dirección: ENVIADA o RECIBIDA")
        private String direccion;

        @Schema(description = "Monto de la transferencia")
        private BigDecimal monto;

        @Schema(description = "Estado de la transferencia")
        private String estado;

        @Schema(description = "Fecha de la transferencia")
        private LocalDateTime fecha;
    }
}
