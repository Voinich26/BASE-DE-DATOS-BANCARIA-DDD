package com.banco.ddd.infrastructure.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Configuración JPA.
 * - Habilita repositorios JPA en el paquete de persistencia.
 * - Habilita gestión declarativa de transacciones.
 *
 * ddl-auto = validate: Hibernate valida el esquema contra la BD existente
 * pero NO lo modifica. La BD ya tiene su estructura completa con triggers,
 * SPs y constraints definidos en los scripts SQL.
 */
@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(
        basePackages = "com.banco.ddd.infrastructure.adapter.out.persistence"
)
public class JpaConfig {
    // La configuración de DataSource y JPA viene de application.yml
}
