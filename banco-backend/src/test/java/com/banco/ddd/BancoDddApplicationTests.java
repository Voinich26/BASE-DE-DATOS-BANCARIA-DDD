package com.banco.ddd;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Smoke test: verifica que el contexto de Spring arranca correctamente.
 * Requiere una base de datos MySQL accesible (usar perfil test con H2 o Testcontainers).
 */
@SpringBootTest
@ActiveProfiles("test")
class BancoDddApplicationTests {

    @Test
    void contextLoads() {
        // Si el contexto arranca sin excepciones, el test pasa.
    }
}
