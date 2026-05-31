package com.banco.ddd.infrastructure.security.filter;

import com.banco.ddd.shared.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiting básico en memoria para endpoints de autenticación.
 *
 * <p>Estrategia: ventana deslizante por IP. Límites configurados:</p>
 * <ul>
 *   <li>{@code /v1/auth/login}   → máx. 10 req / 60 seg por IP</li>
 *   <li>{@code /v1/auth/refresh} → máx. 20 req / 60 seg por IP</li>
 * </ul>
 *
 * <p>En producción bancaria real, reemplazar con Redis + Bucket4j para
 * rate limiting distribuido entre instancias.</p>
 */
@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    // ── Configuración ─────────────────────────────────────────────────────────

    private static final int    LOGIN_MAX_REQUESTS   = 10;
    private static final int    REFRESH_MAX_REQUESTS = 20;
    private static final long   WINDOW_SECONDS       = 60L;

    // ── Estado en memoria ─────────────────────────────────────────────────────

    /** Mapa: IP → (contador, timestamp inicio ventana) */
    private final Map<String, RequestWindow> loginWindows   = new ConcurrentHashMap<>();
    private final Map<String, RequestWindow> refreshWindows = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;

    public RateLimitingFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        // Solo aplica a endpoints de auth sensibles
        return !path.contains("/v1/auth/login") && !path.contains("/v1/auth/refresh");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String ip   = extractClientIp(request);
        String path = request.getRequestURI();

        boolean isLogin   = path.contains("/v1/auth/login");
        boolean isRefresh = path.contains("/v1/auth/refresh");

        Map<String, RequestWindow> windows = isLogin ? loginWindows : refreshWindows;
        int maxRequests = isLogin ? LOGIN_MAX_REQUESTS : REFRESH_MAX_REQUESTS;

        RequestWindow window = windows.compute(ip, (k, existing) -> {
            long now = Instant.now().getEpochSecond();
            if (existing == null || (now - existing.windowStart) >= WINDOW_SECONDS) {
                return new RequestWindow(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        int currentCount = window.count.get();

        // Agregar headers informativos de rate limit
        response.setHeader("X-RateLimit-Limit",     String.valueOf(maxRequests));
        response.setHeader("X-RateLimit-Remaining",
                String.valueOf(Math.max(0, maxRequests - currentCount)));
        response.setHeader("X-RateLimit-Reset",
                String.valueOf(window.windowStart + WINDOW_SECONDS));

        if (currentCount > maxRequests) {
            log.warn("Rate limit excedido — ip={} path={} count={}", ip, path, currentCount);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            ApiResponse<Void> body = ApiResponse.error(
                    "Demasiadas solicitudes. Intente nuevamente en " + WINDOW_SECONDS + " segundos",
                    path);
            objectMapper.writeValue(response.getOutputStream(), body);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String[] headers = {"X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP"};
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    // ── Inner class ───────────────────────────────────────────────────────────

    private static class RequestWindow {
        final long          windowStart;
        final AtomicInteger count;

        RequestWindow(long windowStart, AtomicInteger count) {
            this.windowStart = windowStart;
            this.count       = count;
        }
    }
}
