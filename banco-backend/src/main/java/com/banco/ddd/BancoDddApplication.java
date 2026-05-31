package com.banco.ddd;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Punto de entrada del backend bancario DDD.
 * Arquitectura Hexagonal (Ports & Adapters) sobre base de datos MySQL existente.
 *
 * <p>{@code @EnableScheduling} activa la limpieza periódica de tokens JWT expirados.</p>
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class BancoDddApplication {

    public static void main(String[] args) {
        SpringApplication.run(BancoDddApplication.class, args);
    }
}
