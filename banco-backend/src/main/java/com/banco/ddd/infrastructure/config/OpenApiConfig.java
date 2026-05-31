package com.banco.ddd.infrastructure.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuración de Swagger / OpenAPI 3.
 * Acceso: http://localhost:8080/api/swagger-ui.html
 */
@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI bancoDddOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Banco DDD — API REST")
                        .description("""
                                Backend bancario profesional con Arquitectura Hexagonal.
                                
                                **Bounded Contexts:**
                                - BC-01: Identidad y Acceso (Usuarios)
                                - BC-02: Gestión de Clientes
                                - BC-03: Cuentas Bancarias
                                - BC-04: Préstamos y Créditos
                                - BC-05: Transferencias
                                - BC-06: Bitácora de Auditoría
                                
                                La lógica de negocio reside en stored procedures y triggers MySQL.
                                El backend actúa como orquestador y capa de seguridad.
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Equipo Banco DDD")
                                .email("dev@banco-ddd.com"))
                        .license(new License()
                                .name("Privado — Uso Académico")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .name(SECURITY_SCHEME_NAME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Ingresa el token JWT obtenido en /auth/login")));
    }
}
