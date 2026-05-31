package com.banco.ddd.application.port.in;

import com.banco.ddd.application.dto.request.AprobarPrestamoRequest;
import com.banco.ddd.application.dto.request.DesembolsarPrestamoRequest;
import com.banco.ddd.application.dto.request.RechazarPrestamoRequest;
import com.banco.ddd.application.dto.request.SolicitarPrestamoRequest;
import com.banco.ddd.application.dto.response.PrestamoDetalleResponse;
import com.banco.ddd.application.dto.response.PrestamoDashboardResponse;
import com.banco.ddd.application.dto.response.PrestamoMetricasResponse;
import com.banco.ddd.application.dto.response.PrestamoResponse;
import com.banco.ddd.application.dto.response.PrestamoTimelineResponse;
import com.banco.ddd.shared.response.PagedResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

/**
 * Puerto de entrada (driving port) — BC-04: Préstamos Bancarios.
 *
 * <p>Define el contrato completo del caso de uso de préstamos,
 * incluyendo solicitud, aprobación, desembolso, consultas enriquecidas,
 * dashboard financiero y métricas operativas.</p>
 *
 * <p>Implementado por {@code PrestamoService} en la capa de aplicación.</p>
 */
public interface PrestamoUseCase {

    // ── Consultas ─────────────────────────────────────────────────────────────

    /**
     * Historial paginado con filtros opcionales.
     *
     * @param estado       filtro por estado (null = todos)
     * @param idCliente    filtro por cliente (null = todos)
     * @param tipoPrestamo filtro por tipo (null = todos)
     * @param pageable     paginación y sorting
     * @param caller       usuario autenticado
     */
    PagedResponse<PrestamoResponse> historial(String estado,
                                               String idCliente,
                                               String tipoPrestamo,
                                               Pageable pageable,
                                               UserDetails caller);

    /**
     * Detalle completo de un préstamo con información de usuarios y cuota estimada.
     *
     * @param id     ID del préstamo
     * @param caller usuario autenticado (para validación de ownership)
     */
    PrestamoDetalleResponse obtenerDetalle(Long id, UserDetails caller);

    /**
     * Lista todos los préstamos de un cliente específico.
     *
     * @param idCliente identificación del cliente (cédula o NIT)
     * @param caller    usuario autenticado
     */
    List<PrestamoResponse> prestamosPorCliente(String idCliente, UserDetails caller);

    /**
     * Timeline completo de estados de un préstamo.
     *
     * @param id     ID del préstamo
     * @param caller usuario autenticado
     */
    PrestamoTimelineResponse obtenerTimeline(Long id, UserDetails caller);

    /**
     * Dashboard financiero de préstamos del cliente autenticado.
     *
     * @param caller usuario autenticado
     */
    PrestamoDashboardResponse obtenerDashboard(UserDetails caller);

    /**
     * Métricas operativas globales (solo roles administrativos).
     */
    PrestamoMetricasResponse obtenerMetricas();

    // ── Comandos ──────────────────────────────────────────────────────────────

    /**
     * Solicita un nuevo préstamo vía {@code sp_solicitar_prestamo}.
     *
     * @param request datos de la solicitud
     * @param caller  usuario autenticado (para validación de ownership)
     */
    PrestamoDetalleResponse solicitarPrestamo(SolicitarPrestamoRequest request,
                                               UserDetails caller);

    /**
     * Aprueba un préstamo en estado Solicitado vía {@code sp_aprobar_prestamo}.
     * Solo ANALISTA_INTERNO.
     *
     * @param id      ID del préstamo
     * @param request datos de aprobación (analista, monto, tasa, plazo, cuenta destino)
     */
    PrestamoDetalleResponse aprobarPrestamo(Long id, AprobarPrestamoRequest request);

    /**
     * Rechaza un préstamo en estado Solicitado vía {@code sp_rechazar_prestamo}.
     * Solo ANALISTA_INTERNO.
     *
     * @param id      ID del préstamo
     * @param request datos del rechazo (analista + motivo)
     */
    PrestamoDetalleResponse rechazarPrestamo(Long id, RechazarPrestamoRequest request);

    /**
     * Desembolsa un préstamo en estado Aprobado vía {@code sp_desembolsar_prestamo}.
     * Solo SUPERVISOR_EMPRESA.
     *
     * @param id      ID del préstamo
     * @param request datos del desembolso (supervisor)
     */
    PrestamoDetalleResponse desembolsarPrestamo(Long id, DesembolsarPrestamoRequest request);
}
