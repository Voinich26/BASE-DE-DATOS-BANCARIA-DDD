package com.banco.ddd.infrastructure.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Propiedades JWT leídas desde application.yml (prefijo: jwt).
 */
@Component
@ConfigurationProperties(prefix = "jwt")
@Getter @Setter
public class JwtProperties {

    private String secret;
    private long   expirationMs;
    private long   refreshExpirationMs;
    private String issuer;
}
