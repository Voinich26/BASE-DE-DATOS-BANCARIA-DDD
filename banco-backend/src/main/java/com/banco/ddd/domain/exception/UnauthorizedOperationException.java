package com.banco.ddd.domain.exception;

/**
 * Operación no permitida para el rol del usuario autenticado (403).
 */
public class UnauthorizedOperationException extends DomainException {

    public UnauthorizedOperationException(String message) {
        super(message);
    }
}
