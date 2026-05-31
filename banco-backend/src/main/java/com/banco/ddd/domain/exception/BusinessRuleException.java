package com.banco.ddd.domain.exception;

/**
 * Violación de una regla de negocio (400 / 422).
 * Ejemplo: saldo insuficiente, estado inválido, rol no autorizado.
 */
public class BusinessRuleException extends DomainException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
