package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * BC-06: Respuesta detallada de un lote de transferencias con todos sus ítems.
 */
@Getter
@Builder
@Schema(description = "Detalle completo de un lote de pagos masivos / nómina empresarial")
public class LoteTransferenciaDetalleResponse {

    // ── Cabecera del lote ─────────────────────────────────────────────────────

    @Schema(description = "ID único del lote", example = "12")
    private Long idLote;

    @Schema(description = "NIT de la empresa propietaria", example = "900123456-1")
    private String nitEmpresa;

    @Schema(description = "Razón social de la empresa", example = "Empresa ABC S.A.S.")
    private String razonSocialEmpresa;

    @Schema(description = "Concepto del lote", example = "Nómina Mayo 2026")
    private String concepto;

    @Schema(description = "Estado actual del lote", example = "Procesado")
    private String estadoLote;

    @Schema(description = "¿Es estado final?")
    private boolean estadoFinal;

    @Schema(description = "Motivo de rechazo (si aplica)")
    private String motivoRechazo;

    // ── Métricas del lote ─────────────────────────────────────────────────────

    @Schema(description = "Total de ítems en el lote", example = "50")
    private Integer totalItems;

    @Schema(description = "Ítems procesados exitosamente", example = "48")
    private Integer itemsExitosos;

    @Schema(description = "Ítems fallidos", example = "2")
    private Integer itemsFallidos;

    @Schema(description = "Monto total del lote", example = "75000000.00")
    private BigDecimal montoTotal;

    @Schema(description = "Monto efectivamente procesado", example = "72000000.00")
    private BigDecimal montoProcesado;

    @Schema(description = "Porcentaje de éxito del procesamiento", example = "96.0")
    private Double porcentajeExito;

    // ── Usuarios ──────────────────────────────────────────────────────────────

    @Schema(description = "ID del usuario creador")
    private Long idUsuarioCreador;

    @Schema(description = "Nombre del usuario creador", example = "María López")
    private String nombreUsuarioCreador;

    @Schema(description = "ID del supervisor que aprobó/procesó")
    private Long idUsuarioSupervisor;

    @Schema(description = "Nombre del supervisor")
    private String nombreUsuarioSupervisor;

    // ── Fechas ────────────────────────────────────────────────────────────────

    @Schema(description = "Fecha de creación del lote")
    private LocalDateTime fechaCreacion;

    @Schema(description = "Fecha de procesamiento")
    private LocalDateTime fechaProcesamiento;

    @Schema(description = "Fecha de última modificación")
    private LocalDateTime fechaModificacion;

    // ── Detalle de ítems ──────────────────────────────────────────────────────

    @Schema(description = "Lista de transferencias del lote")
    private List<DetalleItemResponse> detalles;

    // ── Inner DTO ─────────────────────────────────────────────────────────────

    @Getter
    @Builder
    @Schema(description = "Ítem individual de transferencia dentro del lote")
    public static class DetalleItemResponse {

        @Schema(description = "ID del detalle", example = "101")
        private Long idDetalle;

        @Schema(description = "Orden dentro del lote", example = "1")
        private Integer orden;

        @Schema(description = "Cuenta origen", example = "001-123456789-0")
        private String cuentaOrigen;

        @Schema(description = "Cuenta destino", example = "001-987654321-0")
        private String cuentaDestino;

        @Schema(description = "Monto de la transferencia", example = "1500000.00")
        private BigDecimal monto;

        @Schema(description = "Concepto específico de este ítem", example = "Salario empleado 001")
        private String conceptoDetalle;

        @Schema(description = "Estado del ítem", example = "Procesado")
        private String estadoDetalle;

        @Schema(description = "ID de la transferencia generada (si fue procesado)")
        private Long idTransferenciaGenerada;

        @Schema(description = "Mensaje de error (si falló)")
        private String mensajeError;
    }
}
