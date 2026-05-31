package com.banco.ddd.domain.exception;

/**
 * Excepción base para violaciones de reglas de negocio del dominio.
 * Mapea los SIGNAL SQLSTATE '45000' que lanzan los stored procedures.
 */
public class DomainException extends RuntimeException {

    public DomainException(String message) {
        super(message);
    }

    public DomainException(String message, Throwable cause) {
        super(message, cause);
    }
}
