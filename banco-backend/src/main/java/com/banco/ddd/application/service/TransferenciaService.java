package com.banco.ddd.application.service;

import com.banco.ddd.application.dto.request.CrearTransferenciaRequest;
import com.banco.ddd.application.dto.request.RechazarTransferenciaRequest;
import com.banco.ddd.application.dto.response.*;
import com.banco.ddd.application.port.in.TransferenciaUseCase;
import com.banco.ddd.domain.exception.BusinessRuleException;
import com.banco.ddd.domain.exception.ResourceNotFoundException;
import com.banco.ddd.domain.exception.UnauthorizedOperationException;
import com.banco.ddd.domain.model.CuentaBancaria;
import com.banco.ddd.domain.model.Transferencia;
import com.banco.ddd.domain.model.TransferenciaTransicionEstado;
import com.banco.ddd.infrastructure.adapter.out.persistence.CuentaBancariaRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.TransferenciaRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.TransferenciaTransicionRepository;
import com.banco.ddd.shared.response.PagedResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Caso de uso: Gestión de transferencias bancarias (BC-05).
 *
 * <p>Toda la lógica crítica (saldo, umbrales, estados, vencimiento) reside
 * en los stored procedures y triggers MySQL. Este servicio orquesta:
 * validación de ownership, prevención de duplicados, delegación a SPs
 * y construcción de respuestas enriquecidas.</p>
 *
 * <p>Stored procedures consumidos:</p>
 * <ul>
 *   <li>{@code sp_ejecutar_transferencia}          — ejecuta transferencia pendiente</li>
 *   <li>{@code sp_ejecutar_transferencia_interna}  — ejecución interna post-aprobación</li>
 *   <li>{@code sp_aprobar_transferencia}           — aprueba y ejecuta</li>
 *   <li>{@code sp_rechazar_transferencia}          — rechaza con motivo</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TransferenciaService implements TransferenciaUseCase {

    private static final int    VENTANA_DUPLICADOS_SEGUNDOS = 60;
    private static final Set<String> ROLES_ADMIN = Set.of(
            "ROLE_ADMINISTRADOR", "ROLE_ANALISTA_INTERNO",
            "ROLE_SUPERVISOR_EMPRESA", "ROLE_EMPLEADO_VENTANILLA"
    );
    private static final List<String> ESTADOS_ACTIVOS = List.of(
            "Pendiente", "En Espera de Aprobacion", "Aprobada"
    );

    private final TransferenciaRepository        transferenciaRepo;
    private final TransferenciaTransicionRepository transicionRepo;
    private final CuentaBancariaRepository       cuentaRepo;
    private final JdbcTemplate                   jdbcTemplate;

    // ── Consultas ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<TransferenciaResponse> historial(String estado,
                                                           String cuentaOrigen,
                                                           String cuentaDestino,
                                                           Pageable pageable,
                                                           UserDetails caller) {
        // Clientes solo ven sus propias cuentas
        if (!esRolAdministrativo(caller)) {
            List<String> misCuentas = resolverCuentasDeCaller(caller);
            if (cuentaOrigen != null && !misCuentas.contains(cuentaOrigen)) {
                throw new UnauthorizedOperationException(
                        "No tiene permisos para consultar esa cuenta origen");
            }
            if (cuentaDestino != null && !misCuentas.contains(cuentaDestino)) {
                throw new UnauthorizedOperationException(
                        "No tiene permisos para consultar esa cuenta destino");
            }
        }
        Page<TransferenciaResponse> page = transferenciaRepo
                .findHistorial(estado, cuentaOrigen, cuentaDestino, pageable)
                .map(this::toResponse);
        return new PagedResponse<>(page);
    }

    @Override
    @Transactional(readOnly = true)
    public TransferenciaDetalleResponse obtenerDetalle(Long id, UserDetails caller) {
        Transferencia t = transferenciaRepo.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transferencia", id));
        validarOwnershipTransferencia(t, caller);
        return toDetalleResponse(t);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<TransferenciaResponse> porCuenta(String accountNumber,
                                                           Pageable pageable,
                                                           UserDetails caller) {
        if (!esRolAdministrativo(caller)) {
            List<String> misCuentas = resolverCuentasDeCaller(caller);
            if (!misCuentas.contains(accountNumber)) {
                throw new UnauthorizedOperationException(
                        "No tiene permisos para consultar transferencias de esa cuenta");
            }
        }
        return new PagedResponse<>(
                transferenciaRepo.findByCuenta(accountNumber, pageable).map(this::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<TransferenciaResponse> pendientesAprobacion(Pageable pageable) {
        return new PagedResponse<>(
                transferenciaRepo.findPendientesAprobacion(pageable).map(this::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public TransferenciaTimelineResponse obtenerTimeline(Long id, UserDetails caller) {
        Transferencia t = findOrThrow(id);
        validarOwnershipTransferencia(t, caller);

        List<TransferenciaTransicionEstado> transiciones =
                transicionRepo.findByIdTransferenciaOrdenado(id);

        List<TransferenciaTimelineResponse.TransicionEstadoItem> items = transiciones.stream()
                .map(tr -> TransferenciaTimelineResponse.TransicionEstadoItem.builder()
                        .estadoAnterior(tr.getEstadoAnterior() != null
                                ? tr.getEstadoAnterior().getNombreEstado() : "INICIO")
                        .estadoNuevo(tr.getEstadoNuevo().getNombreEstado())
                        .fechaTransicion(tr.getFechaTransicion())
                        .idUsuario(tr.getUsuario() != null ? tr.getUsuario().getIdUsuario() : null)
                        .nombreUsuario(tr.getUsuario() != null
                                ? tr.getUsuario().getNombreCompleto() : "Sistema")
                        .motivo(tr.getMotivo())
                        .build())
                .toList();

        return TransferenciaTimelineResponse.builder()
                .idTransferencia(t.getIdTransferencia())
                .cuentaOrigen(t.getCuentaOrigen())
                .cuentaDestino(t.getCuentaDestino())
                .monto(t.getMonto())
                .estadoActual(t.getEstadoTransferencia().getNombreEstado())
                .estadoFinal(t.getEstadoTransferencia().isEsEstadoFinal())
                .fechaCreacion(t.getFechaCreacion())
                .fechaVencimiento(t.getFechaVencimiento())
                .vencida(LocalDateTime.now().isAfter(t.getFechaVencimiento())
                        && !t.getEstadoTransferencia().isEsEstadoFinal())
                .transiciones(items)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TransferenciaDashboardResponse obtenerDashboard(UserDetails caller) {
        List<String> cuentas = resolverCuentasDeCaller(caller);
        if (cuentas.isEmpty()) {
            return TransferenciaDashboardResponse.builder()
                    .cuentasIncluidas(cuentas)
                    .totalEnviadas(0).totalRecibidas(0)
                    .totalPendientes(0).totalEnEspera(0)
                    .totalEjecutadas(0).totalRechazadas(0).totalVencidas(0)
                    .montoTotalEnviado(BigDecimal.ZERO)
                    .montoTotalRecibido(BigDecimal.ZERO)
                    .montoEnEspera(BigDecimal.ZERO)
                    .ultimasTransferencias(List.of())
                    .generadoEn(LocalDateTime.now())
                    .build();
        }

        Pageable top10 = PageRequest.of(0, 10, Sort.by("fechaCreacion").descending());
        Page<Transferencia> recientes = transferenciaRepo.findByCuentasIn(cuentas, top10);

        // Métricas usando queries de agregación — sin cargar todo en memoria
        long enviadas  = cuentas.stream()
                .mapToLong(c -> transferenciaRepo.countByCuentaOrigen(c)).sum();
        long recibidas = cuentas.stream()
                .mapToLong(c -> transferenciaRepo.countByCuentaDestino(c)).sum();

        BigDecimal montoEnviado = cuentas.stream()
                .map(c -> transferenciaRepo.sumMontoEnviadoByCuenta(c))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal montoRecibido = cuentas.stream()
                .map(c -> transferenciaRepo.sumMontoRecibidoByCuenta(c))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Transferencia> activos = transferenciaRepo.findByEstadoIn(ESTADOS_ACTIVOS);
        long pendientes = activos.stream()
                .filter(t -> "Pendiente".equals(t.getEstadoTransferencia().getNombreEstado())
                        && cuentas.contains(t.getCuentaOrigen())).count();
        long enEspera = activos.stream()
                .filter(t -> "En Espera de Aprobacion".equals(
                        t.getEstadoTransferencia().getNombreEstado())
                        && cuentas.contains(t.getCuentaOrigen())).count();
        BigDecimal montoEnEspera = activos.stream()
                .filter(t -> "En Espera de Aprobacion".equals(
                        t.getEstadoTransferencia().getNombreEstado())
                        && cuentas.contains(t.getCuentaOrigen()))
                .map(Transferencia::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        log.info("Dashboard transferencias — titular={} cuentas={} enviadas={} recibidas={}",
                caller.getUsername(), cuentas.size(), enviadas, recibidas);

        return TransferenciaDashboardResponse.builder()
                .cuentasIncluidas(cuentas)
                .totalEnviadas(enviadas)
                .totalRecibidas(recibidas)
                .totalPendientes(pendientes)
                .totalEnEspera(enEspera)
                .totalEjecutadas(transferenciaRepo.countByEstado("Ejecutada"))
                .totalRechazadas(transferenciaRepo.countByEstado("Rechazada"))
                .totalVencidas(transferenciaRepo.countByEstado("Vencida"))
                .montoTotalEnviado(montoEnviado)
                .montoTotalRecibido(montoRecibido)
                .montoEnEspera(montoEnEspera)
                .ultimasTransferencias(recientes.getContent().stream()
                        .map(this::toResponse).toList())
                .generadoEn(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TransferenciaMetricasResponse obtenerMetricas() {
        long total = transferenciaRepo.count();

        Map<String, Long> distribucion = new LinkedHashMap<>();
        for (String estado : List.of("Ejecutada","Pendiente","En Espera de Aprobacion",
                "Aprobada","Rechazada","Vencida")) {
            distribucion.put(estado, transferenciaRepo.countByEstado(estado));
        }

        BigDecimal montoTotal   = transferenciaRepo.sumMontoByEstado("Ejecutada");
        BigDecimal montoPromedio = transferenciaRepo.avgMontoEjecutadas();
        BigDecimal montoMax     = transferenciaRepo.maxMontoEjecutadas();
        BigDecimal montoMin     = transferenciaRepo.minMontoEjecutadas();

        long ejecutadas  = distribucion.getOrDefault("Ejecutada", 0L);
        long rechazadas  = distribucion.getOrDefault("Rechazada", 0L);
        double tasaExito   = total > 0 ? (double) ejecutadas  / total * 100 : 0;
        double tasaRechazo = total > 0 ? (double) rechazadas  / total * 100 : 0;

        log.info("Métricas de transferencias generadas — total={} ejecutadas={}", total, ejecutadas);

        return TransferenciaMetricasResponse.builder()
                .totalTransferencias(total)
                .distribucionPorEstado(distribucion)
                .montoTotalProcesado(montoTotal)
                .montoPromedio(montoPromedio.setScale(2, RoundingMode.HALF_UP))
                .montoMaximo(montoMax)
                .montoMinimo(montoMin)
                .pendientesEjecucion(distribucion.getOrDefault("Pendiente", 0L))
                .enEsperaAprobacion(distribucion.getOrDefault("En Espera de Aprobacion", 0L))
                .vencidas(distribucion.getOrDefault("Vencida", 0L))
                .tasaExito(Math.round(tasaExito * 100.0) / 100.0)
                .tasaRechazo(Math.round(tasaRechazo * 100.0) / 100.0)
                .generadoEn(LocalDateTime.now())
                .build();
    }

    // ── Comandos ──────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TransferenciaDetalleResponse crearTransferencia(CrearTransferenciaRequest req,
                                                            UserDetails caller) {
        MDC.put("operacion", "crear_transferencia");
        MDC.put("cuentaOrigen", req.getCuentaOrigen());
        try {
            // 1. Validar ownership: el caller debe ser dueño de la cuenta origen
            if (!esRolAdministrativo(caller)) {
                List<String> misCuentas = resolverCuentasDeCaller(caller);
                if (!misCuentas.contains(req.getCuentaOrigen())) {
                    throw new UnauthorizedOperationException(
                            "Solo puede transferir desde sus propias cuentas");
                }
            }

            // 2. Validar que origen != destino
            if (req.getCuentaOrigen().equals(req.getCuentaDestino())) {
                throw new BusinessRuleException(
                        "La cuenta origen y destino no pueden ser la misma");
            }

            // 3. Validar que ambas cuentas existen y están activas
            CuentaBancaria origen = cuentaRepo.findById(req.getCuentaOrigen())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "CuentaBancaria", req.getCuentaOrigen()));
            if (!"Activa".equals(origen.getEstadoCuenta().getNombreEstado())) {
                throw new BusinessRuleException(
                        "La cuenta origen no está activa: "
                        + origen.getEstadoCuenta().getNombreEstado());
            }
            if (!cuentaRepo.existsByNumeroCuenta(req.getCuentaDestino())) {
                throw new ResourceNotFoundException("CuentaBancaria", req.getCuentaDestino());
            }

            // 4. Validación soft de saldo
            if (origen.getSaldoActual().compareTo(req.getMonto()) < 0) {
                throw new BusinessRuleException(
                        "Saldo insuficiente en cuenta origen. Disponible: "
                        + origen.getSaldoActual() + " "
                        + origen.getMoneda().getCodigoIso());
            }

            // 5. Prevención de duplicados (ventana de 60 segundos)
            LocalDateTime desde = LocalDateTime.now()
                    .minusSeconds(VENTANA_DUPLICADOS_SEGUNDOS);
            long duplicados = transferenciaRepo.countPosiblesDuplicados(
                    req.getCuentaOrigen(), req.getCuentaDestino(),
                    req.getMonto(), req.getIdUsuarioCreador(), desde);
            if (duplicados > 0) {
                throw new BusinessRuleException(
                        "Posible transferencia duplicada detectada. " +
                        "Espere " + VENTANA_DUPLICADOS_SEGUNDOS +
                        " segundos antes de reintentar.");
            }

            // 6. INSERT — TRG-09 asigna vencimiento, TRG-10 evalúa umbral
            jdbcTemplate.update(
                    "INSERT INTO transferencia " +
                    "(cuenta_origen, cuenta_destino, monto, id_estado_transferencia, " +
                    " id_usuario_creador, fecha_vencimiento, requiere_aprobacion) " +
                    "SELECT ?, ?, ?, cet.id_estado_transferencia, ?, " +
                    "       '1970-01-01 00:00:01', FALSE " +
                    "FROM cat_estado_transferencia cet " +
                    "WHERE cet.nombre_estado = 'Pendiente'",
                    req.getCuentaOrigen(), req.getCuentaDestino(),
                    req.getMonto(), req.getIdUsuarioCreador()
            );

            Long idNuevo = jdbcTemplate.queryForObject(
                    "SELECT LAST_INSERT_ID()", Long.class);

            // 7. Si quedó en Pendiente, ejecutar automáticamente
            Transferencia t = findOrThrow(idNuevo);
            if ("Pendiente".equals(t.getEstadoTransferencia().getNombreEstado())) {
                jdbcTemplate.update("CALL sp_ejecutar_transferencia(?)", idNuevo);
                log.info("Transferencia id={} ejecutada automáticamente", idNuevo);
            } else {
                log.info("Transferencia id={} en espera de aprobación (umbral superado)", idNuevo);
            }

            Transferencia resultado = transferenciaRepo.findByIdWithDetails(idNuevo)
                    .orElseThrow(() -> new ResourceNotFoundException("Transferencia", idNuevo));

            log.info("Transferencia creada — id={} origen={} destino={} monto={} estado={}",
                    idNuevo, req.getCuentaOrigen(), req.getCuentaDestino(),
                    req.getMonto(), resultado.getEstadoTransferencia().getNombreEstado());

            return toDetalleResponse(resultado);

        } finally {
            MDC.remove("operacion");
            MDC.remove("cuentaOrigen");
        }
    }

    @Override
    @Transactional
    public TransferenciaDetalleResponse aprobarTransferencia(Long id, Long idSupervisor) {
        MDC.put("operacion", "aprobar_transferencia");
        MDC.put("idTransferencia", String.valueOf(id));
        try {
            Transferencia t = findOrThrow(id);
            validarEstadoParaAprobacion(t);

            jdbcTemplate.update("CALL sp_aprobar_transferencia(?, ?)", id, idSupervisor);

            Transferencia resultado = transferenciaRepo.findByIdWithDetails(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Transferencia", id));

            log.info("Transferencia id={} aprobada por supervisor id={} — nuevo estado={}",
                    id, idSupervisor, resultado.getEstadoTransferencia().getNombreEstado());

            return toDetalleResponse(resultado);
        } finally {
            MDC.remove("operacion");
            MDC.remove("idTransferencia");
        }
    }

    @Override
    @Transactional
    public TransferenciaDetalleResponse rechazarTransferencia(Long id,
                                                               RechazarTransferenciaRequest req) {
        MDC.put("operacion", "rechazar_transferencia");
        MDC.put("idTransferencia", String.valueOf(id));
        try {
            Transferencia t = findOrThrow(id);
            validarEstadoParaAprobacion(t);

            String motivo = req.getMotivo() != null ? req.getMotivo() : "";
            jdbcTemplate.update("CALL sp_rechazar_transferencia(?, ?, ?)",
                    id, req.getIdSupervisor(), motivo);

            Transferencia resultado = transferenciaRepo.findByIdWithDetails(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Transferencia", id));

            log.info("Transferencia id={} rechazada por supervisor id={} motivo={}",
                    id, req.getIdSupervisor(), motivo);

            return toDetalleResponse(resultado);
        } finally {
            MDC.remove("operacion");
            MDC.remove("idTransferencia");
        }
    }

    // ── Validaciones de dominio ───────────────────────────────────────────────

    private void validarOwnershipTransferencia(Transferencia t, UserDetails caller) {
        if (esRolAdministrativo(caller)) return;
        List<String> misCuentas = resolverCuentasDeCaller(caller);
        boolean esPropietario = misCuentas.contains(t.getCuentaOrigen())
                || misCuentas.contains(t.getCuentaDestino());
        if (!esPropietario) {
            log.warn("Acceso no autorizado a transferencia id={} por usuario={}",
                    t.getIdTransferencia(), caller.getUsername());
            throw new UnauthorizedOperationException(
                    "No tiene permisos para acceder a esta transferencia");
        }
    }

    private void validarEstadoParaAprobacion(Transferencia t) {
        String estado = t.getEstadoTransferencia().getNombreEstado();
        if (!"En Espera de Aprobacion".equals(estado)) {
            throw new BusinessRuleException(
                    "Solo se pueden aprobar/rechazar transferencias en estado " +
                    "'En Espera de Aprobacion'. Estado actual: " + estado);
        }
        if (LocalDateTime.now().isAfter(t.getFechaVencimiento())) {
            throw new BusinessRuleException(
                    "La transferencia ha vencido y no puede ser aprobada. " +
                    "Vencimiento: " + t.getFechaVencimiento());
        }
    }

    private boolean esRolAdministrativo(UserDetails caller) {
        return caller.getAuthorities().stream()
                .anyMatch(a -> ROLES_ADMIN.contains(a.getAuthority()));
    }

    /**
     * Resuelve los números de cuenta que pertenecen al usuario autenticado.
     * Busca por correo electrónico en clientes persona natural y empresa.
     */
    private List<String> resolverCuentasDeCaller(UserDetails caller) {
        String correo = caller.getUsername();
        // Buscar idTitular por correo en ambas tablas de clientes
        String idTitular = jdbcTemplate.query(
                "SELECT id_identificacion AS id FROM cliente_persona_natural " +
                "WHERE correo_electronico = ? " +
                "UNION " +
                "SELECT nit AS id FROM cliente_empresa " +
                "WHERE correo_electronico = ? LIMIT 1",
                rs -> rs.next() ? rs.getString("id") : null,
                correo, correo
        );
        if (idTitular == null) return List.of();
        return cuentaRepo.findByIdTitular(idTitular).stream()
                .map(CuentaBancaria::getNumeroCuenta)
                .toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Transferencia findOrThrow(Long id) {
        return transferenciaRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transferencia", id));
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private TransferenciaResponse toResponse(Transferencia t) {
        boolean vencida = t.getFechaVencimiento() != null
                && LocalDateTime.now().isAfter(t.getFechaVencimiento())
                && !t.getEstadoTransferencia().isEsEstadoFinal();
        return TransferenciaResponse.builder()
                .idTransferencia(t.getIdTransferencia())
                .cuentaOrigen(t.getCuentaOrigen())
                .cuentaDestino(t.getCuentaDestino())
                .monto(t.getMonto())
                .estadoTransferencia(t.getEstadoTransferencia().getNombreEstado())
                .idUsuarioCreador(t.getUsuarioCreador().getIdUsuario())
                .nombreUsuarioCreador(t.getUsuarioCreador().getNombreCompleto())
                .idUsuarioAprobador(t.getUsuarioAprobador() != null
                        ? t.getUsuarioAprobador().getIdUsuario() : null)
                .fechaCreacion(t.getFechaCreacion())
                .fechaAprobacion(t.getFechaAprobacion())
                .fechaVencimiento(t.getFechaVencimiento())
                .requiereAprobacion(t.isRequiereAprobacion())
                .saldoOrigenAntes(t.getSaldoOrigenAntes())
                .saldoOrigenDespues(t.getSaldoOrigenDespues())
                .saldoDestinoAntes(t.getSaldoDestinoAntes())
                .saldoDestinoDespues(t.getSaldoDestinoDespues())
                .estadoFinal(t.getEstadoTransferencia().isEsEstadoFinal())
                .vencida(vencida)
                .build();
    }

    private TransferenciaDetalleResponse toDetalleResponse(Transferencia t) {
        boolean vencida = LocalDateTime.now().isAfter(t.getFechaVencimiento())
                && !t.getEstadoTransferencia().isEsEstadoFinal();
        return TransferenciaDetalleResponse.builder()
                .idTransferencia(t.getIdTransferencia())
                .cuentaOrigen(t.getCuentaOrigen())
                .cuentaDestino(t.getCuentaDestino())
                .monto(t.getMonto())
                .estadoTransferencia(t.getEstadoTransferencia().getNombreEstado())
                .requiereAprobacion(t.isRequiereAprobacion())
                .idUsuarioCreador(t.getUsuarioCreador().getIdUsuario())
                .nombreUsuarioCreador(t.getUsuarioCreador().getNombreCompleto())
                .idUsuarioAprobador(t.getUsuarioAprobador() != null
                        ? t.getUsuarioAprobador().getIdUsuario() : null)
                .nombreUsuarioAprobador(t.getUsuarioAprobador() != null
                        ? t.getUsuarioAprobador().getNombreCompleto() : null)
                .fechaCreacion(t.getFechaCreacion())
                .fechaAprobacion(t.getFechaAprobacion())
                .fechaVencimiento(t.getFechaVencimiento())
                .saldoOrigenAntes(t.getSaldoOrigenAntes())
                .saldoOrigenDespues(t.getSaldoOrigenDespues())
                .saldoDestinoAntes(t.getSaldoDestinoAntes())
                .saldoDestinoDespues(t.getSaldoDestinoDespues())
                .vencida(vencida)
                .estadoFinal(t.getEstadoTransferencia().isEsEstadoFinal())
                .build();
    }
}
