package com.banco.ddd.application.service;

import com.banco.ddd.application.dto.request.CrearUsuarioRequest;
import com.banco.ddd.application.dto.request.ResetPasswordRequest;
import com.banco.ddd.application.dto.response.UsuarioResponse;
import com.banco.ddd.domain.exception.BusinessRuleException;
import com.banco.ddd.domain.exception.ResourceNotFoundException;
import com.banco.ddd.domain.model.CredencialUsuario;
import com.banco.ddd.domain.model.PasswordPolicy;
import com.banco.ddd.domain.model.TokenRevocado;
import com.banco.ddd.domain.model.Usuario;
import com.banco.ddd.infrastructure.adapter.out.persistence.CredencialUsuarioRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.TokenRevocadoRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Caso de uso: Gestión de usuarios (BC-01).
 * Las escrituras delegan en stored procedures para respetar la lógica SQL existente.
 * Las credenciales (contraseñas) se gestionan en tabla separada credencial_usuario.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository          usuarioRepository;
    private final CredencialUsuarioRepository credencialRepository;
    private final TokenRevocadoRepository     tokenRevocadoRepository;
    private final JdbcTemplate               jdbcTemplate;
    private final PasswordEncoder            passwordEncoder;

    // ── Queries ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<UsuarioResponse> listarUsuarios(Pageable pageable) {
        return usuarioRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public UsuarioResponse obtenerPorId(Long id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse obtenerPorCorreo(String correo) {
        return usuarioRepository.findByCorreoElectronico(correo)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", correo));
    }

    // ── Commands ─────────────────────────────────────────────────────────────

    @Transactional
    public UsuarioResponse crearUsuario(CrearUsuarioRequest req) {
        if (usuarioRepository.existsByCorreoElectronico(req.getCorreoElectronico())) {
            throw new BusinessRuleException("El correo ya está registrado");
        }
        if (usuarioRepository.existsByIdIdentificacion(req.getIdIdentificacion())) {
            throw new BusinessRuleException("La identificación ya está registrada");
        }

        // 1. Crear usuario vía stored procedure (respeta triggers y bitácora)
        jdbcTemplate.update(
                "CALL sp_crear_usuario(?, ?, ?, ?, ?, ?, ?, ?, @p_id_nuevo)",
                req.getNombreCompleto(),
                req.getIdIdentificacion(),
                req.getCorreoElectronico(),
                req.getTelefono(),
                req.getFechaNacimiento(),
                req.getDireccion(),
                req.getNombreRol(),
                req.getIdRelacionado()
        );

        Long idNuevo = jdbcTemplate.queryForObject("SELECT @p_id_nuevo", Long.class);
        log.info("Usuario creado con id={}", idNuevo);

        // 2. Guardar credencial hasheada en tabla separada
        Usuario usuario = findOrThrow(idNuevo);
        String  hash    = passwordEncoder.encode(req.getPassword());
        credencialRepository.save(new CredencialUsuario(usuario, hash));
        log.debug("Credencial guardada para usuario id={}", idNuevo);

        return toResponse(usuario);
    }

    @Transactional
    public void cambiarEstado(Long idUsuario, String nuevoEstado, String motivo) {
        findOrThrow(idUsuario);
        jdbcTemplate.update("CALL sp_cambiar_estado_usuario(?, ?, ?)",
                idUsuario, nuevoEstado, motivo);
        log.info("Estado de usuario id={} cambiado a {}", idUsuario, nuevoEstado);
    }

    @Transactional
    public void asignarRol(Long idUsuario, String nombreRol) {
        findOrThrow(idUsuario);
        jdbcTemplate.update("CALL sp_asignar_rol(?, ?)", idUsuario, nombreRol);
        log.info("Rol de usuario id={} cambiado a {}", idUsuario, nombreRol);
    }

    /**
     * Reset de contraseña administrativo (BC-01).
     *
     * <p>Operación restringida a ADMINISTRADOR y SUPERVISOR_EMPRESA.
     * Valida la política de contraseñas, actualiza el hash en
     * {@code credencial_usuario} y revoca todos los tokens activos
     * del usuario afectado, forzando re-login.</p>
     *
     * @param req correo del usuario, nueva contraseña y confirmación
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        // 1. Verificar que las contraseñas coincidan
        if (!req.getPasswordNuevo().equals(req.getPasswordConfirmacion())) {
            throw new BusinessRuleException(
                    "La nueva contraseña y su confirmación no coinciden");
        }

        // 2. Aplicar política de contraseñas bancaria
        PasswordPolicy.validate(req.getPasswordNuevo());

        // 3. Localizar usuario
        Usuario usuario = usuarioRepository.findByCorreoElectronico(req.getCorreoElectronico())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario", req.getCorreoElectronico()));

        // 4. Actualizar o crear credencial
        CredencialUsuario credencial = credencialRepository
                .findByCorreo(req.getCorreoElectronico())
                .orElseGet(() -> new CredencialUsuario(usuario, null));

        credencial.setPasswordHash(passwordEncoder.encode(req.getPasswordNuevo()));
        credencial.setFechaCambio(LocalDateTime.now());
        credencialRepository.save(credencial);

        // 5. Revocar todos los tokens activos del usuario (seguridad)
        int revocados = tokenRevocadoRepository.revocarPorUsuario(usuario.getIdUsuario());

        log.info("Reset de contraseña ejecutado — usuario={} tokens_revocados={}",
                usuario.getIdUsuario(), revocados);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Usuario findOrThrow(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
    }

    private UsuarioResponse toResponse(Usuario u) {
        return UsuarioResponse.builder()
                .idUsuario(u.getIdUsuario())
                .idRelacionado(u.getIdRelacionado())
                .nombreCompleto(u.getNombreCompleto())
                .idIdentificacion(u.getIdIdentificacion())
                .correoElectronico(u.getCorreoElectronico())
                .telefono(u.getTelefono())
                .fechaNacimiento(u.getFechaNacimiento())
                .direccion(u.getDireccion())
                .rol(u.getRol().getNombreRol().toUpperCase().replace(" ", "_"))
                .estadoUsuario(u.getEstadoUsuario().getNombreEstado())
                .fechaCreacion(u.getFechaCreacion())
                .build();
    }
}
