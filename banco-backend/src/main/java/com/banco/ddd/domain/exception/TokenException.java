package com.banco.ddd.domain.exception;

/**
 * Token JWT inválido, expirado o revocado.
 * Mapea a HTTP 401.
 */
public class TokenException extends DomainException {

    public TokenException(String message) {
        super(message);
    }
}
