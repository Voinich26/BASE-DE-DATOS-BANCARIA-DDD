package com.banco.ddd.domain.model;

import com.banco.ddd.domain.exception.BusinessRuleException;

/**
 * Value Object: Política de contraseñas del banco.
 * Centraliza todas las reglas de validación de contraseñas.
 */
public final class PasswordPolicy {

    private static final int    MIN_LENGTH        = 8;
    private static final int    MAX_LENGTH        = 72;   // BCrypt limit
    private static final int    MAX_LOGIN_ATTEMPTS = 5;
    private static final int    LOCKOUT_MINUTES   = 30;

    private PasswordPolicy() {}

    /**
     * Valida que la contraseña cumpla la política bancaria.
     * Reglas: mínimo 8 chars, al menos 1 mayúscula, 1 minúscula, 1 dígito, 1 especial.
     */
    public static void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new BusinessRuleException(
                    "La contraseña debe tener al menos " + MIN_LENGTH + " caracteres");
        }
        if (password.length() > MAX_LENGTH) {
            throw new BusinessRuleException(
                    "La contraseña no puede superar " + MAX_LENGTH + " caracteres");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new BusinessRuleException(
                    "La contraseña debe contener al menos una letra mayúscula");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new BusinessRuleException(
                    "La contraseña debe contener al menos una letra minúscula");
        }
        if (!password.matches(".*\\d.*")) {
            throw new BusinessRuleException(
                    "La contraseña debe contener al menos un dígito");
        }
        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
            throw new BusinessRuleException(
                    "La contraseña debe contener al menos un carácter especial");
        }
    }

    public static int getMaxLoginAttempts() { return MAX_LOGIN_ATTEMPTS; }
    public static int getLockoutMinutes()   { return LOCKOUT_MINUTES; }
}
