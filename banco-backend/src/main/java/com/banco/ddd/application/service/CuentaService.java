package com.banco.ddd.application.service;

import com.banco.ddd.application.dto.request.CrearCuentaRequest;
import com.banco.ddd.application.dto.request.OperacionCajaRequest;
import com.banco.ddd.application.dto.response.CuentaBancariaResponse;
import com.banco.ddd.application.dto.response.CuentaDetalleResponse;
import com.banco.ddd.application.dto.response.CuentaResumenResponse;
import com.banco.ddd.application.dto.response.CuentaResumenResponse.TransferenciaResumenItem;
import com.banco.ddd.application.dto.response.DashboardFinancieroResponse;
import com.banco.ddd.application.port.in.CuentaUseCase;
import com.banco.ddd.domain.exception.BusinessRuleException;
import com.banco.ddd.domain.exception.ResourceNotFoundException;
import com.banco.ddd.domain.exception.UnauthorizedOperationException;
import com.banco.ddd.domain.model.CuentaBancaria;
import com.banco.ddd.domain.model.Transferencia;
import com.banco.ddd.domain.model.Usuario;
import com.banco.ddd.infrastructure.adapter.out.persistence.ClienteEmpresaRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.ClientePersonaNaturalRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.CuentaBancariaRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.TransferenciaRepository;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Caso de uso: Gestión de cuentas bancarias (BC-03).
 *
 * <p>Toda la lógica de negocio crítica (saldo, estados, auditoría) reside
 * en los stored procedures y triggers MySQL. Este servicio actúa como
 * orquestador: valida permisos, delega al SP y retorna la respuesta.</p>
 *
 * <p>Stored procedures consumidos:</p>
 * <ul>
 *   <li>{@code sp_crear_cuenta}    — apertura de cuenta</li>
 *   <li>{@code sp_depositar}       — depósito de caja</li>
 *   <li>{@code sp_retirar}         — retiro de caja (valida saldo)</li>
 *   <li>{@code sp_cancelar_cuenta} — cierre (valida saldo = 0)</li>
 *   <li>{@code sp_bloquear_cuenta} — bloqueo con motivo</li>
 *   <li>{@code sp_reactivar_cuenta}— reactivación</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CuentaService implements CuentaUseCase {

    // ── Dependencias ──────────────────────────────────────────────────────────

    private final CuentaBancariaRepository        cuentaRepo;
    private final TransferenciaRepository         transferenciaRepo;
    private final ClientePersonaNaturalRepository personaRepo;
    private final ClienteEmpresaRepository        empresaRepo;
    private final JdbcTemplate                    jdbcTemplate;

    /** Roles que pueden ver cualquier cuenta sin restricción de ownership. */
    private static final Set<String> ROLES_ADMIN = Set.of(
            "ROLE_ADMINISTRADOR", "ROLE_ANALISTA_INTERNO",
            "ROLE_SUPERVISOR_EMPRESA", "ROLE_EMPLEADO_VENTANILLA"
    );

    // ── Consultas ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CuentaBancariaResponse> listarCuentas(Pageable pageable) {
        Page<CuentaBancariaResponse> page = cuentaRepo.findAll(pageable).map(this::toResponse);
        log.debug("Listando cuentas — página={} tamaño={} total={}",
                pageable.getPageNumber(), pageable.getPageSize(), page.getTotalElements());
        return new PagedResponse<>(page);
    }

    @Override
    @Transactional(readOnly = true)
    public CuentaBancariaResponse obtenerCuenta(String numeroCuenta, UserDetails caller) {
        CuentaBancaria cuenta = findOrThrow(numeroCuenta);
        validarOwnership(cuenta, caller);
        return toResponse(cuenta);
    }

    @Override
    @Transactional(readOnly = true)
    public CuentaDetalleResponse obtenerDetalle(String numeroCuenta, UserDetails caller) {
        CuentaBancaria cuenta = cuentaRepo.findByNumeroCuentaWithDetails(numeroCuenta)
                .orElseThrow(() -> new ResourceNotFoundException("CuentaBancaria", numeroCuenta));
        validarOwnership(cuenta, caller);

        // Contar transferencias
        long totalOrigen  = transferenciaRepo.findByCuentaOrigen(numeroCuenta,
                PageRequest.of(0, 1)).getTotalElements();
        long totalDestino = transferenciaRepo.findByCuentaDestino(numeroCuenta,
                PageRequest.of(0, 1)).getTotalElements();

        // Nombre del titular
        String nombreTitular = resolverNombreTitular(cuenta);

        log.debug("Detalle de cuenta={} titular={}", numeroCuenta, cuenta.getIdTitular());

        return CuentaDetalleResponse.builder()
                .numeroCuenta(cuenta.getNumeroCuenta())
                .tipoCuenta(cuenta.getTipoCuenta().getNombreTipo())
                .idTitular(cuenta.getIdTitular())
                .tipoTitular(cuenta.getTipoTitular().name())
                .nombreTitular(nombreTitular)
                .saldoActual(cuenta.getSaldoActual())
                .moneda(cuenta.getMoneda().getNombreMoneda())
                .codigoIsoMoneda(cuenta.getMoneda().getCodigoIso())
                .estadoCuenta(cuenta.getEstadoCuenta().getNombreEstado())
                .fechaApertura(cuenta.getFechaApertura())
                .idUsuarioApertura(cuenta.getUsuarioApertura().getIdUsuario())
                .nombreUsuarioApertura(cuenta.getUsuarioApertura().getNombreCompleto())
                .fechaCreacion(cuenta.getFechaCreacion())
                .fechaModificacion(cuenta.getFechaModificacion())
                .totalTransferenciasOrigen(totalOrigen)
                .totalTransferenciasDestino(totalDestino)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CuentaBancariaResponse> cuentasPorTitular(String idTitular,
                                                                     Pageable pageable,
                                                                     UserDetails caller) {
        // Si es cliente, solo puede ver sus propias cuentas
        if (!esRolAdministrativo(caller)) {
            String idTitularCaller = resolverIdTitularDesdeCaller(caller);
            if (!idTitular.equals(idTitularCaller)) {
                throw new UnauthorizedOperationException(
                        "Solo puede consultar sus propias cuentas");
            }
        }

        Page<CuentaBancariaResponse> page = cuentaRepo
                .findByIdTitularPaged(idTitular, pageable)
                .map(this::toResponse);

        log.debug("Cuentas de titular={} — total={}", idTitular, page.getTotalElements());
        return new PagedResponse<>(page);
    }

    @Override
    @Transactional(readOnly = true)
    public CuentaResumenResponse obtenerResumen(String numeroCuenta, UserDetails caller) {
        CuentaBancaria cuenta = findOrThrow(numeroCuenta);
        validarOwnership(cuenta, caller);

        // Últimas 5 transferencias (origen o destino)
        Pageable top5 = PageRequest.of(0, 5, Sort.by("fechaCreacion").descending());
        Page<Transferencia> transferencias = transferenciaRepo.findByCuenta(numeroCuenta, top5);

        // Métricas agregadas — sin cargar todas las transferencias en memoria
        long totalEnviadas  = transferenciaRepo.countByCuentaOrigen(numeroCuenta);
        long totalRecibidas = transferenciaRepo.countByCuentaDestino(numeroCuenta);
        BigDecimal montoEnviado  = transferenciaRepo.sumMontoEnviadoByCuenta(numeroCuenta);
        BigDecimal montoRecibido = transferenciaRepo.sumMontoRecibidoByCuenta(numeroCuenta);

        List<TransferenciaResumenItem> items = transferencias.getContent().stream()
                .map(t -> buildTransferenciaItem(t, numeroCuenta))
                .toList();

        log.debug("Resumen de cuenta={} enviadas={} recibidas={}",
                numeroCuenta, totalEnviadas, totalRecibidas);

        return CuentaResumenResponse.builder()
                .numeroCuenta(cuenta.getNumeroCuenta())
                .tipoCuenta(cuenta.getTipoCuenta().getNombreTipo())
                .estadoCuenta(cuenta.getEstadoCuenta().getNombreEstado())
                .saldoActual(cuenta.getSaldoActual())
                .codigoIsoMoneda(cuenta.getMoneda().getCodigoIso())
                .totalTransferenciasEnviadas(totalEnviadas)
                .totalTransferenciasRecibidas(totalRecibidas)
                .montoTotalEnviado(montoEnviado)
                .montoTotalRecibido(montoRecibido)
                .ultimasTransferencias(items)
                .fechaConsulta(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardFinancieroResponse obtenerDashboard(UserDetails caller) {
        // Para roles administrativos que no tienen cliente asociado,
        // devolver un dashboard vacío con sus datos de usuario
        if (esRolAdministrativo(caller)) {
            String nombre = caller instanceof Usuario u ? u.getNombreCompleto() : caller.getUsername();
            return DashboardFinancieroResponse.builder()
                    .idTitular("N/A")
                    .nombreTitular(nombre)
                    .totalCuentasActivas(0)
                    .totalCuentasBloqueadas(0)
                    .totalCuentasCanceladas(0)
                    .saldoTotalConsolidado(java.math.BigDecimal.ZERO)
                    .cuentas(java.util.List.of())
                    .transferenciasPendientes(0L)
                    .ultimasTransferencias(java.util.List.of())
                    .generadoEn(LocalDateTime.now())
                    .build();
        }

        String idTitular    = resolverIdTitularDesdeCaller(caller);
        String nombreTitular = resolverNombreTitularDesdeUsername(caller.getUsername());

        List<CuentaBancaria> todasLasCuentas = cuentaRepo.findByIdTitular(idTitular);

        // Conteos por estado
        long activas    = todasLasCuentas.stream()
                .filter(c -> "Activa".equals(c.getEstadoCuenta().getNombreEstado())).count();
        long bloqueadas = todasLasCuentas.stream()
                .filter(c -> "Bloqueada".equals(c.getEstadoCuenta().getNombreEstado())).count();
        long canceladas = todasLasCuentas.stream()
                .filter(c -> "Cancelada".equals(c.getEstadoCuenta().getNombreEstado())).count();

        // Saldo total consolidado (solo cuentas activas)
        java.math.BigDecimal saldoTotal = todasLasCuentas.stream()
                .filter(c -> "Activa".equals(c.getEstadoCuenta().getNombreEstado()))
                .map(CuentaBancaria::getSaldoActual)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        // Items de cuentas para el dashboard
        List<CuentaBancariaResponse> cuentaItems = todasLasCuentas.stream()
                .map(this::toResponse)
                .toList();

        // Últimas 5 transferencias de todas las cuentas del titular
        List<TransferenciaResumenItem> ultimasTransferencias = todasLasCuentas.stream()
                .flatMap(c -> {
                    Pageable top5 = PageRequest.of(0, 5, Sort.by("fechaCreacion").descending());
                    return transferenciaRepo.findByCuenta(c.getNumeroCuenta(), top5)
                            .getContent().stream()
                            .map(t -> buildTransferenciaItem(t, c.getNumeroCuenta()));
                })
                .sorted((a, b) -> b.getFecha().compareTo(a.getFecha()))
                .limit(5)
                .toList();

        // Transferencias pendientes de aprobación
        long pendientes = todasLasCuentas.stream()
                .mapToLong(c -> transferenciaRepo
                        .findByCuentaOrigen(c.getNumeroCuenta(), PageRequest.of(0, 1))
                        .getTotalElements())
                .sum();

        log.info("Dashboard generado para titular={} cuentas={} saldoTotal={}",
                idTitular, todasLasCuentas.size(), saldoTotal);

        return DashboardFinancieroResponse.builder()
                .idTitular(idTitular)
                .nombreTitular(nombreTitular)
                .totalCuentasActivas((int) activas)
                .totalCuentasBloqueadas((int) bloqueadas)
                .totalCuentasCanceladas((int) canceladas)
                .saldoTotalConsolidado(saldoTotal)
                .cuentas(cuentaItems)
                .transferenciasPendientes(pendientes)
                .ultimasTransferencias(ultimasTransferencias)
                .generadoEn(LocalDateTime.now())
                .build();
    }

    // ── Comandos ──────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public CuentaBancariaResponse crearCuenta(CrearCuentaRequest req) {
        MDC.put("operacion", "crear_cuenta");
        MDC.put("numeroCuenta", req.getNumeroCuenta());
        try {
            // Idempotencia básica: verificar si ya existe
            if (cuentaRepo.existsByNumeroCuenta(req.getNumeroCuenta())) {
                log.warn("Cuenta ya existe — numeroCuenta={}", req.getNumeroCuenta());
                return toResponse(findOrThrow(req.getNumeroCuenta()));
            }

            jdbcTemplate.update(
                    "CALL sp_crear_cuenta(?, ?, ?, ?, ?, ?, ?)",
                    req.getNumeroCuenta(),
                    req.getNombreTipoCuenta(),
                    req.getIdTitular(),
                    req.getTipoTitular(),
                    req.getCodigoIsoMoneda(),
                    req.getSaldoInicial(),
                    req.getIdUsuarioApertura()
            );

            CuentaBancariaResponse response = toResponse(findOrThrow(req.getNumeroCuenta()));
            log.info("Cuenta creada — numeroCuenta={} titular={} tipo={}",
                    req.getNumeroCuenta(), req.getIdTitular(), req.getNombreTipoCuenta());
            return response;

        } finally {
            MDC.remove("operacion");
            MDC.remove("numeroCuenta");
        }
    }

    @Override
    @Transactional
    public void cancelarCuenta(String numeroCuenta, Long idUsuario) {
        MDC.put("operacion", "cancelar_cuenta");
        MDC.put("numeroCuenta", numeroCuenta);
        try {
            CuentaBancaria cuenta = findOrThrow(numeroCuenta);
            validarCuentaNoYaCancelada(cuenta);

            jdbcTemplate.update("CALL sp_cancelar_cuenta(?, ?)", numeroCuenta, idUsuario);
            log.info("Cuenta cancelada — numeroCuenta={} por usuario={}", numeroCuenta, idUsuario);

        } finally {
            MDC.remove("operacion");
            MDC.remove("numeroCuenta");
        }
    }

    @Override
    @Transactional
    public void bloquearCuenta(String numeroCuenta, Long idUsuario, String motivo) {
        MDC.put("operacion", "bloquear_cuenta");
        MDC.put("numeroCuenta", numeroCuenta);
        try {
            CuentaBancaria cuenta = findOrThrow(numeroCuenta);
            validarCuentaNoYaCancelada(cuenta);

            if (motivo == null || motivo.isBlank()) {
                throw new BusinessRuleException("El motivo del bloqueo es obligatorio");
            }

            jdbcTemplate.update("CALL sp_bloquear_cuenta(?, ?, ?)",
                    numeroCuenta, idUsuario, motivo);
            log.info("Cuenta bloqueada — numeroCuenta={} por usuario={} motivo={}",
                    numeroCuenta, idUsuario, motivo);

        } finally {
            MDC.remove("operacion");
            MDC.remove("numeroCuenta");
        }
    }

    @Override
    @Transactional
    public void reactivarCuenta(String numeroCuenta, Long idUsuario) {
        MDC.put("operacion", "reactivar_cuenta");
        MDC.put("numeroCuenta", numeroCuenta);
        try {
            findOrThrow(numeroCuenta);
            jdbcTemplate.update("CALL sp_reactivar_cuenta(?, ?)", numeroCuenta, idUsuario);
            log.info("Cuenta reactivada — numeroCuenta={} por usuario={}", numeroCuenta, idUsuario);

        } finally {
            MDC.remove("operacion");
            MDC.remove("numeroCuenta");
        }
    }

    @Override
    @Transactional
    public void depositar(OperacionCajaRequest req) {
        MDC.put("operacion", "depositar");
        MDC.put("numeroCuenta", req.getNumeroCuenta());
        try {
            CuentaBancaria cuenta = findOrThrow(req.getNumeroCuenta());
            validarCuentaActiva(cuenta);

            jdbcTemplate.update("CALL sp_depositar(?, ?, ?, ?)",
                    req.getNumeroCuenta(), req.getMonto(),
                    req.getIdUsuario(), req.getConcepto());

            log.info("Depósito realizado — cuenta={} monto={} usuario={}",
                    req.getNumeroCuenta(), req.getMonto(), req.getIdUsuario());

        } finally {
            MDC.remove("operacion");
            MDC.remove("numeroCuenta");
        }
    }

    @Override
    @Transactional
    public void retirar(OperacionCajaRequest req) {
        MDC.put("operacion", "retirar");
        MDC.put("numeroCuenta", req.getNumeroCuenta());
        try {
            CuentaBancaria cuenta = findOrThrow(req.getNumeroCuenta());
            validarCuentaActiva(cuenta);

            // Validación soft de saldo antes de llamar al SP
            // El SP también valida, pero esto da un mensaje más claro
            if (cuenta.getSaldoActual().compareTo(req.getMonto()) < 0) {
                throw new BusinessRuleException(
                        "Saldo insuficiente. Saldo disponible: "
                        + cuenta.getSaldoActual() + " " + cuenta.getMoneda().getCodigoIso());
            }

            jdbcTemplate.update("CALL sp_retirar(?, ?, ?, ?)",
                    req.getNumeroCuenta(), req.getMonto(),
                    req.getIdUsuario(), req.getConcepto());

            log.info("Retiro realizado — cuenta={} monto={} usuario={}",
                    req.getNumeroCuenta(), req.getMonto(), req.getIdUsuario());

        } finally {
            MDC.remove("operacion");
            MDC.remove("numeroCuenta");
        }
    }

    // ── Validaciones de dominio ───────────────────────────────────────────────

    /**
     * Valida que el caller tenga acceso a la cuenta.
     * Los roles administrativos pueden ver cualquier cuenta.
     * Los clientes solo pueden ver sus propias cuentas.
     */
    private void validarOwnership(CuentaBancaria cuenta, UserDetails caller) {
        if (esRolAdministrativo(caller)) return;

        String idTitularCaller = resolverIdTitularDesdeCaller(caller);
        if (!cuenta.getIdTitular().equals(idTitularCaller)) {
            log.warn("Intento de acceso no autorizado — cuenta={} caller={}",
                    cuenta.getNumeroCuenta(), caller.getUsername());
            throw new UnauthorizedOperationException(
                    "No tiene permisos para acceder a esta cuenta");
        }
    }

    private void validarCuentaActiva(CuentaBancaria cuenta) {
        String estado = cuenta.getEstadoCuenta().getNombreEstado();
        if ("Bloqueada".equals(estado)) {
            throw new BusinessRuleException(
                    "La cuenta " + cuenta.getNumeroCuenta() + " está bloqueada");
        }
        if ("Cancelada".equals(estado)) {
            throw new BusinessRuleException(
                    "La cuenta " + cuenta.getNumeroCuenta() + " está cancelada");
        }
    }

    private void validarCuentaNoYaCancelada(CuentaBancaria cuenta) {
        if ("Cancelada".equals(cuenta.getEstadoCuenta().getNombreEstado())) {
            throw new BusinessRuleException(
                    "La cuenta " + cuenta.getNumeroCuenta() + " ya está cancelada");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private CuentaBancaria findOrThrow(String numeroCuenta) {
        return cuentaRepo.findById(numeroCuenta)
                .orElseThrow(() -> new ResourceNotFoundException("CuentaBancaria", numeroCuenta));
    }

    private boolean esRolAdministrativo(UserDetails caller) {
        return caller.getAuthorities().stream()
                .anyMatch(a -> ROLES_ADMIN.contains(a.getAuthority()));
    }

    /**
     * Resuelve el ID del titular (cédula o NIT) a partir del usuario autenticado.
     * Busca primero en clientes persona natural, luego en empresa.
     */
    private String resolverIdTitularDesdeCaller(UserDetails caller) {
        String correo = caller.getUsername();

        // Buscar como persona natural
        var persona = personaRepo.findByCorreoElectronico(correo);
        if (persona.isPresent()) {
            return persona.get().getIdIdentificacion();
        }

        // Buscar como empresa
        var empresa = empresaRepo.findByCorreoElectronico(correo);
        if (empresa.isPresent()) {
            return empresa.get().getNit();
        }

        // Si es empleado/admin, usar el ID del usuario como fallback
        if (caller instanceof Usuario usuario) {
            return String.valueOf(usuario.getIdUsuario());
        }

        throw new BusinessRuleException(
                "No se pudo determinar el titular para el usuario: " + correo);
    }

    /**
     * Resuelve el nombre del titular a partir del correo electrónico.
     */
    private String resolverNombreTitularDesdeUsername(String correo) {
        return personaRepo.findByCorreoElectronico(correo)
                .map(p -> p.getNombreCompleto())
                .orElseGet(() -> empresaRepo.findByCorreoElectronico(correo)
                        .map(e -> e.getRazonSocial())
                        .orElse(correo));
    }

    /**
     * Resuelve el nombre del titular de una cuenta.
     */
    private String resolverNombreTitular(CuentaBancaria cuenta) {
        if (cuenta.getTipoTitular() == CuentaBancaria.TipoTitular.PERSONA_NATURAL) {
            return personaRepo.findById(cuenta.getIdTitular())
                    .map(p -> p.getNombreCompleto())
                    .orElse(cuenta.getIdTitular());
        } else {
            return empresaRepo.findById(cuenta.getIdTitular())
                    .map(e -> e.getRazonSocial())
                    .orElse(cuenta.getIdTitular());
        }
    }

    /**
     * Construye un item de transferencia para el resumen/dashboard.
     */
    private TransferenciaResumenItem buildTransferenciaItem(Transferencia t,
                                                              String numeroCuenta) {
        boolean esOrigen = numeroCuenta.equals(t.getCuentaOrigen());
        return TransferenciaResumenItem.builder()
                .idTransferencia(t.getIdTransferencia())
                .cuentaContraparte(esOrigen ? t.getCuentaDestino() : t.getCuentaOrigen())
                .direccion(esOrigen ? "ENVIADA" : "RECIBIDA")
                .monto(t.getMonto())
                .estado(t.getEstadoTransferencia().getNombreEstado())
                .fecha(t.getFechaCreacion())
                .build();
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private CuentaBancariaResponse toResponse(CuentaBancaria c) {
        return CuentaBancariaResponse.builder()
                .numeroCuenta(c.getNumeroCuenta())
                .tipoCuenta(c.getTipoCuenta().getNombreTipo())
                .idTitular(c.getIdTitular())
                .tipoTitular(c.getTipoTitular().name())
                .saldoActual(c.getSaldoActual())
                .moneda(c.getMoneda().getNombreMoneda())
                .codigoIsoMoneda(c.getMoneda().getCodigoIso())
                .estadoCuenta(c.getEstadoCuenta().getNombreEstado())
                .fechaApertura(c.getFechaApertura())
                .fechaCreacion(c.getFechaCreacion())
                .build();
    }
}
