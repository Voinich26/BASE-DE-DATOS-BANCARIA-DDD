package com.banco.ddd.application.port.in;

import com.banco.ddd.application.dto.request.CrearTransferenciaRequest;
import com.banco.ddd.application.dto.request.RechazarTransferenciaRequest;
import com.banco.ddd.application.dto.response.TransferenciaDashboardResponse;
import com.banco.ddd.application.dto.response.TransferenciaDetalleResponse;
import com.banco.ddd.application.dto.response.TransferenciaMetricasResponse;
import com.banco.ddd.application.dto.response.TransferenciaResponse;
import com.banco.ddd.application.dto.response.TransferenciaTimelineResponse;
import com.banco.ddd.shared.response.PagedResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Puerto de entrada (driving port) — BC-05: Transferencias Bancarias.
 *
 * <p>Define el contrato completo del caso de uso de transferencias,
 * incluyendo creación, aprobación, consultas enriquecidas, dashboard y métricas.</p>
 *
 * <p>Implementado por {@code TransferenciaService} en la capa de aplicación.</p>
 */
public interface TransferenciaUseCase {

    // ── Consultas ─────────────────────────────────────────────────────────────

    /**
     * Historial paginado con filtros opcionales.
     *
     * @param estado        filtro por estado (null = todos)
     * @param cuentaOrigen  filtro por cuenta origen (null = todas)
     * @param cuentaDestino filtro por cuenta destino (null = todas)
     * @param pageable      paginación y sorting
     * @param caller        usuario autenticado
     */
    PagedResponse<TransferenciaResponse> historial(String estado,
                                                    String cuentaOrigen,
                                                    String cuentaDestino,
                                                    Pageable pageable,
                                                    UserDetails caller);

    /**
     * Obtiene una transferencia por ID con detalle completo.
     *
     * @param id     ID de la transferencia
     * @param caller usuario autenticado (para validación de ownership)
     */
    TransferenciaDetalleResponse obtenerDetalle(Long id, UserDetails caller);

    /**
     * Transferencias de una cuenta específica (origen o destino).
     *
     * @param accountNumber número de cuenta
     * @param pageable      paginación
     * @param caller        usuario autenticado
     */
    PagedResponse<TransferenciaResponse> porCuenta(String accountNumber,
                                                    Pageable pageable,
                                                    UserDetails caller);

    /**
     * Transferencias en espera de aprobación (solo supervisores/analistas).
     */
    PagedResponse<TransferenciaResponse> pendientesAprobacion(Pageable pageable);

    /**
     * Timeline completo de estados de una transferencia.
     *
     * @param id     ID de la transferencia
     * @param caller usuario autenticado
     */
    TransferenciaTimelineResponse obtenerTimeline(Long id, UserDetails caller);

    /**
     * Dashboard transaccional del usuario autenticado.
     */
    TransferenciaDashboardResponse obtenerDashboard(UserDetails caller);

    /**
     * Métricas operativas globales (solo roles administrativos).
     */
    TransferenciaMetricasResponse obtenerMetricas();

    // ── Comandos ──────────────────────────────────────────────────────────────

    /**
     * Crea una transferencia entre cuentas.
     *
     * <p>El trigger TRG-09 asigna la fecha de vencimiento (+60 min).
     * Si el monto supera el umbral configurado, queda en
     * "En Espera de Aprobacion". Si no, se ejecuta automáticamente.</p>
     *
     * @param request datos de la transferencia
     * @param caller  usuario autenticado (para validación de ownership)
     */
    TransferenciaDetalleResponse crearTransferencia(CrearTransferenciaRequest request,
                                                     UserDetails caller);

    /**
     * Aprueba una transferencia en espera vía {@code sp_aprobar_transferencia}.
     * Solo supervisores de empresa.
     *
     * @param id          ID de la transferencia
     * @param idSupervisor ID del supervisor que aprueba
     */
    TransferenciaDetalleResponse aprobarTransferencia(Long id, Long idSupervisor);

    /**
     * Rechaza una transferencia en espera vía {@code sp_rechazar_transferencia}.
     * Solo supervisores de empresa.
     *
     * @param id      ID de la transferencia
     * @param request datos del rechazo (supervisor + motivo)
     */
    TransferenciaDetalleResponse rechazarTransferencia(Long id,
                                                        RechazarTransferenciaRequest request);
}
