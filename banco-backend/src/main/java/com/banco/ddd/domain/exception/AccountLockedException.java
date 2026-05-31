package com.banco.ddd.domain.exception;

/**
 * Cuenta bloqueada por exceso de intentos fallidos o por administrador.
 * Mapea a HTTP 423 Locked.
 */
public class AccountLockedException extends DomainException {

    public AccountLockedException(String message) {
        super(message);
    }
}
