package com.banco.ddd.application.service;

import com.banco.ddd.application.dto.request.AprobarPrestamoRequest;
import com.banco.ddd.application.dto.request.DesembolsarPrestamoRequest;
import com.banco.ddd.application.dto.request.RechazarPrestamoRequest;
import com.banco.ddd.application.dto.request.SolicitarPrestamoRequest;
import com.banco.ddd.application.dto.response.PrestamoDashboardResponse;
import com.banco.ddd.application.dto.response.PrestamoDetalleResponse;
import com.banco.ddd.application.dto.response.PrestamoMetricasResponse;
import com.banco.ddd.application.dto.response.PrestamoResponse;
import com.banco.ddd.application.dto.response.PrestamoTimelineResponse;
import com.banco.ddd.application.port.in.PrestamoUseCase;
import com.banco.ddd.domain.exception.BusinessRuleException;
import com.banco.ddd.domain.exception.ResourceNotFoundException;
import com.banco.ddd.domain.exception.UnauthorizedOperationException;
import com.banco.ddd.domain.model.Prestamo;
import com.banco.ddd.domain.model.PrestamoTransicionEstado;
import com.banco.ddd.infrastructure.adapter.out.persistence.ClienteEmpresaRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.ClientePersonaNaturalRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.PrestamoRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.PrestamoTransicionRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.UsuarioRepository;
import com.banco.ddd.shared.response.PagedResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Caso de uso: Gestión de préstamos (BC-04).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PrestamoService implements PrestamoUseCase {

    private final PrestamoRepository                prestamoRepo;
    private final PrestamoTransicionRepository      transicionRepo;
    private final ClientePersonaNaturalRepository   personaRepo;
    private final ClienteEmpresaRepository          empresaRepo;
    private final UsuarioRepository                 usuarioRepo;
    private final JdbcTemplate                      jdbcTemplate;

    @Value("${prestamo.monto.max:10000000}")
    private BigDecimal montoMaximoConfigurado;

    private static final Set<String> ROLES_ADMIN = Set.of(
            "ROLE_ADMINISTRADOR", "ROLE_ANALISTA_INTERNO",
            "ROLE_SUPERVISOR_EMPRESA"
    );
    // ── Consultas ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<PrestamoResponse> historial(String estado,
                                                     String idCliente,
                                                     String tipoPrestamo,
                                                     Pageable pageable,
                                                     UserDetails caller) {
        // Restringir a su propio cliente si el caller no es administrativo
        if (!esRolAdministrativo(caller)) {
            String idCaller = resolverIdClienteDesdeCaller(caller);
            if (idCliente == null) idCliente = idCaller;
            else if (!idCliente.equals(idCaller)) {
                throw new UnauthorizedOperationException("Solo puede consultar su propio historial");
            }
        }

        Page<PrestamoResponse> page = prestamoRepo.findHistorial(estado, idCliente, tipoPrestamo, pageable)
                .map(this::toResponse);
        log.debug("Historial préstamos — caller={} estado={} cliente={} total={}",
                caller.getUsername(), estado, idCliente, page.getTotalElements());
        return new PagedResponse<>(page);
    }

    @Override
    @Transactional(readOnly = true)
    public PrestamoDetalleResponse obtenerDetalle(Long id, UserDetails caller) {
        Prestamo p = prestamoRepo.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prestamo", id));
        validarOwnership(p, caller);
        return toDetalleResponse(p);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrestamoResponse> prestamosPorCliente(String idCliente, UserDetails caller) {
        if (!esRolAdministrativo(caller)) {
            String idCaller = resolverIdClienteDesdeCaller(caller);
            if (!idCliente.equals(idCaller)) throw new UnauthorizedOperationException("No puede consultar préstamos de otro cliente");
        }
        return prestamoRepo.findByIdClienteSolicitante(idCliente).stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PrestamoTimelineResponse obtenerTimeline(Long id, UserDetails caller) {
        Prestamo p = findOrThrow(id);
        validarOwnership(p, caller);
        List<PrestamoTransicionEstado> transiciones = transicionRepo.findByIdPrestamoOrdenado(id);
        return buildTimelineResponse(p, transiciones);
    }

    @Override
    @Transactional(readOnly = true)
    public PrestamoDashboardResponse obtenerDashboard(UserDetails caller) {
        String idCliente = resolverIdClienteDesdeCaller(caller);
        List<Prestamo> prestamos = prestamoRepo.findByIdClienteSolicitante(idCliente);

        long totalSolicitados = prestamos.size();
        long totalAprobados = prestamos.stream()
                .filter(p -> "Aprobado".equals(p.getEstadoPrestamo().getNombreEstado())).count();
        long totalDesembolsados = prestamos.stream()
                .filter(p -> "Desembolsado".equals(p.getEstadoPrestamo().getNombreEstado())).count();
        long totalRechazados = prestamos.stream()
                .filter(p -> "Rechazado".equals(p.getEstadoPrestamo().getNombreEstado())).count();
        long totalCancelados = prestamos.stream()
                .filter(p -> "Cancelado".equals(p.getEstadoPrestamo().getNombreEstado())).count();

        BigDecimal deudaTotalActiva = prestamos.stream()
                .filter(p -> "Desembolsado".equals(p.getEstadoPrestamo().getNombreEstado()))
                .map(p -> p.getMontoAprobado() == null ? BigDecimal.ZERO : p.getMontoAprobado())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal montoTotalSolicitado = prestamos.stream()
                .map(Prestamo::getMontoSolicitado)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal montoTotalAprobado = prestamos.stream()
                .map(p -> p.getMontoAprobado() == null ? BigDecimal.ZERO : p.getMontoAprobado())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<PrestamoDashboardResponse.PrestamoResumenItem> activos = prestamos.stream()
                .filter(p -> "Desembolsado".equals(p.getEstadoPrestamo().getNombreEstado()))
                .map(this::toResumenItem)
                .toList();

        List<PrestamoDashboardResponse.PrestamoResumenItem> enProceso = prestamos.stream()
                .filter(p -> "Solicitado".equals(p.getEstadoPrestamo().getNombreEstado()) || "Aprobado".equals(p.getEstadoPrestamo().getNombreEstado()))
                .map(this::toResumenItem)
                .toList();

        return PrestamoDashboardResponse.builder()
                .idCliente(idCliente)
                .nombreCliente(resolverNombreCliente(idCliente))
                .totalSolicitados((int) totalSolicitados)
                .totalAprobados((int) totalAprobados)
                .totalDesembolsados((int) totalDesembolsados)
                .totalRechazados((int) totalRechazados)
                .totalCancelados((int) totalCancelados)
                .deudaTotalActiva(deudaTotalActiva)
                .montoTotalSolicitado(montoTotalSolicitado)
                .montoTotalAprobado(montoTotalAprobado)
                .montoPendienteDesembolso(montoTotalAprobado.subtract(deudaTotalActiva))
                .prestamosActivos(activos)
                .prestamosEnProceso(enProceso)
                .generadoEn(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    public PrestamoMetricasResponse obtenerMetricas() {
        long total = prestamoRepo.count();
        Map<String, Long> distribucion = prestamoRepo.countByTipoPrestamo().stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (Long) r[1]));

        PrestamoMetricasResponse.PrestamoMetricasResponseBuilder builder = PrestamoMetricasResponse.builder()
                .totalPrestamos(total)
                .distribucionPorTipo(distribucion)
                .montoTotalSolicitado(prestamoRepo.sumMontoTotalSolicitado())
                .montoPromedioAprobado(prestamoRepo.avgMontoAprobado())
                .montoMaximoAprobado(prestamoRepo.maxMontoAprobado())
                .montoMinimoAprobado(prestamoRepo.minMontoAprobado())
                .carteraTotalActiva(prestamoRepo.sumMontoAprobadoByEstado("Desembolsado"))
                .montoTotalAprobado(prestamoRepo.sumMontoAprobadoByEstado("Aprobado"));

        // Distribución por estado
        Map<String, Long> distribEstado = Map.of(
                "Solicitado", prestamoRepo.countByEstado("Solicitado"),
                "Aprobado", prestamoRepo.countByEstado("Aprobado"),
                "Desembolsado", prestamoRepo.countByEstado("Desembolsado")
        );

        return builder.distribucionPorEstado(distribEstado)
                .generadoEn(LocalDateTime.now())
                .build();
    }

    // ── Comandos ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public PrestamoDetalleResponse solicitarPrestamo(SolicitarPrestamoRequest req, UserDetails caller) {
        MDC.put("operacion", "solicitar_prestamo");
        MDC.put("cliente", req.getIdClienteSolicitante());
        try {
            // Ownership: si es cliente, solo puede solicitar en su propio id
            if (!esRolAdministrativo(caller)) {
                String idCaller = resolverIdClienteDesdeCaller(caller);
                if (!req.getIdClienteSolicitante().equals(idCaller)) {
                    throw new UnauthorizedOperationException("No puede solicitar préstamos para otro cliente");
                }
            }

            // Anti-duplicados: verificar en últimos 30 días
            LocalDateTime desde = LocalDateTime.now().minus(30, ChronoUnit.DAYS);
            long posibles = prestamoRepo.countPosiblesDuplicados(req.getIdClienteSolicitante(), req.getNombreTipoPrestamo(), desde);
            if (posibles > 0) {
                throw new BusinessRuleException("Existe una solicitud reciente similar. Evite duplicados.");
            }

            // Validación soft de monto
            if (req.getMontoSolicitado().compareTo(montoMaximoConfigurado) > 0) {
                throw new BusinessRuleException("El monto solicitado supera el máximo permitido");
            }

            // Llamada al stored procedure (idempotencia: SP debe manejarla)
            jdbcTemplate.update(
                    "CALL sp_solicitar_prestamo(?, ?, ?, ?, ?, @p_id_nuevo)",
                    req.getIdClienteSolicitante(),
                    req.getTipoCliente(),
                    req.getNombreTipoPrestamo(),
                    req.getMontoSolicitado(),
                    req.getIdUsuarioSolicitante()
            );
            Long idNuevo = jdbcTemplate.queryForObject("SELECT @p_id_nuevo", Long.class);
            log.info("Préstamo solicitado id={} cliente={}", idNuevo, req.getIdClienteSolicitante());

            return obtenerDetalle(idNuevo, caller);
        } finally {
            MDC.remove("operacion");
            MDC.remove("cliente");
        }
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','ADMINISTRADOR')")
    public PrestamoDetalleResponse aprobarPrestamo(Long id, AprobarPrestamoRequest request) {
        MDC.put("operacion", "aprobar_prestamo");
        MDC.put("idPrestamo", String.valueOf(id));
        try {
            Prestamo p = findOrThrow(id);
            // Acepta tanto 'Solicitado' como 'En Revision'
            String estado = p.getEstadoPrestamo().getNombreEstado();
            if (!"Solicitado".equals(estado) && !"En Revision".equals(estado)) {
                throw new BusinessRuleException(
                        "Solo préstamos en estado 'Solicitado' o 'En Revision' pueden aprobarse. Estado actual: " + estado);
            }

            if (request.getMontoAprobado().compareTo(montoMaximoConfigurado) > 0) {
                throw new BusinessRuleException("El monto aprobado excede el máximo configurado");
            }

            jdbcTemplate.update("CALL sp_aprobar_prestamo(?, ?, ?, ?, ?, ?)",
                    id,
                    request.getIdAnalista(),
                    request.getMontoAprobado(),
                    request.getTasaInteres(),
                    request.getPlazoMeses(),
                    request.getCuentaDestinoDesembolso()
            );

            log.info("Préstamo id={} aprobado por analista id={}", id, request.getIdAnalista());
            return obtenerDetalle(id, null);
        } finally {
            MDC.remove("operacion");
            MDC.remove("idPrestamo");
        }
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyRole('ANALISTA_INTERNO','ADMINISTRADOR')")
    public PrestamoDetalleResponse rechazarPrestamo(Long id, RechazarPrestamoRequest request) {
        MDC.put("operacion", "rechazar_prestamo");
        MDC.put("idPrestamo", String.valueOf(id));
        try {
            findOrThrow(id);
            jdbcTemplate.update("CALL sp_rechazar_prestamo(?, ?, ?)", id, request.getIdAnalista(), request.getMotivo());
            log.info("Préstamo id={} rechazado por analista={}", id, request.getIdAnalista());
            return obtenerDetalle(id, null);
        } finally {
            MDC.remove("operacion");
            MDC.remove("idPrestamo");
        }
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyRole('SUPERVISOR_EMPRESA','ADMINISTRADOR')")
    public PrestamoDetalleResponse desembolsarPrestamo(Long id, DesembolsarPrestamoRequest request) {
        MDC.put("operacion", "desembolsar_prestamo");
        MDC.put("idPrestamo", String.valueOf(id));
        try {
            Prestamo p = findOrThrow(id);
            if (!"Aprobado".equals(p.getEstadoPrestamo().getNombreEstado())) {
                throw new BusinessRuleException("Solo préstamos en estado 'Aprobado' pueden desembolsarse");
            }

            jdbcTemplate.update("CALL sp_desembolsar_prestamo(?, ?)", id, request.getIdSupervisor());
            log.info("Préstamo id={} desembolsado por supervisor={}", id, request.getIdSupervisor());
            return obtenerDetalle(id, null);
        } finally {
            MDC.remove("operacion");
            MDC.remove("idPrestamo");
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Prestamo findOrThrow(Long id) {
        return prestamoRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prestamo", id));
    }

    private PrestamoResponse toResponse(Prestamo p) {
        return PrestamoResponse.builder()
                .idPrestamo(p.getIdPrestamo())
                .tipoPrestamo(p.getTipoPrestamo().getNombreTipo())
                .idClienteSolicitante(p.getIdClienteSolicitante())
                .tipoCliente(p.getTipoCliente().name())
                .montoSolicitado(p.getMontoSolicitado())
                .montoAprobado(p.getMontoAprobado())
                .tasaInteres(p.getTasaInteres())
                .plazoMeses(p.getPlazoMeses())
                .estadoPrestamo(p.getEstadoPrestamo().getNombreEstado())
                .idUsuarioSolicitante(p.getUsuarioSolicitante().getIdUsuario())
                .idAnalistaAprobador(p.getAnalistaAprobador() != null
                        ? p.getAnalistaAprobador().getIdUsuario() : null)
                .fechaSolicitud(p.getFechaSolicitud())
                .fechaAprobacion(p.getFechaAprobacion())
                .fechaDesembolso(p.getFechaDesembolso())
                .cuentaDestinoDesembolso(p.getCuentaDestinoDesembolso())
                .build();
    }

    private PrestamoDetalleResponse toDetalleResponse(Prestamo p) {
        BigDecimal cuota = null;
        if (p.getMontoAprobado() != null && p.getTasaInteres() != null && p.getPlazoMeses() != null) {
            try {
                // Supone tasa mensual en decimal (ej. 0.015)
                BigDecimal r = p.getTasaInteres();
                int n = p.getPlazoMeses();
                BigDecimal numerator = p.getMontoAprobado().multiply(r);
                BigDecimal denom = BigDecimal.ONE.subtract(
                        BigDecimal.ONE.add(r).pow(-n));
                cuota = numerator.divide(denom, 2, BigDecimal.ROUND_HALF_UP);
            } catch (Exception e) {
                cuota = null;
            }
        }

        return PrestamoDetalleResponse.builder()
                .idPrestamo(p.getIdPrestamo())
                .tipoPrestamo(p.getTipoPrestamo().getNombreTipo())
                .idClienteSolicitante(p.getIdClienteSolicitante())
                .nombreClienteSolicitante(resolverNombreCliente(p.getIdClienteSolicitante()))
                .tipoCliente(p.getTipoCliente().name())
                .montoSolicitado(p.getMontoSolicitado())
                .montoAprobado(p.getMontoAprobado())
                .tasaInteres(p.getTasaInteres())
                .plazoMeses(p.getPlazoMeses())
                .cuotaMensualEstimada(cuota)
                .estadoPrestamo(p.getEstadoPrestamo().getNombreEstado())
                .estadoFinal(List.of("Desembolsado", "Rechazado", "Cancelado").contains(p.getEstadoPrestamo().getNombreEstado()))
                .cuentaDestinoDesembolso(p.getCuentaDestinoDesembolso())
                .idUsuarioSolicitante(p.getUsuarioSolicitante() != null ? p.getUsuarioSolicitante().getIdUsuario() : null)
                .nombreUsuarioSolicitante(p.getUsuarioSolicitante() != null ? p.getUsuarioSolicitante().getNombreCompleto() : null)
                .idAnalistaAprobador(p.getAnalistaAprobador() != null ? p.getAnalistaAprobador().getIdUsuario() : null)
                .nombreAnalistaAprobador(p.getAnalistaAprobador() != null ? p.getAnalistaAprobador().getNombreCompleto() : null)
                .fechaSolicitud(p.getFechaSolicitud())
                .fechaAprobacion(p.getFechaAprobacion())
                .fechaDesembolso(p.getFechaDesembolso())
                .fechaModificacion(p.getFechaModificacion())
                .build();
    }

    private PrestamoTimelineResponse buildTimelineResponse(Prestamo p, List<PrestamoTransicionEstado> transiciones) {
        List<PrestamoTimelineResponse.TransicionEstadoItem> items = transiciones.stream().map(t ->
                PrestamoTimelineResponse.TransicionEstadoItem.builder()
                        .estadoAnterior(t.getEstadoAnterior() != null ? t.getEstadoAnterior().getNombreEstado() : null)
                        .estadoNuevo(t.getEstadoNuevo() != null ? t.getEstadoNuevo().getNombreEstado() : null)
                        .fechaTransicion(t.getFechaTransicion())
                        .idUsuario(t.getUsuario() != null ? t.getUsuario().getIdUsuario() : null)
                        .nombreUsuario(t.getUsuario() != null ? t.getUsuario().getNombreCompleto() : null)
                        .observaciones(t.getObservaciones())
                        .build()
        ).toList();

        return PrestamoTimelineResponse.builder()
                .idPrestamo(p.getIdPrestamo())
                .tipoPrestamo(p.getTipoPrestamo().getNombreTipo())
                .idClienteSolicitante(p.getIdClienteSolicitante())
                .montoSolicitado(p.getMontoSolicitado())
                .montoAprobado(p.getMontoAprobado())
                .estadoActual(p.getEstadoPrestamo().getNombreEstado())
                .estadoFinal(List.of("Desembolsado", "Rechazado", "Cancelado").contains(p.getEstadoPrestamo().getNombreEstado()))
                .fechaSolicitud(p.getFechaSolicitud())
                .transiciones(items)
                .build();
    }

    private PrestamoDashboardResponse.PrestamoResumenItem toResumenItem(Prestamo p) {
        return PrestamoDashboardResponse.PrestamoResumenItem.builder()
                .idPrestamo(p.getIdPrestamo())
                .tipoPrestamo(p.getTipoPrestamo().getNombreTipo())
                .montoSolicitado(p.getMontoSolicitado())
                .montoAprobado(p.getMontoAprobado())
                .tasaInteres(p.getTasaInteres())
                .plazoMeses(p.getPlazoMeses())
                .cuotaMensual(p.getMontoAprobado())
                .estadoPrestamo(p.getEstadoPrestamo().getNombreEstado())
                .fechaSolicitud(p.getFechaSolicitud())
                .fechaDesembolso(p.getFechaDesembolso())
                .build();
    }

    private void validarOwnership(Prestamo p, UserDetails caller) {
        if (caller == null) return; // operación interna administrativa
        if (esRolAdministrativo(caller)) return;

        String idCaller = resolverIdClienteDesdeCaller(caller);
        if (!p.getIdClienteSolicitante().equals(idCaller)) {
            log.warn("Acceso no autorizado a préstamo={} caller={}", p.getIdPrestamo(), caller.getUsername());
            throw new UnauthorizedOperationException("No tiene permisos para acceder a este préstamo");
        }
    }

    private boolean esRolAdministrativo(UserDetails caller) {
        return caller.getAuthorities().stream().anyMatch(a -> ROLES_ADMIN.contains(a.getAuthority()));
    }

    private String resolverIdClienteDesdeCaller(UserDetails caller) {
        String correo = caller.getUsername();
        var persona = personaRepo.findByCorreoElectronico(correo);
        if (persona.isPresent()) return persona.get().getIdIdentificacion();
        var empresa = empresaRepo.findByCorreoElectronico(correo);
        if (empresa.isPresent()) return empresa.get().getNit();
        if (caller instanceof com.banco.ddd.domain.model.Usuario usuario) return String.valueOf(usuario.getIdUsuario());
        throw new BusinessRuleException("No se pudo determinar el cliente desde el usuario autenticado");
    }

    private String resolverNombreCliente(String idCliente) {
        return personaRepo.findById(idCliente)
                .map(p -> p.getNombreCompleto())
                .orElseGet(() -> empresaRepo.findById(idCliente)
                        .map(e -> e.getRazonSocial()).orElse(idCliente));
    }

}
