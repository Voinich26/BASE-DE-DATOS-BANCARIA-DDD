package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * BC-06: Timeline de estados de un lote de transferencias.
 */
@Getter
@Builder
@Schema(description = "Timeline de estados de un lote de pagos masivos")
public class LoteTimelineResponse {

    @Schema(description = "ID del lote")
    private Long idLote;

    @Schema(description = "NIT de la empresa")
    private String nitEmpresa;

    @Schema(description = "Concepto del lote")
    private String concepto;

    @Schema(description = "Monto total del lote")
    private BigDecimal montoTotal;

    @Schema(description = "Total de ítems")
    private Integer totalItems;

    @Schema(description = "Estado actual del lote")
    private String estadoActual;

    @Schema(description = "¿Es estado final?")
    private boolean estadoFinal;

    @Schema(description = "Fecha de creación")
    private LocalDateTime fechaCreacion;

    @Schema(description = "Historial de eventos del lote")
    private List<EventoLoteItem> eventos;

    // ── Inner DTO ─────────────────────────────────────────────────────────────

    @Getter
    @Builder
    @Schema(description = "Evento en el timeline del lote")
    public static class EventoLoteItem {

        @Schema(description = "Estado anterior")
        private String estadoAnterior;

        @Schema(description = "Estado nuevo")
        private String estadoNuevo;

        @Schema(description = "Fecha del evento")
        private LocalDateTime fechaEvento;

        @Schema(description = "ID del usuario responsable")
        private Long idUsuario;

        @Schema(description = "Nombre del usuario responsable")
        private String nombreUsuario;

        @Schema(description = "Descripción del evento", example = "Lote creado con 50 ítems")
        private String descripcion;
    }
}
