package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.Prestamo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio JPA para Prestamo.
 * Solo consultas de lectura — las escrituras van por stored procedures.
 */
@Repository
public interface PrestamoRepository extends JpaRepository<Prestamo, Long> {

    // ── Por cliente ───────────────────────────────────────────────────────────

    Page<Prestamo> findByIdClienteSolicitante(String idCliente, Pageable pageable);

    List<Prestamo> findByIdClienteSolicitante(String idCliente);

    // ── Por estado ────────────────────────────────────────────────────────────

    @Query("""
            SELECT p FROM Prestamo p
            JOIN FETCH p.estadoPrestamo e
            JOIN FETCH p.tipoPrestamo
            JOIN FETCH p.usuarioSolicitante
            WHERE e.nombreEstado = :estado
            """)
    Page<Prestamo> findByEstado(@Param("estado") String estado, Pageable pageable);

    @Query("""
            SELECT p FROM Prestamo p
            JOIN p.estadoPrestamo e
            WHERE e.nombreEstado IN :estados
            """)
    List<Prestamo> findByEstadoIn(@Param("estados") List<String> estados);

    // ── Por analista ──────────────────────────────────────────────────────────

    @Query("""
            SELECT p FROM Prestamo p
            WHERE p.analistaAprobador.idUsuario = :idAnalista
            """)
    Page<Prestamo> findByAnalista(@Param("idAnalista") Long idAnalista, Pageable pageable);

    // ── Historial con filtros ─────────────────────────────────────────────────

    @Query("""
            SELECT p FROM Prestamo p
            JOIN FETCH p.estadoPrestamo
            JOIN FETCH p.tipoPrestamo
            JOIN FETCH p.usuarioSolicitante
            WHERE (:estado IS NULL OR p.estadoPrestamo.nombreEstado = :estado)
              AND (:idCliente IS NULL OR p.idClienteSolicitante = :idCliente)
              AND (:tipoPrestamo IS NULL OR p.tipoPrestamo.nombreTipo = :tipoPrestamo)
            """)
    Page<Prestamo> findHistorial(
            @Param("estado")       String estado,
            @Param("idCliente")    String idCliente,
            @Param("tipoPrestamo") String tipoPrestamo,
            Pageable pageable);

    // ── Detalle con joins ─────────────────────────────────────────────────────

    @Query("""
            SELECT p FROM Prestamo p
            JOIN FETCH p.estadoPrestamo
            JOIN FETCH p.tipoPrestamo
            JOIN FETCH p.usuarioSolicitante
            LEFT JOIN FETCH p.analistaAprobador
            WHERE p.idPrestamo = :id
            """)
    Optional<Prestamo> findByIdWithDetails(@Param("id") Long id);

    // ── Métricas ──────────────────────────────────────────────────────────────

    @Query("""
            SELECT COUNT(p) FROM Prestamo p
            JOIN p.estadoPrestamo e
            WHERE e.nombreEstado = :estado
            """)
    long countByEstado(@Param("estado") String estado);

    @Query("""
            SELECT COALESCE(SUM(p.montoAprobado), 0) FROM Prestamo p
            JOIN p.estadoPrestamo e
            WHERE e.nombreEstado = :estado
            """)
    BigDecimal sumMontoAprobadoByEstado(@Param("estado") String estado);

    @Query("""
            SELECT COALESCE(SUM(p.montoSolicitado), 0) FROM Prestamo p
            """)
    BigDecimal sumMontoTotalSolicitado();

    @Query("""
            SELECT COALESCE(AVG(p.montoAprobado), 0) FROM Prestamo p
            JOIN p.estadoPrestamo e
            WHERE e.nombreEstado IN ('Aprobado','Desembolsado')
            """)
    BigDecimal avgMontoAprobado();

    @Query("""
            SELECT COALESCE(MAX(p.montoAprobado), 0) FROM Prestamo p
            JOIN p.estadoPrestamo e
            WHERE e.nombreEstado IN ('Aprobado','Desembolsado')
            """)
    BigDecimal maxMontoAprobado();

    @Query("""
            SELECT COALESCE(MIN(p.montoAprobado), 0) FROM Prestamo p
            JOIN p.estadoPrestamo e
            WHERE e.nombreEstado IN ('Aprobado','Desembolsado')
            """)
    BigDecimal minMontoAprobado();

    @Query("""
            SELECT p.tipoPrestamo.nombreTipo, COUNT(p)
            FROM Prestamo p
            GROUP BY p.tipoPrestamo.nombreTipo
            """)
    List<Object[]> countByTipoPrestamo();

    // ── Anti-duplicados ───────────────────────────────────────────────────────

    @Query("""
            SELECT COUNT(p) FROM Prestamo p
            JOIN p.estadoPrestamo e
            WHERE p.idClienteSolicitante = :idCliente
              AND p.tipoPrestamo.nombreTipo = :tipoPrestamo
              AND e.nombreEstado NOT IN ('Rechazado','Cancelado')
              AND p.fechaSolicitud >= :desde
            """)
    long countPosiblesDuplicados(
            @Param("idCliente")    String idCliente,
            @Param("tipoPrestamo") String tipoPrestamo,
            @Param("desde")        LocalDateTime desde);
}
