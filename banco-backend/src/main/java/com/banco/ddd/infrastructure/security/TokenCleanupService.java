package com.banco.ddd.infrastructure.security;

import com.banco.ddd.infrastructure.adapter.out.persistence.TokenRevocadoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Servicio de limpieza periódica de tokens JWT expirados en la blacklist.
 *
 * <p>Los tokens revocados se mantienen en la tabla {@code token_revocado}
 * hasta que expiran naturalmente. Una vez expirados, ya no pueden ser
 * usados de todas formas, por lo que se pueden eliminar de la blacklist
 * para mantener la tabla compacta.</p>
 *
 * <p>Ejecuta cada hora. En producción, ajustar según el volumen de tokens.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenCleanupService {

    private final TokenRevocadoRepository tokenRevocadoRepository;

    /**
     * Elimina tokens revocados cuya fecha de expiración ya pasó.
     * Se ejecuta cada hora (cron: 0 0 * * * *).
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void limpiarTokensExpirados() {
        LocalDateTime ahora = LocalDateTime.now();
        try {
            int eliminados = tokenRevocadoRepository.eliminarExpirados(ahora);
            if (eliminados > 0) {
                log.info("Limpieza de blacklist JWT: {} tokens expirados eliminados", eliminados);
            } else {
                log.debug("Limpieza de blacklist JWT: sin tokens expirados");
            }
        } catch (Exception e) {
            log.error("Error en limpieza de tokens expirados: {}", e.getMessage(), e);
        }
    }
}
