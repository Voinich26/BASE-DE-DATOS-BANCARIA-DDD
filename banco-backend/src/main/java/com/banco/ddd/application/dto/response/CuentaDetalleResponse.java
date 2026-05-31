package com.banco.ddd.application.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Respuesta detallada de cuenta bancaria.
 * Incluye información del titular y métricas de actividad.
 */
@Getter
@Builder
@Schema(description = "Detalle completo de una cuenta bancaria")
public class CuentaDetalleResponse {

    @Schema(description = "Número de cuenta", example = "001-123456789-0")
    private String numeroCuenta;

    @Schema(description = "Tipo de cuenta", example = "Ahorros")
    private String tipoCuenta;

    @Schema(description = "ID del titular (cédula o NIT)", example = "1234567890")
    private String idTitular;

    @Schema(description = "Tipo de titular", example = "PERSONA_NATURAL")
    private String tipoTitular;

    @Schema(description = "Nombre del titular", example = "Juan Pérez García")
    private String nombreTitular;

    @Schema(description = "Saldo actual disponible", example = "1500000.00")
    private BigDecimal saldoActual;

    @Schema(description = "Moneda de la cuenta", example = "Peso Colombiano")
    private String moneda;

    @Schema(description = "Código ISO de la moneda", example = "COP")
    private String codigoIsoMoneda;

    @Schema(description = "Estado actual de la cuenta", example = "Activa")
    private String estadoCuenta;

    @Schema(description = "Fecha de apertura", example = "2026-01-15")
    private LocalDate fechaApertura;

    @Schema(description = "ID del usuario que abrió la cuenta")
    private Long idUsuarioApertura;

    @Schema(description = "Nombre del usuario que abrió la cuenta")
    private String nombreUsuarioApertura;

    @Schema(description = "Fecha de creación del registro")
    private LocalDateTime fechaCreacion;

    @Schema(description = "Fecha de última modificación")
    private LocalDateTime fechaModificacion;

    @Schema(description = "Número de transferencias como origen")
    private Long totalTransferenciasOrigen;

    @Schema(description = "Número de transferencias como destino")
    private Long totalTransferenciasDestino;
}
