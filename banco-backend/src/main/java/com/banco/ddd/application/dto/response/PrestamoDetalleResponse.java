package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Respuesta detallada de préstamo con información de usuarios y estado del ciclo de vida.
 */
@Getter
@Builder
@Schema(description = "Detalle completo de un préstamo bancario")
public class PrestamoDetalleResponse {

    @Schema(description = "ID único del préstamo", example = "7")
    private Long idPrestamo;

    @Schema(description = "Tipo de préstamo", example = "Personal")
    private String tipoPrestamo;

    @Schema(description = "ID del cliente solicitante", example = "1234567890")
    private String idClienteSolicitante;

    @Schema(description = "Nombre del cliente solicitante", example = "Juan Pérez García")
    private String nombreClienteSolicitante;

    @Schema(description = "Tipo de cliente", example = "PERSONA_NATURAL")
    private String tipoCliente;

    @Schema(description = "Monto solicitado", example = "5000000.00")
    private BigDecimal montoSolicitado;

    @Schema(description = "Monto aprobado (null si aún no aprobado)", example = "4500000.00")
    private BigDecimal montoAprobado;

    @Schema(description = "Tasa de interés mensual", example = "0.0150")
    private BigDecimal tasaInteres;

    @Schema(description = "Plazo en meses", example = "24")
    private Integer plazoMeses;

    @Schema(description = "Cuota mensual estimada", example = "225000.00")
    private BigDecimal cuotaMensualEstimada;

    @Schema(description = "Estado actual del préstamo", example = "Aprobado")
    private String estadoPrestamo;

    @Schema(description = "¿Es estado final?")
    private boolean estadoFinal;

    @Schema(description = "Cuenta destino del desembolso")
    private String cuentaDestinoDesembolso;

    // ── Información del solicitante ───────────────────────────────────────────

    @Schema(description = "ID del usuario que registró la solicitud")
    private Long idUsuarioSolicitante;

    @Schema(description = "Nombre del usuario que registró la solicitud")
    private String nombreUsuarioSolicitante;

    // ── Información del analista ──────────────────────────────────────────────

    @Schema(description = "ID del analista aprobador/rechazador")
    private Long idAnalistaAprobador;

    @Schema(description = "Nombre del analista aprobador/rechazador")
    private String nombreAnalistaAprobador;

    // ── Fechas del ciclo de vida ──────────────────────────────────────────────

    @Schema(description = "Fecha de solicitud")
    private LocalDateTime fechaSolicitud;

    @Schema(description = "Fecha de aprobación o rechazo")
    private LocalDateTime fechaAprobacion;

    @Schema(description = "Fecha de desembolso")
    private LocalDateTime fechaDesembolso;

    @Schema(description = "Fecha de última modificación")
    private LocalDateTime fechaModificacion;
}
