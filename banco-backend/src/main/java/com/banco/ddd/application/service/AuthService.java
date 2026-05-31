package com.banco.ddd.application.service;

import com.banco.ddd.application.dto.request.ChangePasswordRequest;
import com.banco.ddd.application.dto.request.LoginRequest;
import com.banco.ddd.application.dto.request.LogoutRequest;
import com.banco.ddd.application.dto.request.RefreshTokenRequest;
import com.banco.ddd.application.dto.response.AuthResponse;
import com.banco.ddd.application.dto.response.UsuarioInfoResponse;
import com.banco.ddd.application.port.in.AuthUseCase;
import com.banco.ddd.domain.exception.AccountLockedException;
import com.banco.ddd.domain.exception.AuthenticationException;
import com.banco.ddd.domain.exception.BusinessRuleException;
import com.banco.ddd.domain.exception.ResourceNotFoundException;
import com.banco.ddd.domain.exception.TokenException;
import com.banco.ddd.domain.model.CredencialUsuario;
import com.banco.ddd.domain.model.IntentoLogin;
import com.banco.ddd.domain.model.PasswordPolicy;
import com.banco.ddd.domain.model.TokenRevocado;
import com.banco.ddd.domain.model.Usuario;
import com.banco.ddd.infrastructure.adapter.out.persistence.CredencialUsuarioRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.IntentoLoginRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.TokenRevocadoRepository;
import com.banco.ddd.infrastructure.adapter.out.persistence.UsuarioRepository;
import com.banco.ddd.infrastructure.security.JwtProperties;
import com.banco.ddd.infrastructure.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Caso de uso: Autenticación y autorización enterprise (BC-01).
 *
 * <p>Implementa el contrato {@link AuthUseCase} con:</p>
 * <ul>
 *   <li>Login con brute-force protection y auditoría</li>
 *   <li>Refresh token rotation (previene token replay)</li>
 *   <li>Logout seguro con revocación de tokens</li>
 *   <li>Cambio de contraseña con política bancaria</li>
 *   <li>Validación de estado de cuenta (bloqueado/inactivo)</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService implements AuthUseCase {

    // ── Dependencias ─────────────────────────────────────────────────────────

    private final AuthenticationManager       authenticationManager;
    private final UserDetailsService          userDetailsService;
    private final UsuarioRepository           usuarioRepository;
    private final CredencialUsuarioRepository credencialRepository;
    private final TokenRevocadoRepository     tokenRevocadoRepository;
    private final IntentoLoginRepository      intentoLoginRepository;
    private final JwtService                  jwtService;
    private final JwtProperties               jwtProperties;
    private final PasswordEncoder             passwordEncoder;

    // ── Constantes ────────────────────────────────────────────────────────────

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String AUTH_HEADER   = "Authorization";

    // ── Login ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String correo    = request.getCorreoElectronico();
        String ip        = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        MDC.put("usuario", correo);
        MDC.put("ip", ip);

        try {
            // 1. Verificar brute-force antes de intentar autenticar
            verificarBruteForce(correo, ip);

            // 2. Verificar estado del usuario antes de autenticar
            verificarEstadoUsuario(correo);

            // 3. Autenticar con Spring Security
            try {
                authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(correo, request.getPassword()));
            } catch (BadCredentialsException e) {
                registrarIntento(correo, ip, userAgent, false);
                log.warn("Credenciales inválidas para: {}", correo);
                throw new AuthenticationException("Credenciales inválidas");
            } catch (LockedException e) {
                registrarIntento(correo, ip, userAgent, false);
                throw new AccountLockedException("Cuenta bloqueada. Contacte al administrador");
            } catch (DisabledException e) {
                registrarIntento(correo, ip, userAgent, false);
                throw new AuthenticationException("Cuenta inactiva. Contacte al administrador");
            }

            // 4. Cargar usuario completo con rol
            Usuario usuario = usuarioRepository.findByCorreoWithRol(correo)
                    .orElseThrow(() -> new ResourceNotFoundException("Usuario", correo));

            // 5. Generar tokens con claims enriquecidos
            Map<String, Object> extraClaims = buildClaims(usuario);
            String accessToken  = jwtService.generateToken(extraClaims, usuario);
            String refreshToken = jwtService.generateRefreshToken(usuario);

            // 6. Registrar intento exitoso
            registrarIntento(correo, ip, userAgent, true);

            log.info("Login exitoso — usuario={} rol={} ip={}",
                    usuario.getIdUsuario(), usuario.getRol().getNombreRol(), ip);

            return buildAuthResponse(usuario, accessToken, refreshToken);

        } finally {
            MDC.remove("usuario");
            MDC.remove("ip");
        }
    }

    // ── Refresh Token ─────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        // 1. Extraer username del refresh token
        String correo;
        try {
            correo = jwtService.extractUsername(refreshToken);
        } catch (Exception e) {
            throw new TokenException("Refresh token inválido o malformado");
        }

        // 2. Verificar que no esté revocado
        String jti = jwtService.extractJti(refreshToken);
        if (tokenRevocadoRepository.existsByJti(jti)) {
            log.warn("Intento de uso de refresh token revocado — jti={} correo={}", jti, correo);
            // Posible token replay attack: revocar todos los tokens del usuario
            revocarTodosLosTokensDelUsuario(correo);
            throw new TokenException("Refresh token revocado. Inicie sesión nuevamente");
        }

        // 3. Cargar usuario y validar token
        UserDetails userDetails = userDetailsService.loadUserByUsername(correo);
        if (!jwtService.isTokenValid(refreshToken, userDetails)) {
            throw new TokenException("Refresh token expirado o inválido");
        }

        // 4. Verificar estado del usuario
        verificarEstadoUsuario(correo);

        // 5. Revocar el refresh token actual (rotation)
        Usuario usuario = usuarioRepository.findByCorreoWithRol(correo)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", correo));

        revocarToken(jti, usuario.getIdUsuario(), TokenRevocado.TipoToken.REFRESH,
                jwtService.extractExpiration(refreshToken).toInstant()
                        .atZone(java.time.ZoneId.systemDefault()).toLocalDateTime(),
                "refresh_rotation");

        // 6. Emitir nuevo par de tokens
        Map<String, Object> extraClaims = buildClaims(usuario);
        String newAccessToken  = jwtService.generateToken(extraClaims, usuario);
        String newRefreshToken = jwtService.generateRefreshToken(usuario);

        log.info("Refresh token rotado — usuario={}", usuario.getIdUsuario());

        return buildAuthResponse(usuario, newAccessToken, newRefreshToken);
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void logout(LogoutRequest request, HttpServletRequest httpRequest) {
        // 1. Revocar refresh token
        String refreshToken = request.getRefreshToken();
        try {
            String refreshJti = jwtService.extractJti(refreshToken);
            String correo     = jwtService.extractUsername(refreshToken);
            Usuario usuario   = usuarioRepository.findByCorreoElectronico(correo)
                    .orElseThrow(() -> new ResourceNotFoundException("Usuario", correo));

            LocalDateTime refreshExp = jwtService.extractExpiration(refreshToken).toInstant()
                    .atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();

            revocarToken(refreshJti, usuario.getIdUsuario(),
                    TokenRevocado.TipoToken.REFRESH, refreshExp, "logout");

            // 2. Revocar access token del header si está presente
            String authHeader = httpRequest.getHeader(AUTH_HEADER);
            if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
                String accessToken = authHeader.substring(BEARER_PREFIX.length());
                try {
                    String accessJti = jwtService.extractJti(accessToken);
                    LocalDateTime accessExp = jwtService.extractExpiration(accessToken).toInstant()
                            .atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();
                    revocarToken(accessJti, usuario.getIdUsuario(),
                            TokenRevocado.TipoToken.ACCESS, accessExp, "logout");
                } catch (Exception e) {
                    log.debug("No se pudo revocar access token en logout: {}", e.getMessage());
                }
            }

            log.info("Logout exitoso — usuario={}", usuario.getIdUsuario());

        } catch (TokenException | ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Error procesando logout: {}", e.getMessage());
            throw new TokenException("Refresh token inválido");
        }
    }

    // ── Change Password ───────────────────────────────────────────────────────

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request, HttpServletRequest httpRequest) {
        // 1. Obtener usuario autenticado del contexto de seguridad
        String correo = getAuthenticatedUsername(httpRequest);
        Usuario usuario = usuarioRepository.findByCorreoWithRol(correo)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", correo));

        // 2. Cargar credencial actual
        CredencialUsuario credencial = credencialRepository.findByCorreo(correo)
                .orElseThrow(() -> new BusinessRuleException("Credenciales no configuradas"));

        // 3. Verificar contraseña actual
        if (!passwordEncoder.matches(request.getPasswordActual(), credencial.getPasswordHash())) {
            log.warn("Cambio de contraseña fallido — contraseña actual incorrecta, usuario={}",
                    usuario.getIdUsuario());
            throw new AuthenticationException("La contraseña actual es incorrecta");
        }

        // 4. Validar que nueva != actual
        if (passwordEncoder.matches(request.getPasswordNuevo(), credencial.getPasswordHash())) {
            throw new BusinessRuleException(
                    "La nueva contraseña no puede ser igual a la contraseña actual");
        }

        // 5. Validar confirmación
        if (!request.getPasswordNuevo().equals(request.getPasswordConfirmacion())) {
            throw new BusinessRuleException(
                    "La nueva contraseña y su confirmación no coinciden");
        }

        // 6. Aplicar política de contraseñas
        PasswordPolicy.validate(request.getPasswordNuevo());

        // 7. Actualizar hash
        credencial.setPasswordHash(passwordEncoder.encode(request.getPasswordNuevo()));
        credencial.setFechaCambio(LocalDateTime.now());
        credencialRepository.save(credencial);

        // 8. Revocar todos los tokens activos (fuerza re-login en todos los dispositivos)
        revocarTodosLosTokensDelUsuario(correo);

        log.info("Contraseña cambiada exitosamente — usuario={}", usuario.getIdUsuario());
    }

    // ── Me ────────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public UsuarioInfoResponse me(HttpServletRequest httpRequest) {
        String correo = getAuthenticatedUsername(httpRequest);
        Usuario usuario = usuarioRepository.findByCorreoWithRol(correo)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", correo));

        return UsuarioInfoResponse.builder()
                .idUsuario(usuario.getIdUsuario())
                .nombreCompleto(usuario.getNombreCompleto())
                .correoElectronico(usuario.getCorreoElectronico())
                .idIdentificacion(usuario.getIdIdentificacion())
                .telefono(usuario.getTelefono())
                .fechaNacimiento(usuario.getFechaNacimiento())
                .direccion(usuario.getDireccion())
                .rol(normalizarRol(usuario.getRol().getNombreRol()))
                .estadoUsuario(usuario.getEstadoUsuario().getNombreEstado())
                .fechaCreacion(usuario.getFechaCreacion())
                .fechaModificacion(usuario.getFechaModificacion())
                .build();
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    /**
     * Verifica si el usuario ha superado el límite de intentos fallidos.
     * Ventana de tiempo: últimos {@code LOCKOUT_MINUTES} minutos.
     */
    private void verificarBruteForce(String correo, String ip) {
        LocalDateTime desde = LocalDateTime.now()
                .minusMinutes(PasswordPolicy.getLockoutMinutes());

        long intentosPorCorreo = intentoLoginRepository
                .contarIntentosFallidos(correo, desde);
        long intentosPorIp = intentoLoginRepository
                .contarIntentosFallidosPorIp(ip, desde);

        if (intentosPorCorreo >= PasswordPolicy.getMaxLoginAttempts()) {
            log.warn("Brute-force detectado — correo={} intentos={}", correo, intentosPorCorreo);
            throw new AccountLockedException(
                    "Cuenta temporalmente bloqueada por exceso de intentos fallidos. " +
                    "Intente nuevamente en " + PasswordPolicy.getLockoutMinutes() + " minutos");
        }

        if (intentosPorIp >= PasswordPolicy.getMaxLoginAttempts() * 3L) {
            log.warn("Brute-force por IP detectado — ip={} intentos={}", ip, intentosPorIp);
            throw new AccountLockedException(
                    "Demasiados intentos desde su dirección IP. " +
                    "Intente nuevamente en " + PasswordPolicy.getLockoutMinutes() + " minutos");
        }
    }

    /**
     * Verifica que el usuario exista y su estado sea Activo.
     */
    private void verificarEstadoUsuario(String correo) {
        usuarioRepository.findByCorreoElectronico(correo).ifPresent(u -> {
            String estado = u.getEstadoUsuario().getNombreEstado();
            if ("Bloqueado".equals(estado)) {
                throw new AccountLockedException(
                        "Cuenta bloqueada. Contacte al administrador del banco");
            }
            if (!"Activo".equals(estado)) {
                throw new AuthenticationException(
                        "Cuenta inactiva (estado: " + estado + "). Contacte al administrador");
            }
        });
    }

    /**
     * Registra un intento de login en la tabla de auditoría.
     */
    private void registrarIntento(String correo, String ip, String userAgent, boolean exitoso) {
        try {
            intentoLoginRepository.save(new IntentoLogin(correo, ip, exitoso, userAgent));
        } catch (Exception e) {
            // No fallar el flujo principal por error de auditoría
            log.error("Error registrando intento de login: {}", e.getMessage());
        }
    }

    /**
     * Revoca un token individual añadiéndolo a la blacklist.
     */
    private void revocarToken(String jti, Long idUsuario, TokenRevocado.TipoToken tipo,
                               LocalDateTime fechaExpiracion, String motivo) {
        if (!tokenRevocadoRepository.existsByJti(jti)) {
            tokenRevocadoRepository.save(
                    new TokenRevocado(jti, idUsuario, tipo, fechaExpiracion, motivo));
        }
    }

    /**
     * Revoca todos los tokens activos de un usuario (logout global).
     * Usado en cambio de contraseña y detección de token replay.
     */
    private void revocarTodosLosTokensDelUsuario(String correo) {
        usuarioRepository.findByCorreoElectronico(correo).ifPresent(u -> {
            int revocados = tokenRevocadoRepository.revocarPorUsuario(u.getIdUsuario());
            log.info("Tokens revocados para usuario={}: {}", u.getIdUsuario(), revocados);
        });
    }

    /**
     * Construye los claims adicionales del JWT con información del usuario.
     * El rol se normaliza a UPPER_SNAKE_CASE para que coincida con los tipos
     * del frontend (ej. "Administrador" → "ADMINISTRADOR").
     */
    private Map<String, Object> buildClaims(Usuario usuario) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("idUsuario",  usuario.getIdUsuario());
        claims.put("nombre",     usuario.getNombreCompleto());
        claims.put("rol",        normalizarRol(usuario.getRol().getNombreRol()));
        claims.put("estado",     usuario.getEstadoUsuario().getNombreEstado());
        return claims;
    }

    /**
     * Normaliza el nombre del rol de la BD al formato UPPER_SNAKE_CASE
     * que usa el frontend (ej. "Supervisor Empresa" → "SUPERVISOR_EMPRESA").
     */
    private String normalizarRol(String nombreRol) {
        if (nombreRol == null) return "";
        return nombreRol.toUpperCase().replace(" ", "_");
    }

    /**
     * Construye la respuesta de autenticación estándar.
     * El rol se normaliza a UPPER_SNAKE_CASE para consistencia con el frontend.
     */
    private AuthResponse buildAuthResponse(Usuario usuario, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getExpirationMs() / 1000)
                .idUsuario(usuario.getIdUsuario())
                .nombreCompleto(usuario.getNombreCompleto())
                .correoElectronico(usuario.getCorreoElectronico())
                .rol(normalizarRol(usuario.getRol().getNombreRol()))
                .build();
    }

    /**
     * Extrae el username del usuario autenticado en el contexto de seguridad.
     * Si no hay autenticación activa, intenta extraerlo del token JWT del header.
     */
    private String getAuthenticatedUsername(HttpServletRequest httpRequest) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof UserDetails ud) {
            return ud.getUsername();
        }

        // Fallback: extraer del token JWT
        String authHeader = httpRequest.getHeader(AUTH_HEADER);
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            String token = authHeader.substring(BEARER_PREFIX.length());
            try {
                return jwtService.extractUsername(token);
            } catch (Exception e) {
                throw new TokenException("No se pudo determinar el usuario autenticado");
            }
        }

        throw new AuthenticationException("No hay sesión activa");
    }

    /**
     * Extrae la IP real del cliente considerando proxies y load balancers.
     */
    private String extractClientIp(HttpServletRequest request) {
        String[] headers = {
            "X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP",
            "WL-Proxy-Client-IP", "HTTP_X_FORWARDED_FOR"
        };
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
                // X-Forwarded-For puede contener múltiples IPs: tomar la primera
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
