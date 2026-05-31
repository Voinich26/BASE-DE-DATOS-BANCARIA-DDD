package com.banco.ddd.domain.exception;

/**
 * Fallo de autenticación: credenciales inválidas, cuenta bloqueada, etc.
 * Mapea a HTTP 401.
 */
public class AuthenticationException extends DomainException {

    public AuthenticationException(String message) {
        super(message);
    }
}
