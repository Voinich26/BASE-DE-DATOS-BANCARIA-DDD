package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

/**
 * BC-06: Request para crear un lote de pagos masivos / nómina empresarial.
 */
@Getter @Setter
@Schema(description = "Solicitud de creación de lote de pagos masivos o nómina empresarial")
public class CrearLoteTransferenciaRequest {

    @NotBlank(message = "El NIT de la empresa es obligatorio")
    @Size(max = 30, message = "El NIT no puede superar 30 caracteres")
    @Schema(description = "NIT de la empresa que crea el lote", example = "900123456-1")
    private String nitEmpresa;

    @NotBlank(message = "El concepto del lote es obligatorio")
    @Size(max = 300, message = "El concepto no puede superar 300 caracteres")
    @Schema(description = "Concepto o descripción del lote", example = "Nómina Mayo 2026")
    private String concepto;

    @NotNull(message = "El ID del usuario creador es obligatorio")
    @Schema(description = "ID del usuario que crea el lote", example = "5")
    private Long idUsuarioCreador;

    @NotNull(message = "La lista de transferencias es obligatoria")
    @Size(min = 1, max = 500, message = "El lote debe tener entre 1 y 500 transferencias")
    @Valid
    @Schema(description = "Lista de transferencias del lote")
    private List<DetalleTransferenciaItem> transferencias;

    // ── Inner DTO ─────────────────────────────────────────────────────────────

    @Getter @Setter
    @Schema(description = "Ítem individual de transferencia dentro del lote")
    public static class DetalleTransferenciaItem {

        @NotBlank(message = "La cuenta origen es obligatoria")
        @Size(max = 30)
        @Schema(description = "Número de cuenta origen", example = "001-123456789-0")
        private String cuentaOrigen;

        @NotBlank(message = "La cuenta destino es obligatoria")
        @Size(max = 30)
        @Schema(description = "Número de cuenta destino", example = "001-987654321-0")
        private String cuentaDestino;

        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "0.01", message = "El monto debe ser mayor a cero")
        @Schema(description = "Monto a transferir", example = "1500000.00")
        private BigDecimal monto;

        @Size(max = 200)
        @Schema(description = "Concepto específico de esta transferencia", example = "Salario empleado 001")
        private String conceptoDetalle;
    }
}
