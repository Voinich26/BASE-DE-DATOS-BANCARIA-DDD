package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Timeline de estados de una transferencia.
 * Muestra la trazabilidad completa del ciclo de vida.
 */
@Getter
@Builder
@Schema(description = "Timeline de estados de una transferencia")
public class TransferenciaTimelineResponse {

    @Schema(description = "ID de la transferencia")
    private Long idTransferencia;

    @Schema(description = "Cuenta origen")
    private String cuentaOrigen;

    @Schema(description = "Cuenta destino")
    private String cuentaDestino;

    @Schema(description = "Monto")
    private BigDecimal monto;

    @Schema(description = "Estado actual")
    private String estadoActual;

    @Schema(description = "¿Estado final?")
    private boolean estadoFinal;

    @Schema(description = "Fecha de creación")
    private LocalDateTime fechaCreacion;

    @Schema(description = "Fecha de vencimiento")
    private LocalDateTime fechaVencimiento;

    @Schema(description = "¿Está vencida?")
    private boolean vencida;

    @Schema(description = "Historial de transiciones de estado")
    private List<TransicionEstadoItem> transiciones;

    // ── Inner DTO ─────────────────────────────────────────────────────────────

    @Getter
    @Builder
    @Schema(description = "Transición de estado en el timeline")
    public static class TransicionEstadoItem {

        @Schema(description = "Estado anterior")
        private String estadoAnterior;

        @Schema(description = "Estado nuevo")
        private String estadoNuevo;

        @Schema(description = "Fecha de la transición")
        private LocalDateTime fechaTransicion;

        @Schema(description = "ID del usuario que realizó la transición")
        private Long idUsuario;

        @Schema(description = "Nombre del usuario")
        private String nombreUsuario;

        @Schema(description = "Motivo o comentario")
        private String motivo;
    }
}
