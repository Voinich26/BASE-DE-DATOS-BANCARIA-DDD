package com.banco.ddd.domain.exception;

/**
 * Recurso no encontrado en la base de datos (404).
 */
public class ResourceNotFoundException extends DomainException {

    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " con id '" + id + "' no encontrado");
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
