package com.banco.ddd.infrastructure.security.filter;

import com.banco.ddd.infrastructure.security.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Filtro JWT enterprise: extrae, valida y establece el contexto de seguridad.
 *
 * <p>Características:</p>
 * <ul>
 *   <li>Verifica firma, expiración y blacklist de tokens revocados</li>
 *   <li>Rechaza refresh tokens usados como access tokens</li>
 *   <li>Enriquece el MDC con usuario y rol para trazabilidad en logs</li>
 *   <li>Omite rutas públicas para evitar carga innecesaria</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String AUTH_HEADER   = "Authorization";
    private static final String MDC_USER      = "usuario";
    private static final String MDC_ROL       = "rol";

    /** Rutas que no requieren validación JWT. */
    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/api/v1/auth/login",
            "/api/auth/login",
            "/api/v3/api-docs",
            "/api/swagger-ui",
            "/api/actuator/health"
    );

    private final JwtService         jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader(AUTH_HEADER);

        // Sin header Authorization → continuar sin autenticar (Spring Security manejará el 401)
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(BEARER_PREFIX.length());
        final String username;

        try {
            username = jwtService.extractUsername(jwt);
        } catch (Exception e) {
            log.warn("No se pudo extraer username del JWT en {}: {}",
                    request.getRequestURI(), e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        // Solo procesar si hay username y no hay autenticación previa en el contexto
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                // Rechazar refresh tokens usados como access tokens
                String tokenType = jwtService.extractTokenType(jwt);
                if ("REFRESH".equals(tokenType)) {
                    log.warn("Intento de usar refresh token como access token — usuario={}", username);
                    filterChain.doFilter(request, response);
                    return;
                }

                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    // Enriquecer MDC para trazabilidad en logs
                    MDC.put(MDC_USER, username);
                    String rol = jwtService.extractRol(jwt);
                    if (rol != null) MDC.put(MDC_ROL, rol);

                    log.debug("JWT autenticado — usuario={} path={}", username,
                            request.getRequestURI());
                } else {
                    log.debug("JWT inválido o revocado para usuario={}", username);
                }

            } catch (Exception e) {
                log.warn("Error validando JWT para usuario={}: {}", username, e.getMessage());
            }
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_USER);
            MDC.remove(MDC_ROL);
        }
    }
}
