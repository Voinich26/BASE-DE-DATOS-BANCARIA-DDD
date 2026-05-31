package com.banco.ddd.infrastructure.adapter.in.web.controller;

import com.banco.ddd.domain.exception.AccountLockedException;
import com.banco.ddd.domain.exception.AuthenticationException;
import com.banco.ddd.domain.exception.BusinessRuleException;
import com.banco.ddd.domain.exception.ResourceNotFoundException;
import com.banco.ddd.domain.exception.TokenException;
import com.banco.ddd.domain.exception.UnauthorizedOperationException;
import com.banco.ddd.shared.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.UncategorizedSQLException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
/**
 * Manejador global de excepciones.
 * Convierte todas las excepciones en respuestas ApiResponse uniformes.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── Dominio ───────────────────────────────────────────────────────────────

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex,
                                                             HttpServletRequest req) {
        log.warn("Recurso no encontrado: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessRule(BusinessRuleException ex,
                                                                  HttpServletRequest req) {
        log.warn("Regla de negocio violada: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiResponse.error(ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(UnauthorizedOperationException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedOperationException ex,
                                                                  HttpServletRequest req) {
        log.warn("Operación no autorizada: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ex.getMessage(), req.getRequestURI()));
    }

    // ── Autenticación y tokens ────────────────────────────────────────────────

    /**
     * Cuenta bloqueada por brute-force o por administrador.
     * HTTP 423 Locked — semántica correcta para cuenta bloqueada.
     */
    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccountLocked(AccountLockedException ex,
                                                                   HttpServletRequest req) {
        log.warn("Cuenta bloqueada — path={}: {}", req.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.LOCKED)
                .body(ApiResponse.error(ex.getMessage(), req.getRequestURI()));
    }

    /**
     * Fallo de autenticación: credenciales inválidas, cuenta inactiva, etc.
     * HTTP 401 Unauthorized.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthException(AuthenticationException ex,
                                                                   HttpServletRequest req) {
        log.warn("Fallo de autenticación — path={}: {}", req.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(ex.getMessage(), req.getRequestURI()));
    }

    /**
     * Token JWT inválido, expirado o revocado.
     * HTTP 401 Unauthorized.
     */
    @ExceptionHandler(TokenException.class)
    public ResponseEntity<ApiResponse<Void>> handleTokenException(TokenException ex,
                                                                    HttpServletRequest req) {
        log.warn("Token inválido — path={}: {}", req.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(ex.getMessage(), req.getRequestURI()));
    }

    // ── Validación ────────────────────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest req) {

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field   = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            errors.put(field, message);
        });

        log.warn("Validación fallida: {}", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("Errores de validación: " + errors, req.getRequestURI()));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(
            ConstraintViolationException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage(), req.getRequestURI()));
    }

    // ── SQL / Base de datos ───────────────────────────────────────────────────

    /**
     * Captura los SIGNAL SQLSTATE '45000' de los stored procedures.
     * El mensaje del SP se extrae y se devuelve al cliente.
     */
    @ExceptionHandler(UncategorizedSQLException.class)
    public ResponseEntity<ApiResponse<Void>> handleSqlException(UncategorizedSQLException ex,
                                                                  HttpServletRequest req) {
        String message = extractSqlMessage(ex);
        log.warn("Error SQL (SP/Trigger): {}", message);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiResponse.error(message, req.getRequestURI()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex,
                                                                   HttpServletRequest req) {
        log.warn("Violación de integridad de datos: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error("Conflicto de datos: registro duplicado o referencia inválida",
                        req.getRequestURI()));
    }

    // ── Seguridad ─────────────────────────────────────────────────────────────

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex,
                                                                  HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("Acceso denegado: permisos insuficientes",
                        req.getRequestURI()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex,
                                                                    HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Credenciales inválidas", req.getRequestURI()));
    }

    // ── Genérico ──────────────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex, HttpServletRequest req) {
        log.error("Error inesperado en {}: {}", req.getRequestURI(), ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Error interno del servidor", req.getRequestURI()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String extractSqlMessage(UncategorizedSQLException ex) {
        Throwable cause = ex.getCause();
        if (cause instanceof SQLException sqlEx) {
            return sqlEx.getMessage();
        }
        return ex.getMessage();
    }
}
