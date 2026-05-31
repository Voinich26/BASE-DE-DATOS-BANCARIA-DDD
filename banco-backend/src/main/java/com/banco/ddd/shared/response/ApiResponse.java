package com.banco.ddd.shared.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Wrapper estándar para todas las respuestas de la API.
 * Garantiza un contrato uniforme: { success, message, data, timestamp, path }
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final String  message;
    private final T       data;
    private final String  path;
    private final LocalDateTime timestamp;

    private ApiResponse(boolean success, String message, T data, String path) {
        this.success   = success;
        this.message   = message;
        this.data      = data;
        this.path      = path;
        this.timestamp = LocalDateTime.now();
    }

    // ── Factory methods ──────────────────────────────────────────────────────

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, "OK", data, null);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    public static <T> ApiResponse<T> created(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    public static <T> ApiResponse<T> error(String message, String path) {
        return new ApiResponse<>(false, message, null, path);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null, null);
    }
}
