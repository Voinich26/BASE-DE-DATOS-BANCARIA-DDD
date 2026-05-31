package com.banco.ddd.application.service;

import com.banco.ddd.application.dto.request.CrearLoteTransferenciaRequest;
import com.banco.ddd.application.dto.request.ProcesarLoteRequest;
import com.banco.ddd.application.dto.request.RechazarLoteRequest;
import com.banco.ddd.application.dto.response.*;
import com.banco.ddd.application.port.in.LoteTransferenciaUseCase;
import com.banco.ddd.domain.exception.BusinessRuleException;
import com.banco.ddd.domain.exception.ResourceNotFoundException;
import com.banco.ddd.domain.exception.UnauthorizedOperationException;
import com.banco.ddd.domain.model.CuentaBancaria;
import com.banco.ddd.domain.model.DetalleLoteTransferencia;
import com.banco.ddd.domain.model.LoteTransferencia;
import com.banco.ddd.infrastructure.adapter.out.persistence.ClienteEmpresaRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.CuentaBancariaRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.DetalleLoteRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.LoteTransferenciaRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.UsuarioRepository;
import com.banco.ddd.shared.response.PagedResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * BC-06: Caso de uso — Pagos Masivos y Nómina Empresarial.
 *
 * <p>Orquesta la creación, aprobación, procesamiento y consulta de lotes
 * de transferencias empresariales. Toda la lógica crítica de base de datos
 * reside en los stored procedures MySQL.</p>
 *
 * <p>Stored procedures consumidos:</p>
 * <ul>
 *   <li>{@code sp_crear_lote_transferencia}   — crea lote + detalles, retorna id_lote</li>
 *   <li>{@code sp_procesar_lote_transferencia} — procesa todos los ítems del lote</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoteTransferenciaService implements LoteTransferenciaUseCase {

    private static final Set<String> ROLES_ADMIN = Set.of(
            "ROLE_ADMINISTRADOR", "ROLE_ANALISTA_INTERNO", "ROLE_SUPERVISOR_EMPRESA"
    );
    private static final List<String> ESTADOS_ACTIVOS_LOTE = List.of(
            "Pendiente", "En Revision", "Aprobado"
    );

    private final LoteTransferenciaRepository loteRepo;
    private final DetalleLoteRepository       detalleRepo;
    private final CuentaBancariaRepository    cuentaRepo;
    private final ClienteEmpresaRepository    empresaRepo;
    private final UsuarioRepository           usuarioRepo;
    private final JdbcTemplate                jdbcTemplate;

    // ── Consultas ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<LoteTransferenciaResponse> historial(String estado,
                                                               String nitEmpresa,
                                                               Pageable pageable,
                                                               UserDetails caller) {
        if (!esRolAdministrativo(caller)) {
            String nitCaller = resolverNitEmpresaDesdeCaller(caller);
            if (nitEmpresa == null) {
                nitEmpresa = nitCaller;
            } else if (!nitEmpresa.equals(nitCaller)) {
                throw new UnauthorizedOperationException(
                        "Solo puede consultar los lotes de su propia empresa");
            }
        }
        Page<LoteTransferenciaResponse> page = loteRepo
                .findHistorial(estado, nitEmpresa, pageable)
                .map(this::toResponse);
        log.debug("Historial lotes — caller={} estado={} empresa={} total={}",
                caller.getUsername(), estado, nitEmpresa, page.getTotalElements());
        return new PagedResponse<>(page);
    }

    @Override
    @Transactional(readOnly = true)
    public LoteTransferenciaDetalleResponse obtenerDetalle(Long idLote, UserDetails caller) {
        LoteTransferencia lote = findOrThrow(idLote);
        validarOwnership(lote, caller);
        List<DetalleLoteTransferencia> detalles = detalleRepo.findByIdLoteOrdenado(idLote);
        return toDetalleResponse(lote, detalles);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<LoteTransferenciaDetalleResponse.DetalleItemResponse> obtenerDetalles(
            Long idLote, Pageable pageable, UserDetails caller) {
        LoteTransferencia lote = findOrThrow(idLote);
        validarOwnership(lote, caller);
        Page<DetalleLoteTransferencia> page = detalleRepo.findByIdLotePaged(idLote, pageable);
        Page<LoteTransferenciaDetalleResponse.DetalleItemResponse> mapped =
                page.map(this::toDetalleItemResponse);
        return new PagedResponse<>(mapped);
    }

    @Override
    @Transactional(readOnly = true)
    public LoteTimelineResponse obtenerTimeline(Long idLote, UserDetails caller) {
        LoteTransferencia lote = findOrThrow(idLote);
        validarOwnership(lote, caller);

        // Construir timeline a partir de los datos del lote
        List<LoteTimelineResponse.EventoLoteItem> eventos = new ArrayList<>();

        // Evento: Creación
        eventos.add(LoteTimelineResponse.EventoLoteItem.builder()
                .estadoAnterior(null)
                .estadoNuevo("Pendiente")
                .fechaEvento(lote.getFechaCreacion())
                .idUsuario(lote.getUsuarioCreador().getIdUsuario())
                .nombreUsuario(lote.getUsuarioCreador().getNombreCompleto())
                .descripcion("Lote creado con " + lote.getTotalItems() + " ítems por un monto de "
                        + lote.getMontoTotal())
                .build());

        // Evento: Procesamiento (si existe)
        if (lote.getFechaProcesamiento() != null && lote.getUsuarioSupervisor() != null) {
            String estadoFinal = lote.getEstadoLote().getNombreEstado();
            String descripcion = "Procesado".equals(estadoFinal)
                    ? "Lote procesado: " + lote.getItemsExitosos() + " exitosos, "
                      + lote.getItemsFallidos() + " fallidos"
                    : "Lote rechazado: " + lote.getMotivoRechazo();
            eventos.add(LoteTimelineResponse.EventoLoteItem.builder()
                    .estadoAnterior("Pendiente")
                    .estadoNuevo(estadoFinal)
                    .fechaEvento(lote.getFechaProcesamiento())
                    .idUsuario(lote.getUsuarioSupervisor().getIdUsuario())
                    .nombreUsuario(lote.getUsuarioSupervisor().getNombreCompleto())
                    .descripcion(descripcion)
                    .build());
        }

        return LoteTimelineResponse.builder()
                .idLote(lote.getIdLote())
                .nitEmpresa(lote.getNitEmpresa())
                .concepto(lote.getConcepto())
                .montoTotal(lote.getMontoTotal())
                .totalItems(lote.getTotalItems())
                .estadoActual(lote.getEstadoLote().getNombreEstado())
                .estadoFinal(lote.getEstadoLote().isEsEstadoFinal())
                .fechaCreacion(lote.getFechaCreacion())
                .eventos(eventos)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public LoteDashboardResponse obtenerDashboard(UserDetails caller) {
        String nitEmpresa = resolverNitEmpresaDesdeCaller(caller);
        String razonSocial = empresaRepo.findById(nitEmpresa)
                .map(e -> e.getRazonSocial()).orElse(nitEmpresa);

        long totalLotes      = loteRepo.findByNitEmpresa(nitEmpresa).size();
        long pendientes      = loteRepo.countByNitEmpresaAndEstado(nitEmpresa, "Pendiente");
        long enRevision      = loteRepo.countByNitEmpresaAndEstado(nitEmpresa, "En Revision");
        long aprobados       = loteRepo.countByNitEmpresaAndEstado(nitEmpresa, "Aprobado");
        long procesados      = loteRepo.countByNitEmpresaAndEstado(nitEmpresa, "Procesado");
        long rechazados      = loteRepo.countByNitEmpresaAndEstado(nitEmpresa, "Rechazado");

        BigDecimal montoHistorico   = loteRepo.sumMontoTotalByEmpresa(nitEmpresa);
        BigDecimal montoProcesado   = loteRepo.sumMontoProcesadoByEmpresa(nitEmpresa);
        BigDecimal montoPendiente   = loteRepo.sumMontoPendienteByEmpresa(nitEmpresa);
        long itemsExitosos          = loteRepo.sumItemsExitososByEmpresa(nitEmpresa);
        long itemsFallidos          = loteRepo.sumItemsFallidosByEmpresa(nitEmpresa);
        long totalItems             = itemsExitosos + itemsFallidos;
        double tasaExito            = totalItems > 0
                ? Math.round((double) itemsExitosos / totalItems * 10000.0) / 100.0 : 0.0;

        List<LoteTransferencia> ultimos = loteRepo.findTop5ByNitEmpresa(
                nitEmpresa, PageRequest.of(0, 5));

        log.info("Dashboard lotes — empresa={} total={} procesados={}", nitEmpresa, totalLotes, procesados);

        return LoteDashboardResponse.builder()
                .nitEmpresa(nitEmpresa)
                .razonSocialEmpresa(razonSocial)
                .totalLotes(totalLotes)
                .lotesPendientes(pendientes)
                .lotesEnRevision(enRevision)
                .lotesAprobados(aprobados)
                .lotesProcesados(procesados)
                .lotesRechazados(rechazados)
                .montoTotalHistorico(montoHistorico)
                .montoTotalProcesado(montoProcesado)
                .montoPendienteProcesamiento(montoPendiente)
                .totalTransferenciasEjecutadas(itemsExitosos)
                .totalTransferenciasFallidas(itemsFallidos)
                .tasaExitoItems(tasaExito)
                .ultimosLotes(ultimos.stream().map(this::toResponse).toList())
                .generadoEn(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    public LoteMetricasResponse obtenerMetricas() {
        long totalLotes = loteRepo.count();

        Map<String, Long> distribucion = new LinkedHashMap<>();
        for (String estado : List.of("Pendiente", "En Revision", "Aprobado", "Procesado", "Rechazado")) {
            distribucion.put(estado, loteRepo.countByEstado(estado));
        }

        long itemsExitosos = loteRepo.sumItemsExitosos();
        long itemsFallidos = loteRepo.sumItemsFallidos();
        long totalItems    = itemsExitosos + itemsFallidos;
        double tasaExitoItems = totalItems > 0
                ? Math.round((double) itemsExitosos / totalItems * 10000.0) / 100.0 : 0.0;

        long procesados  = distribucion.getOrDefault("Procesado", 0L);
        long rechazados  = distribucion.getOrDefault("Rechazado", 0L);
        double tasaExitoLotes   = totalLotes > 0
                ? Math.round((double) procesados / totalLotes * 10000.0) / 100.0 : 0.0;
        double tasaRechazoLotes = totalLotes > 0
                ? Math.round((double) rechazados / totalLotes * 10000.0) / 100.0 : 0.0;

        // Top 5 empresas por volumen
        List<Object[]> topRaw = loteRepo.findTopEmpresasPorVolumen(PageRequest.of(0, 5));
        List<LoteMetricasResponse.EmpresaResumenItem> topEmpresas = topRaw.stream().map(row -> {
            String nit = (String) row[0];
            BigDecimal monto = (BigDecimal) row[1];
            String razon = empresaRepo.findById(nit).map(e -> e.getRazonSocial()).orElse(nit);
            long lotesEmpresa = loteRepo.findByNitEmpresa(nit).size();
            return LoteMetricasResponse.EmpresaResumenItem.builder()
                    .nitEmpresa(nit)
                    .razonSocial(razon)
                    .totalLotes(lotesEmpresa)
                    .montoTotalProcesado(monto)
                    .build();
        }).toList();

        log.info("Métricas lotes generadas — total={} procesados={}", totalLotes, procesados);

        return LoteMetricasResponse.builder()
                .totalLotes(totalLotes)
                .distribucionPorEstado(distribucion)
                .totalItemsProcesados(itemsExitosos)
                .totalItemsFallidos(itemsFallidos)
                .montoTotalProcesado(Optional.ofNullable(loteRepo.sumMontoProcesado()).orElse(BigDecimal.ZERO))
                .montoPromedioPorLote(Optional.ofNullable(loteRepo.avgMontoTotal())
                        .orElse(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP))
                .montoMaximoLote(Optional.ofNullable(loteRepo.maxMontoTotal()).orElse(BigDecimal.ZERO))
                .montoMinimoLote(Optional.ofNullable(loteRepo.minMontoTotal()).orElse(BigDecimal.ZERO))
                .tasaExitoLotes(tasaExitoLotes)
                .tasaRechazoLotes(tasaRechazoLotes)
                .tasaExitoItems(tasaExitoItems)
                .topEmpresasPorVolumen(topEmpresas)
                .generadoEn(LocalDateTime.now())
                .build();
    }

    // ── Comandos ──────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public LoteTransferenciaDetalleResponse crearLote(CrearLoteTransferenciaRequest req,
                                                       UserDetails caller) {
        MDC.put("operacion", "crear_lote");
        MDC.put("nitEmpresa", req.getNitEmpresa());
        try {
            // 1. Ownership: el caller debe pertenecer a la empresa
            if (!esRolAdministrativo(caller)) {
                String nitCaller = resolverNitEmpresaDesdeCaller(caller);
                if (!req.getNitEmpresa().equals(nitCaller)) {
                    throw new UnauthorizedOperationException(
                            "Solo puede crear lotes para su propia empresa");
                }
            }

            // 2. Validar que la empresa existe
            empresaRepo.findById(req.getNitEmpresa())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "ClienteEmpresa", req.getNitEmpresa()));

            // 3. Anti-duplicados: mismo concepto en últimas 24 horas
            LocalDateTime desde = LocalDateTime.now().minus(24, ChronoUnit.HOURS);
            long duplicados = loteRepo.countPosiblesDuplicados(
                    req.getNitEmpresa(), req.getConcepto(), desde);
            if (duplicados > 0) {
                throw new BusinessRuleException(
                        "Ya existe un lote con el mismo concepto en las últimas 24 horas. "
                        + "Verifique si es un duplicado.");
            }

            // 4. Validar que el lote no está vacío
            if (req.getTransferencias() == null || req.getTransferencias().isEmpty()) {
                throw new BusinessRuleException("El lote debe contener al menos una transferencia");
            }

            // 5. Validar cuentas activas y calcular monto total
            BigDecimal montoTotal = BigDecimal.ZERO;
            for (int i = 0; i < req.getTransferencias().size(); i++) {
                var item = req.getTransferencias().get(i);
                if (item.getCuentaOrigen().equals(item.getCuentaDestino())) {
                    throw new BusinessRuleException(
                            "Ítem " + (i + 1) + ": cuenta origen y destino no pueden ser iguales");
                }
                CuentaBancaria origen = cuentaRepo.findById(item.getCuentaOrigen())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "CuentaBancaria", item.getCuentaOrigen()));
                if (!"Activa".equals(origen.getEstadoCuenta().getNombreEstado())) {
                    throw new BusinessRuleException(
                            "Ítem " + (i + 1) + ": cuenta origen " + item.getCuentaOrigen()
                            + " no está activa");
                }
                if (!cuentaRepo.existsByNumeroCuenta(item.getCuentaDestino())) {
                    throw new ResourceNotFoundException("CuentaBancaria", item.getCuentaDestino());
                }
                montoTotal = montoTotal.add(item.getMonto());
            }

            // 6. Llamar al SP para crear el lote
            // El SP inserta el lote y todos sus detalles en una transacción atómica
            String detallesJson = buildDetallesJson(req.getTransferencias());
            jdbcTemplate.update(
                    "CALL sp_crear_lote_transferencia(?, ?, ?, ?, @p_id_lote)",
                    req.getNitEmpresa(),
                    req.getConcepto(),
                    req.getIdUsuarioCreador(),
                    detallesJson
            );
            Long idLote = jdbcTemplate.queryForObject("SELECT @p_id_lote", Long.class);

            log.info("Lote creado id={} empresa={} items={} monto={}",
                    idLote, req.getNitEmpresa(), req.getTransferencias().size(), montoTotal);

            return obtenerDetalle(idLote, caller);
        } finally {
            MDC.remove("operacion");
            MDC.remove("nitEmpresa");
        }
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    public LoteTransferenciaDetalleResponse procesarLote(Long idLote, ProcesarLoteRequest req) {
        MDC.put("operacion", "procesar_lote");
        MDC.put("idLote", String.valueOf(idLote));
        try {
            LoteTransferencia lote = findOrThrow(idLote);

            // Validar estado: solo Pendiente o Aprobado puede procesarse
            String estadoActual = lote.getEstadoLote().getNombreEstado();
            if (!List.of("Pendiente", "Aprobado").contains(estadoActual)) {
                throw new BusinessRuleException(
                        "Solo lotes en estado 'Pendiente' o 'Aprobado' pueden procesarse. "
                        + "Estado actual: " + estadoActual);
            }

            // Validar que el supervisor existe
            usuarioRepo.findById(req.getIdSupervisor())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Usuario supervisor", req.getIdSupervisor()));

            jdbcTemplate.update("CALL sp_procesar_lote_transferencia(?, ?)",
                    idLote, req.getIdSupervisor());

            log.info("Lote id={} procesado por supervisor id={}", idLote, req.getIdSupervisor());

            return obtenerDetalle(idLote, null);
        } finally {
            MDC.remove("operacion");
            MDC.remove("idLote");
        }
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    public LoteTransferenciaDetalleResponse rechazarLote(Long idLote, RechazarLoteRequest req) {
        MDC.put("operacion", "rechazar_lote");
        MDC.put("idLote", String.valueOf(idLote));
        try {
            LoteTransferencia lote = findOrThrow(idLote);

            // Validar estado: solo estados no finales pueden rechazarse
            if (lote.getEstadoLote().isEsEstadoFinal()) {
                throw new BusinessRuleException(
                        "No se puede rechazar un lote en estado final: "
                        + lote.getEstadoLote().getNombreEstado());
            }

            // Validar que el supervisor existe
            usuarioRepo.findById(req.getIdSupervisor())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Usuario supervisor", req.getIdSupervisor()));

            // Actualizar estado del lote directamente (no hay SP de rechazo separado)
            jdbcTemplate.update(
                    "UPDATE lote_transferencia l "
                    + "JOIN cat_estado_lote e ON e.nombre_estado = 'Rechazado' "
                    + "SET l.id_estado_lote = e.id_estado_lote, "
                    + "    l.id_usuario_supervisor = ?, "
                    + "    l.motivo_rechazo = ?, "
                    + "    l.fecha_procesamiento = NOW(), "
                    + "    l.fecha_modificacion = NOW() "
                    + "WHERE l.id_lote = ?",
                    req.getIdSupervisor(), req.getMotivo(), idLote
            );

            log.info("Lote id={} rechazado por supervisor id={} motivo={}",
                    idLote, req.getIdSupervisor(), req.getMotivo());

            return obtenerDetalle(idLote, null);
        } finally {
            MDC.remove("operacion");
            MDC.remove("idLote");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private LoteTransferencia findOrThrow(Long idLote) {
        return loteRepo.findById(idLote)
                .orElseThrow(() -> new ResourceNotFoundException("LoteTransferencia", idLote));
    }

    private void validarOwnership(LoteTransferencia lote, UserDetails caller) {
        if (caller == null || esRolAdministrativo(caller)) return;
        String nitCaller = resolverNitEmpresaDesdeCaller(caller);
        if (!lote.getNitEmpresa().equals(nitCaller)) {
            log.warn("Acceso no autorizado a lote={} caller={}", lote.getIdLote(), caller.getUsername());
            throw new UnauthorizedOperationException(
                    "No tiene permisos para acceder a este lote");
        }
    }

    private boolean esRolAdministrativo(UserDetails caller) {
        return caller.getAuthorities().stream()
                .anyMatch(a -> ROLES_ADMIN.contains(a.getAuthority()));
    }

    private String resolverNitEmpresaDesdeCaller(UserDetails caller) {
        String correo = caller.getUsername();
        return empresaRepo.findByCorreoElectronico(correo)
                .map(e -> e.getNit())
                .orElseThrow(() -> new BusinessRuleException(
                        "El usuario autenticado no está asociado a ninguna empresa"));
    }

    /**
     * Construye el JSON de detalles para el stored procedure sp_crear_lote_transferencia.
     * Formato: [{"cuenta_origen":"...","cuenta_destino":"...","monto":...,"concepto":"..."},...]
     */
    private String buildDetallesJson(
            List<CrearLoteTransferenciaRequest.DetalleTransferenciaItem> items) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < items.size(); i++) {
            var item = items.get(i);
            if (i > 0) sb.append(",");
            sb.append("{")
              .append("\"cuenta_origen\":\"").append(item.getCuentaOrigen()).append("\",")
              .append("\"cuenta_destino\":\"").append(item.getCuentaDestino()).append("\",")
              .append("\"monto\":").append(item.getMonto()).append(",")
              .append("\"concepto\":\"")
              .append(item.getConceptoDetalle() != null
                      ? item.getConceptoDetalle().replace("\"", "'") : "")
              .append("\"")
              .append("}");
        }
        sb.append("]");
        return sb.toString();
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private LoteTransferenciaResponse toResponse(LoteTransferencia l) {
        String razonSocial = empresaRepo.findById(l.getNitEmpresa())
                .map(e -> e.getRazonSocial()).orElse(l.getNitEmpresa());
        return LoteTransferenciaResponse.builder()
                .idLote(l.getIdLote())
                .nitEmpresa(l.getNitEmpresa())
                .razonSocialEmpresa(razonSocial)
                .concepto(l.getConcepto())
                .estadoLote(l.getEstadoLote().getNombreEstado())
                .estadoFinal(l.getEstadoLote().isEsEstadoFinal())
                .totalItems(l.getTotalItems())
                .itemsExitosos(l.getItemsExitosos())
                .itemsFallidos(l.getItemsFallidos())
                .montoTotal(l.getMontoTotal())
                .montoProcesado(l.getMontoProcesado())
                .idUsuarioCreador(l.getUsuarioCreador().getIdUsuario())
                .nombreUsuarioCreador(l.getUsuarioCreador().getNombreCompleto())
                .fechaCreacion(l.getFechaCreacion())
                .fechaProcesamiento(l.getFechaProcesamiento())
                .build();
    }

    private LoteTransferenciaDetalleResponse toDetalleResponse(
            LoteTransferencia l, List<DetalleLoteTransferencia> detalles) {
        String razonSocial = empresaRepo.findById(l.getNitEmpresa())
                .map(e -> e.getRazonSocial()).orElse(l.getNitEmpresa());

        int exitosos = l.getItemsExitosos() != null ? l.getItemsExitosos() : 0;
        int fallidos = l.getItemsFallidos() != null ? l.getItemsFallidos() : 0;
        int total    = l.getTotalItems() != null ? l.getTotalItems() : 0;
        double pctExito = total > 0
                ? Math.round((double) exitosos / total * 10000.0) / 100.0 : 0.0;

        return LoteTransferenciaDetalleResponse.builder()
                .idLote(l.getIdLote())
                .nitEmpresa(l.getNitEmpresa())
                .razonSocialEmpresa(razonSocial)
                .concepto(l.getConcepto())
                .estadoLote(l.getEstadoLote().getNombreEstado())
                .estadoFinal(l.getEstadoLote().isEsEstadoFinal())
                .motivoRechazo(l.getMotivoRechazo())
                .totalItems(total)
                .itemsExitosos(exitosos)
                .itemsFallidos(fallidos)
                .montoTotal(l.getMontoTotal())
                .montoProcesado(l.getMontoProcesado())
                .porcentajeExito(pctExito)
                .idUsuarioCreador(l.getUsuarioCreador().getIdUsuario())
                .nombreUsuarioCreador(l.getUsuarioCreador().getNombreCompleto())
                .idUsuarioSupervisor(l.getUsuarioSupervisor() != null
                        ? l.getUsuarioSupervisor().getIdUsuario() : null)
                .nombreUsuarioSupervisor(l.getUsuarioSupervisor() != null
                        ? l.getUsuarioSupervisor().getNombreCompleto() : null)
                .fechaCreacion(l.getFechaCreacion())
                .fechaProcesamiento(l.getFechaProcesamiento())
                .fechaModificacion(l.getFechaModificacion())
                .detalles(detalles.stream().map(this::toDetalleItemResponse).toList())
                .build();
    }

    private LoteTransferenciaDetalleResponse.DetalleItemResponse toDetalleItemResponse(
            DetalleLoteTransferencia d) {
        return LoteTransferenciaDetalleResponse.DetalleItemResponse.builder()
                .idDetalle(d.getIdDetalle())
                .orden(d.getOrden())
                .cuentaOrigen(d.getCuentaOrigen())
                .cuentaDestino(d.getCuentaDestino())
                .monto(d.getMonto())
                .conceptoDetalle(d.getConceptoDetalle())
                .estadoDetalle(d.getEstadoDetalle().getNombreEstado())
                .idTransferenciaGenerada(d.getIdTransferenciaGenerada())
                .mensajeError(d.getMensajeError())
                .build();
    }
}
