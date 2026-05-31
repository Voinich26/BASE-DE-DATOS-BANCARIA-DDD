package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Respuesta detallada de transferencia con información de usuarios y saldos.
 */
@Getter
@Builder
@Schema(description = "Detalle completo de una transferencia bancaria")
public class TransferenciaDetalleResponse {

    @Schema(description = "ID único de la transferencia", example = "42")
    private Long idTransferencia;

    @Schema(description = "Cuenta de origen", example = "001-123456789-0")
    private String cuentaOrigen;

    @Schema(description = "Cuenta de destino", example = "001-987654321-0")
    private String cuentaDestino;

    @Schema(description = "Monto transferido", example = "500000.00")
    private BigDecimal monto;

    @Schema(description = "Estado actual", example = "Ejecutada")
    private String estadoTransferencia;

    @Schema(description = "¿Requirió aprobación?", example = "true")
    private boolean requiereAprobacion;

    // ── Información del creador ───────────────────────────────────────────────

    @Schema(description = "ID del usuario creador")
    private Long idUsuarioCreador;

    @Schema(description = "Nombre del usuario creador")
    private String nombreUsuarioCreador;

    // ── Información del aprobador ─────────────────────────────────────────────

    @Schema(description = "ID del supervisor aprobador/rechazador (null si no aplica)")
    private Long idUsuarioAprobador;

    @Schema(description = "Nombre del supervisor aprobador/rechazador")
    private String nombreUsuarioAprobador;

    // ── Fechas del ciclo de vida ──────────────────────────────────────────────

    @Schema(description = "Fecha de creación")
    private LocalDateTime fechaCreacion;

    @Schema(description = "Fecha de aprobación/rechazo")
    private LocalDateTime fechaAprobacion;

    @Schema(description = "Fecha de vencimiento (60 min desde creación)")
    private LocalDateTime fechaVencimiento;

    // ── Saldos snapshot ───────────────────────────────────────────────────────

    @Schema(description = "Saldo de cuenta origen antes de la transferencia")
    private BigDecimal saldoOrigenAntes;

    @Schema(description = "Saldo de cuenta origen después de la transferencia")
    private BigDecimal saldoOrigenDespues;

    @Schema(description = "Saldo de cuenta destino antes de la transferencia")
    private BigDecimal saldoDestinoAntes;

    @Schema(description = "Saldo de cuenta destino después de la transferencia")
    private BigDecimal saldoDestinoDespues;

    // ── Metadata ──────────────────────────────────────────────────────────────

    @Schema(description = "¿La transferencia está vencida?")
    private boolean vencida;

    @Schema(description = "¿Es un estado final (no puede cambiar)?")
    private boolean estadoFinal;
}
