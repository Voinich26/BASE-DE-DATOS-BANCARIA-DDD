package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * BC-06: Respuesta resumida de un lote de transferencias (para listados paginados).
 */
@Getter
@Builder
@Schema(description = "Resumen de un lote de pagos masivos / nómina empresarial")
public class LoteTransferenciaResponse {

    @Schema(description = "ID único del lote", example = "12")
    private Long idLote;

    @Schema(description = "NIT de la empresa propietaria", example = "900123456-1")
    private String nitEmpresa;

    @Schema(description = "Razón social de la empresa", example = "Empresa ABC S.A.S.")
    private String razonSocialEmpresa;

    @Schema(description = "Concepto del lote", example = "Nómina Mayo 2026")
    private String concepto;

    @Schema(description = "Estado actual del lote", example = "Aprobado")
    private String estadoLote;

    @Schema(description = "¿Es estado final?", example = "false")
    private boolean estadoFinal;

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

    @Schema(description = "ID del usuario creador", example = "5")
    private Long idUsuarioCreador;

    @Schema(description = "Nombre del usuario creador", example = "María López")
    private String nombreUsuarioCreador;

    @Schema(description = "Fecha de creación del lote")
    private LocalDateTime fechaCreacion;

    @Schema(description = "Fecha de procesamiento")
    private LocalDateTime fechaProcesamiento;
}
