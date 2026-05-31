package com.banco.ddd.infrastructure.security;

import com.banco.ddd.shared.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Maneja el error 403 cuando un usuario autenticado intenta acceder
 * a un recurso para el que no tiene permisos.
 *
 * <p>Devuelve un {@code ApiResponse} JSON uniforme en lugar de la
 * página de error por defecto de Spring Security.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {

        log.warn("Acceso denegado a {} — usuario={}: {}",
                request.getRequestURI(),
                request.getUserPrincipal() != null
                        ? request.getUserPrincipal().getName()
                        : "anónimo",
                accessDeniedException.getMessage());

        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ApiResponse<Void> body = ApiResponse.error(
                "Acceso denegado: no tiene permisos para esta operación",
                request.getRequestURI());

        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
