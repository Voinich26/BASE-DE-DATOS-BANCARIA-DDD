package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Dashboard financiero del cliente autenticado.
 * Consolida saldos, cuentas y actividad reciente.
 */
@Getter
@Builder
@Schema(description = "Dashboard financiero del cliente autenticado")
public class DashboardFinancieroResponse {

    @Schema(description = "ID del titular")
    private String idTitular;

    @Schema(description = "Nombre del titular")
    private String nombreTitular;

    // ── Resumen de cuentas ────────────────────────────────────────────────────

    @Schema(description = "Total de cuentas activas")
    private int totalCuentasActivas;

    @Schema(description = "Total de cuentas bloqueadas")
    private int totalCuentasBloqueadas;

    @Schema(description = "Total de cuentas canceladas")
    private int totalCuentasCanceladas;

    @Schema(description = "Saldo total consolidado en COP")
    private BigDecimal saldoTotalConsolidado;

    // ── Detalle por cuenta ────────────────────────────────────────────────────

    @Schema(description = "Lista de cuentas con saldo")
    private List<CuentaBancariaResponse> cuentas;

    // ── Actividad reciente ────────────────────────────────────────────────────

    @Schema(description = "Transferencias pendientes de aprobación")
    private long transferenciasPendientes;

    @Schema(description = "Últimas 5 transferencias")
    private List<CuentaResumenResponse.TransferenciaResumenItem> ultimasTransferencias;

    @Schema(description = "Fecha y hora de generación del dashboard")
    private LocalDateTime generadoEn;

    // ── Inner DTOs ────────────────────────────────────────────────────────────

    @Getter
    @Builder
    @Schema(description = "Cuenta con saldo en el dashboard")
    public static class CuentaSaldoItem {

        @Schema(description = "Número de cuenta")
        private String numeroCuenta;

        @Schema(description = "Tipo de cuenta")
        private String tipoCuenta;

        @Schema(description = "Saldo actual")
        private BigDecimal saldoActual;

        @Schema(description = "Moneda")
        private String codigoIsoMoneda;

        @Schema(description = "Estado")
        private String estadoCuenta;
    }
}
