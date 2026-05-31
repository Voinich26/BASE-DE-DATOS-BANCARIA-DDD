package com.banco.ddd.application.service;

import com.banco.ddd.application.dto.request.CrearClienteEmpresaRequest;
import com.banco.ddd.application.dto.request.CrearClientePersonaRequest;
import com.banco.ddd.application.dto.response.ClienteEmpresaResponse;
import com.banco.ddd.application.dto.response.ClientePersonaResponse;
import com.banco.ddd.domain.exception.BusinessRuleException;
import com.banco.ddd.domain.exception.ResourceNotFoundException;
import com.banco.ddd.domain.model.ClienteEmpresa;
import com.banco.ddd.domain.model.ClientePersonaNatural;
import com.banco.ddd.infrastructure.adapter.out.persistence.ClienteEmpresaRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.ClientePersonaNaturalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Caso de uso: Gestión de clientes (BC-02).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClientePersonaNaturalRepository personaRepo;
    private final ClienteEmpresaRepository        empresaRepo;
    private final JdbcTemplate                    jdbcTemplate;

    // ── Persona Natural ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ClientePersonaResponse> listarPersonas(Pageable pageable) {
        return personaRepo.findAll(pageable).map(this::toPersonaResponse);
    }

    @Transactional(readOnly = true)
    public ClientePersonaResponse obtenerPersona(String idIdentificacion) {
        return toPersonaResponse(findPersonaOrThrow(idIdentificacion));
    }

    @Transactional
    public ClientePersonaResponse crearPersona(CrearClientePersonaRequest req) {
        if (personaRepo.existsByCorreoElectronico(req.getCorreoElectronico())) {
            throw new BusinessRuleException("El correo ya está registrado para otro cliente");
        }
        jdbcTemplate.update(
                "CALL sp_crear_cliente_persona(?, ?, ?, ?, ?, ?, ?, ?)",
                req.getIdIdentificacion(),
                req.getTipoIdentificacion(),
                req.getNombreCompleto(),
                req.getCorreoElectronico(),
                req.getTelefono(),
                req.getFechaNacimiento(),
                req.getDireccion(),
                req.getIdUsuario()
        );
        log.info("Cliente persona natural creado: {}", req.getIdIdentificacion());
        return toPersonaResponse(findPersonaOrThrow(req.getIdIdentificacion()));
    }

    @Transactional
    public ClientePersonaResponse actualizarPersona(String idIdentificacion,
                                                     String correo,
                                                     String telefono,
                                                     String direccion) {
        findPersonaOrThrow(idIdentificacion);
        jdbcTemplate.update("CALL sp_actualizar_cliente_persona(?, ?, ?, ?)",
                idIdentificacion, correo, telefono, direccion);
        return toPersonaResponse(findPersonaOrThrow(idIdentificacion));
    }

    // ── Empresa ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ClienteEmpresaResponse> listarEmpresas(Pageable pageable) {
        return empresaRepo.findAll(pageable).map(this::toEmpresaResponse);
    }

    @Transactional(readOnly = true)
    public ClienteEmpresaResponse obtenerEmpresa(String nit) {
        return toEmpresaResponse(findEmpresaOrThrow(nit));
    }

    @Transactional
    public ClienteEmpresaResponse crearEmpresa(CrearClienteEmpresaRequest req) {
        jdbcTemplate.update(
                "CALL sp_crear_cliente_empresa(?, ?, ?, ?, ?, ?, ?)",
                req.getNit(),
                req.getRazonSocial(),
                req.getCorreoElectronico(),
                req.getTelefono(),
                req.getDireccion(),
                req.getIdRepresentanteLegal(),
                req.getIdUsuario()
        );
        log.info("Cliente empresa creado: {}", req.getNit());
        return toEmpresaResponse(findEmpresaOrThrow(req.getNit()));
    }

    @Transactional
    public ClienteEmpresaResponse actualizarEmpresa(String nit,
                                                     String correo,
                                                     String telefono,
                                                     String direccion) {
        findEmpresaOrThrow(nit);
        jdbcTemplate.update("CALL sp_actualizar_cliente_empresa(?, ?, ?, ?)",
                nit, correo, telefono, direccion);
        return toEmpresaResponse(findEmpresaOrThrow(nit));
    }

    @Transactional
    public void bloquearCliente(String idIdentificacion, String tipoCliente, String motivo) {
        jdbcTemplate.update("CALL sp_bloquear_cliente(?, ?, ?)",
                idIdentificacion, tipoCliente, motivo);
        log.info("Cliente {} bloqueado: {}", tipoCliente, idIdentificacion);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private ClientePersonaNatural findPersonaOrThrow(String id) {
        return personaRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ClientePersonaNatural", id));
    }

    private ClienteEmpresa findEmpresaOrThrow(String nit) {
        return empresaRepo.findById(nit)
                .orElseThrow(() -> new ResourceNotFoundException("ClienteEmpresa", nit));
    }

    private ClientePersonaResponse toPersonaResponse(ClientePersonaNatural c) {
        return ClientePersonaResponse.builder()
                .idIdentificacion(c.getIdIdentificacion())
                .tipoIdentificacion(c.getTipoIdentificacion())
                .nombreCompleto(c.getNombreCompleto())
                .correoElectronico(c.getCorreoElectronico())
                .telefono(c.getTelefono())
                .fechaNacimiento(c.getFechaNacimiento())
                .direccion(c.getDireccion())
                .idUsuario(c.getUsuario().getIdUsuario())
                .fechaRegistro(c.getFechaRegistro())
                .build();
    }

    private ClienteEmpresaResponse toEmpresaResponse(ClienteEmpresa e) {
        return ClienteEmpresaResponse.builder()
                .nit(e.getNit())
                .razonSocial(e.getRazonSocial())
                .correoElectronico(e.getCorreoElectronico())
                .telefono(e.getTelefono())
                .direccion(e.getDireccion())
                .idRepresentanteLegal(e.getRepresentanteLegal().getIdIdentificacion())
                .nombreRepresentanteLegal(e.getRepresentanteLegal().getNombreCompleto())
                .idUsuario(e.getUsuario().getIdUsuario())
                .fechaRegistro(e.getFechaRegistro())
                .build();
    }
}
