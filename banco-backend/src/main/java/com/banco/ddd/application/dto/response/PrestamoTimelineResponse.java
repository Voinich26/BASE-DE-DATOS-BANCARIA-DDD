package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Timeline completo de estados de un préstamo.
 */
@Getter
@Builder
@Schema(description = "Timeline de estados de un préstamo bancario")
public class PrestamoTimelineResponse {

    @Schema(description = "ID del préstamo")
    private Long idPrestamo;

    @Schema(description = "Tipo de préstamo")
    private String tipoPrestamo;

    @Schema(description = "ID del cliente")
    private String idClienteSolicitante;

    @Schema(description = "Monto solicitado")
    private BigDecimal montoSolicitado;

    @Schema(description = "Monto aprobado")
    private BigDecimal montoAprobado;

    @Schema(description = "Estado actual")
    private String estadoActual;

    @Schema(description = "¿Estado final?")
    private boolean estadoFinal;

    @Schema(description = "Fecha de solicitud")
    private LocalDateTime fechaSolicitud;

    @Schema(description = "Historial de transiciones de estado")
    private List<TransicionEstadoItem> transiciones;

    @Getter
    @Builder
    @Schema(description = "Transición de estado en el timeline del préstamo")
    public static class TransicionEstadoItem {

        @Schema(description = "Estado anterior")
        private String estadoAnterior;

        @Schema(description = "Estado nuevo")
        private String estadoNuevo;

        @Schema(description = "Fecha de la transición")
        private LocalDateTime fechaTransicion;

        @Schema(description = "ID del usuario responsable")
        private Long idUsuario;

        @Schema(description = "Nombre del usuario responsable")
        private String nombreUsuario;

        @Schema(description = "Observaciones o motivo")
        private String observaciones;
    }
}
