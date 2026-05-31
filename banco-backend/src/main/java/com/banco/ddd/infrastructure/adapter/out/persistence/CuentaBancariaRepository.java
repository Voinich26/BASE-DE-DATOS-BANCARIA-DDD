package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.CuentaBancaria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio JPA para CuentaBancaria.
 * Solo consultas de lectura — las escrituras van por stored procedures.
 */
@Repository
public interface CuentaBancariaRepository extends JpaRepository<CuentaBancaria, String> {

    // ── Por titular ───────────────────────────────────────────────────────────

    List<CuentaBancaria> findByIdTitular(String idTitular);

    @Query("""
            SELECT c FROM CuentaBancaria c
            JOIN FETCH c.tipoCuenta
            JOIN FETCH c.moneda
            JOIN FETCH c.estadoCuenta
            WHERE c.idTitular = :idTitular
            """)
    Page<CuentaBancaria> findByIdTitularPaged(@Param("idTitular") String idTitular,
                                               Pageable pageable);

    @Query("""
            SELECT c FROM CuentaBancaria c
            WHERE c.idTitular = :idTitular
              AND c.tipoTitular = :tipoTitular
            """)
    Page<CuentaBancaria> findByTitular(@Param("idTitular") String idTitular,
                                       @Param("tipoTitular") CuentaBancaria.TipoTitular tipoTitular,
                                       Pageable pageable);

    // ── Por estado ────────────────────────────────────────────────────────────

    @Query("""
            SELECT c FROM CuentaBancaria c
            JOIN c.estadoCuenta e
            WHERE e.nombreEstado = :estado
            """)
    Page<CuentaBancaria> findByEstado(@Param("estado") String estado, Pageable pageable);

    @Query("""
            SELECT c FROM CuentaBancaria c
            JOIN c.estadoCuenta e
            WHERE c.idTitular = :idTitular
              AND e.nombreEstado = :estado
            """)
    List<CuentaBancaria> findByTitularAndEstado(@Param("idTitular") String idTitular,
                                                 @Param("estado") String estado);

    // ── Detalle con joins ─────────────────────────────────────────────────────

    @Query("""
            SELECT c FROM CuentaBancaria c
            JOIN FETCH c.tipoCuenta
            JOIN FETCH c.moneda
            JOIN FETCH c.estadoCuenta
            JOIN FETCH c.usuarioApertura
            WHERE c.numeroCuenta = :numeroCuenta
            """)
    java.util.Optional<CuentaBancaria> findByNumeroCuentaWithDetails(
            @Param("numeroCuenta") String numeroCuenta);

    // ── Conteos para dashboard ────────────────────────────────────────────────

    @Query("""
            SELECT COUNT(c) FROM CuentaBancaria c
            JOIN c.estadoCuenta e
            WHERE c.idTitular = :idTitular
              AND e.nombreEstado = :estado
            """)
    long countByTitularAndEstado(@Param("idTitular") String idTitular,
                                  @Param("estado") String estado);

    // ── Existencia ────────────────────────────────────────────────────────────

    boolean existsByNumeroCuenta(String numeroCuenta);
}
