package com.banco.ddd.infrastructure.config;

import com.banco.ddd.infrastructure.security.JwtAccessDeniedHandler;
import com.banco.ddd.infrastructure.security.JwtAuthEntryPoint;
import com.banco.ddd.infrastructure.security.filter.JwtAuthenticationFilter;
import com.banco.ddd.infrastructure.security.filter.RateLimitingFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

/**
 * Configuración central de Spring Security — enterprise banking grade.
 *
 * <p>Características:</p>
 * <ul>
 *   <li>Stateless JWT — sin sesiones HTTP</li>
 *   <li>BCrypt strength=12 para contraseñas</li>
 *   <li>CSRF deshabilitado (API REST stateless — no aplica)</li>
 *   <li>Headers de seguridad HTTP hardening</li>
 *   <li>Rate limiting en endpoints de autenticación</li>
 *   <li>RBAC granular por endpoint</li>
 *   <li>Method-level security con {@code @PreAuthorize}</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final RateLimitingFilter      rateLimitingFilter;
    private final UserDetailsService      userDetailsService;
    private final JwtAuthEntryPoint       jwtAuthEntryPoint;
    private final JwtAccessDeniedHandler  jwtAccessDeniedHandler;

    // ── Rutas públicas ────────────────────────────────────────────────────────

    private static final String[] PUBLIC_PATHS = {
            "/v1/auth/login",
            "/v1/auth/refresh",
            "/auth/**",                  // compatibilidad hacia atrás
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/actuator/health"
    };

    // ── Security Filter Chain ─────────────────────────────────────────────────

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ── CSRF: deshabilitado — API REST stateless con JWT ──────────────
            .csrf(AbstractHttpConfigurer::disable)

            // ── Sesiones: completamente stateless ────────────────────────────
            .sessionManagement(sm ->
                sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── Headers de seguridad HTTP ─────────────────────────────────────
            .headers(headers -> headers
                // Previene clickjacking
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                // Fuerza HTTPS (HSTS) — 1 año, incluye subdominios
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31_536_000)
                    .preload(true))
                // Previene MIME sniffing
                .contentTypeOptions(Customizer.withDefaults())
                // Política de referrer
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                // Content Security Policy
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "frame-ancestors 'none'; " +
                        "form-action 'self'"))
                // Permissions Policy (Feature Policy)
                .permissionsPolicy(pp -> pp
                    .policy("camera=(), microphone=(), geolocation=(), payment=()"))
            )

            // ── Manejo de errores de seguridad ────────────────────────────────
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(jwtAuthEntryPoint)
                .accessDeniedHandler(jwtAccessDeniedHandler))

            // ── Autorización por endpoint ─────────────────────────────────────
            .authorizeHttpRequests(auth -> auth
                // Rutas públicas
                .requestMatchers(PUBLIC_PATHS).permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // ── BC-06 Bitácola: supervisores y analistas ──────────────────
                .requestMatchers("/v1/bitacola/**", "/bitacola/**")
                    .hasAnyRole("SUPERVISOR_EMPRESA", "ANALISTA_INTERNO", "ADMINISTRADOR")

                // ── BC-06 Pagos Masivos — procesar/rechazar (Supervisor) ──────
                .requestMatchers(HttpMethod.POST,
                        "/v1/batches/*/process",
                        "/v1/batches/*/reject")
                    .hasAnyRole("SUPERVISOR_EMPRESA", "ADMINISTRADOR")

                // ── BC-06 Pagos Masivos — métricas (Admin/Analista) ───────────
                .requestMatchers(HttpMethod.GET, "/v1/batches/metrics")
                    .hasAnyRole("ANALISTA_INTERNO", "SUPERVISOR_EMPRESA", "ADMINISTRADOR")

                // ── BC-06 Pagos Masivos — crear lote (Empresa/Empleado) ───────
                .requestMatchers(HttpMethod.POST, "/v1/batches")
                    .hasAnyRole("CLIENTE_EMPRESA", "EMPLEADO_VENTANILLA",
                                "SUPERVISOR_EMPRESA", "ADMINISTRADOR")

                // ── BC-04 Préstamos — aprobar (Analista) ─────────────────────────
                .requestMatchers(HttpMethod.POST,
                        "/v1/prestamos/*/aprobar",
                        "/prestamos/*/aprobar")
                    .hasAnyRole("ANALISTA_INTERNO", "ADMINISTRADOR")

                // ── BC-04 Préstamos — rechazar (Analista) ───────────────────────
                .requestMatchers(HttpMethod.POST,
                        "/v1/prestamos/*/rechazar",
                        "/prestamos/*/rechazar")
                    .hasAnyRole("ANALISTA_INTERNO", "ADMINISTRADOR")

                // ── BC-04 Préstamos — desembolsar (Supervisor) ────────────────
                .requestMatchers(HttpMethod.POST,
                        "/v1/prestamos/*/desembolsar",
                        "/prestamos/*/desembolsar")
                    .hasAnyRole("SUPERVISOR_EMPRESA", "ADMINISTRADOR")

                // ── BC-05 Transferencias ──────────────────────────────────────
                .requestMatchers(HttpMethod.POST,
                        "/v1/transferencias/*/aprobar", "/v1/transferencias/*/rechazar",
                        "/transferencias/*/aprobar",    "/transferencias/*/rechazar")
                    .hasAnyRole("SUPERVISOR_EMPRESA", "ADMINISTRADOR")

                // ── BC-03 Cuentas — operaciones de caja ──────────────────────
                .requestMatchers(
                        "/v1/accounts/deposit", "/v1/accounts/withdraw",
                        "/v1/cuentas/depositar", "/v1/cuentas/retirar",
                        "/cuentas/depositar",    "/cuentas/retirar")
                    .hasAnyRole("EMPLEADO_VENTANILLA", "ADMINISTRADOR")

                // ── BC-03 Cuentas — bloqueo/cancelación ──────────────────────
                .requestMatchers(HttpMethod.PATCH,
                        "/v1/accounts/*/block", "/v1/accounts/*/cancel")
                    .hasAnyRole("ANALISTA_INTERNO", "SUPERVISOR_EMPRESA", "ADMINISTRADOR")

                // ── Admin: gestión de usuarios ────────────────────────────────
                .requestMatchers(HttpMethod.POST,   "/v1/usuarios/**")
                    .hasAnyRole("ADMINISTRADOR", "SUPERVISOR_EMPRESA", "ANALISTA_INTERNO", "EMPLEADO_VENTANILLA")
                .requestMatchers(HttpMethod.PATCH,  "/v1/usuarios/**")
                    .hasAnyRole("ADMINISTRADOR", "SUPERVISOR_EMPRESA")

                // Todo lo demás requiere autenticación
                .anyRequest().authenticated()
            )

            // ── Proveedor de autenticación ────────────────────────────────────
            .authenticationProvider(authenticationProvider())

            // ── Filtros: rate limiting → JWT auth ─────────────────────────────
            .addFilterBefore(rateLimitingFilter,   UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter,        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // ── Beans de autenticación ────────────────────────────────────────────────

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * BCrypt con strength=12 — balance entre seguridad y rendimiento.
     * En un servidor bancario moderno, ~250ms por hash es aceptable.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
