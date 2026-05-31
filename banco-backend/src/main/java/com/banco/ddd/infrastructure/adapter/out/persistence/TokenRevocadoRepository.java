package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.TokenRevocado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * Repositorio para la blacklist de tokens JWT revocados.
 */
@Repository
public interface TokenRevocadoRepository extends JpaRepository<TokenRevocado, Long> {

    boolean existsByJti(String jti);

    /** Limpieza periódica de tokens ya expirados (no necesitan seguir en blacklist). */
    @Modifying
    @Query("DELETE FROM TokenRevocado t WHERE t.fechaExpiracion < :ahora")
    int eliminarExpirados(@Param("ahora") LocalDateTime ahora);

    /**
     * Cuenta tokens revocados de un usuario (para auditoría).
     * El logout global se implementa a nivel de aplicación invalidando el JTI
     * de cada token activo conocido. Este método es auxiliar.
     */
    @Query("SELECT COUNT(t) FROM TokenRevocado t WHERE t.idUsuario = :idUsuario")
    int contarPorUsuario(@Param("idUsuario") Long idUsuario);

    /**
     * Elimina tokens ya expirados de un usuario específico (limpieza).
     * No confundir con revocar — los tokens activos se revocan individualmente
     * añadiendo su JTI a la blacklist mediante {@code save()}.
     */
    @Modifying
    @Query("DELETE FROM TokenRevocado t WHERE t.idUsuario = :idUsuario AND t.fechaExpiracion < CURRENT_TIMESTAMP")
    int limpiarExpiradosPorUsuario(@Param("idUsuario") Long idUsuario);

    /**
     * Alias de compatibilidad — retorna 0 (los tokens activos no están en la blacklist;
     * se invalidan individualmente en logout/changePassword).
     * Mantenido para no romper llamadas existentes.
     */
    default int revocarPorUsuario(Long idUsuario) {
        return 0;
    }
}
