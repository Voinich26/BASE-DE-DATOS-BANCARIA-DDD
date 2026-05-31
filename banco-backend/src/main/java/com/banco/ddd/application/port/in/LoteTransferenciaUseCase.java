package com.banco.ddd.application.port.in;

import com.banco.ddd.application.dto.request.CrearLoteTransferenciaRequest;
import com.banco.ddd.application.dto.request.ProcesarLoteRequest;
import com.banco.ddd.application.dto.request.RechazarLoteRequest;
import com.banco.ddd.application.dto.response.LoteDashboardResponse;
import com.banco.ddd.application.dto.response.LoteMetricasResponse;
import com.banco.ddd.application.dto.response.LoteTimelineResponse;
import com.banco.ddd.application.dto.response.LoteTransferenciaDetalleResponse;
import com.banco.ddd.application.dto.response.LoteTransferenciaResponse;
import com.banco.ddd.shared.response.PagedResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Puerto de entrada (driving port) — BC-06: Pagos Masivos y Nómina Empresarial.
 *
 * <p>Define el contrato completo del caso de uso de lotes de transferencias,
 * incluyendo creación, aprobación, procesamiento, consultas enriquecidas,
 * dashboard empresarial y métricas operativas.</p>
 *
 * <p>Implementado por {@code LoteTransferenciaService} en la capa de aplicación.</p>
 *
 * <p>Stored procedures consumidos:</p>
 * <ul>
 *   <li>{@code sp_crear_lote_transferencia}   — crea el lote y sus detalles</li>
 *   <li>{@code sp_procesar_lote_transferencia} — procesa todos los ítems del lote</li>
 * </ul>
 */
public interface LoteTransferenciaUseCase {

    // ── Consultas ─────────────────────────────────────────────────────────────

    /**
     * Historial paginado de lotes con filtros opcionales.
     *
     * @param estado     filtro por estado (null = todos)
     * @param nitEmpresa filtro por empresa (null = todos — solo admin/supervisor)
     * @param pageable   paginación y sorting
     * @param caller     usuario autenticado (para ownership)
     */
    PagedResponse<LoteTransferenciaResponse> historial(String estado,
                                                        String nitEmpresa,
                                                        Pageable pageable,
                                                        UserDetails caller);

    /**
     * Detalle completo de un lote con todos sus ítems.
     *
     * @param idLote ID del lote
     * @param caller usuario autenticado (para ownership)
     */
    LoteTransferenciaDetalleResponse obtenerDetalle(Long idLote, UserDetails caller);

    /**
     * Lista los ítems (detalles) de un lote específico.
     *
     * @param idLote   ID del lote
     * @param pageable paginación
     * @param caller   usuario autenticado
     */
    PagedResponse<LoteTransferenciaDetalleResponse.DetalleItemResponse> obtenerDetalles(
            Long idLote, Pageable pageable, UserDetails caller);

    /**
     * Timeline de eventos del lote (creación, aprobación, procesamiento, rechazo).
     *
     * @param idLote ID del lote
     * @param caller usuario autenticado
     */
    LoteTimelineResponse obtenerTimeline(Long idLote, UserDetails caller);

    /**
     * Dashboard empresarial del caller autenticado (empresa).
     *
     * @param caller usuario autenticado
     */
    LoteDashboardResponse obtenerDashboard(UserDetails caller);

    /**
     * Métricas operativas globales (solo roles administrativos).
     */
    LoteMetricasResponse obtenerMetricas();

    // ── Comandos ──────────────────────────────────────────────────────────────

    /**
     * Crea un nuevo lote de pagos masivos vía {@code sp_crear_lote_transferencia}.
     *
     * <p>Validaciones previas:</p>
     * <ul>
     *   <li>Ownership: el caller debe pertenecer a la empresa</li>
     *   <li>Anti-duplicados: no debe existir un lote idéntico reciente</li>
     *   <li>Validación de cuentas activas</li>
     *   <li>Validación de saldo total suficiente</li>
     *   <li>Lote no vacío (mínimo 1 ítem)</li>
     * </ul>
     *
     * @param request datos del lote con lista de transferencias
     * @param caller  usuario autenticado
     */
    LoteTransferenciaDetalleResponse crearLote(CrearLoteTransferenciaRequest request,
                                                UserDetails caller);

    /**
     * Procesa un lote aprobado vía {@code sp_procesar_lote_transferencia}.
     * Solo SUPERVISOR_EMPRESA o ADMINISTRADOR.
     *
     * @param idLote  ID del lote a procesar
     * @param request datos del procesamiento (supervisor)
     */
    LoteTransferenciaDetalleResponse procesarLote(Long idLote, ProcesarLoteRequest request);

    /**
     * Rechaza un lote pendiente o en revisión.
     * Solo SUPERVISOR_EMPRESA o ADMINISTRADOR.
     *
     * @param idLote  ID del lote
     * @param request datos del rechazo (supervisor + motivo)
     */
    LoteTransferenciaDetalleResponse rechazarLote(Long idLote, RechazarLoteRequest request);
}
