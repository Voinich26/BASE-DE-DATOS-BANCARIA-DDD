package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.IntentoLogin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * Repositorio para auditoría de intentos de login.
 */
@Repository
public interface IntentoLoginRepository extends JpaRepository<IntentoLogin, Long> {

    /**
     * Cuenta intentos fallidos recientes para un correo (ventana de tiempo).
     * Usado para brute-force protection.
     */
    @Query("""
            SELECT COUNT(i) FROM IntentoLogin i
            WHERE i.correoElectronico = :correo
              AND i.exitoso = false
              AND i.fechaIntento >= :desde
            """)
    long contarIntentosFallidos(@Param("correo") String correo,
                                 @Param("desde") LocalDateTime desde);

    /**
     * Cuenta intentos fallidos recientes por IP (protección adicional).
     */
    @Query("""
            SELECT COUNT(i) FROM IntentoLogin i
            WHERE i.ipOrigen = :ip
              AND i.exitoso = false
              AND i.fechaIntento >= :desde
            """)
    long contarIntentosFallidosPorIp(@Param("ip") String ip,
                                      @Param("desde") LocalDateTime desde);
}
