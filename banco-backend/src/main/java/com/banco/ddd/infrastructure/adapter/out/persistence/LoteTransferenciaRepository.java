package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.LoteTransferencia;
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
 * BC-06: Repositorio JPA para LoteTransferencia.
 * Solo consultas de lectura — las escrituras van por stored procedures.
 */
@Repository
public interface LoteTransferenciaRepository extends JpaRepository<LoteTransferencia, Long> {

    // ── Por empresa ───────────────────────────────────────────────────────────

    Page<LoteTransferencia> findByNitEmpresa(String nitEmpresa, Pageable pageable);

    List<LoteTransferencia> findByNitEmpresa(String nitEmpresa);

    // ── Historial con filtros ─────────────────────────────────────────────────

    @Query("""
            SELECT l FROM LoteTransferencia l
            JOIN FETCH l.estadoLote
            JOIN FETCH l.usuarioCreador
            WHERE (:estado IS NULL OR l.estadoLote.nombreEstado = :estado)
              AND (:nitEmpresa IS NULL OR l.nitEmpresa = :nitEmpresa)
            """)
    Page<LoteTransferencia> findHistorial(
            @Param("estado")     String estado,
            @Param("nitEmpresa") String nitEmpresa,
            Pageable pageable);

    // ── Detalle con joins ─────────────────────────────────────────────────────

    @Query("""
            SELECT l FROM LoteTransferencia l
            JOIN FETCH l.estadoLote
            JOIN FETCH l.usuarioCreador
            LEFT JOIN FETCH l.usuarioSupervisor
            WHERE l.idLote = :idLote
            """)
    Optional<LoteTransferencia> findByIdWithDetails(@Param("idLote") Long idLote);

    // ── Por estado ────────────────────────────────────────────────────────────

    @Query("""
            SELECT l FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE e.nombreEstado = :estado
            """)
    List<LoteTransferencia> findByEstado(@Param("estado") String estado);

    @Query("""
            SELECT COUNT(l) FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE e.nombreEstado = :estado
            """)
    long countByEstado(@Param("estado") String estado);

    @Query("""
            SELECT COUNT(l) FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE l.nitEmpresa = :nitEmpresa
              AND e.nombreEstado = :estado
            """)
    long countByNitEmpresaAndEstado(@Param("nitEmpresa") String nitEmpresa,
                                     @Param("estado") String estado);

    // ── Métricas monetarias ───────────────────────────────────────────────────

    @Query("""
            SELECT COALESCE(SUM(l.montoTotal), 0) FROM LoteTransferencia l
            """)
    BigDecimal sumMontoTotal();

    @Query("""
            SELECT COALESCE(SUM(l.montoProcesado), 0) FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE e.nombreEstado = 'Procesado'
            """)
    BigDecimal sumMontoProcesado();

    @Query("""
            SELECT COALESCE(AVG(l.montoTotal), 0) FROM LoteTransferencia l
            """)
    BigDecimal avgMontoTotal();

    @Query("""
            SELECT COALESCE(MAX(l.montoTotal), 0) FROM LoteTransferencia l
            """)
    BigDecimal maxMontoTotal();

    @Query("""
            SELECT COALESCE(MIN(l.montoTotal), 0) FROM LoteTransferencia l
            """)
    BigDecimal minMontoTotal();

    // ── Métricas de ítems ─────────────────────────────────────────────────────

    @Query("""
            SELECT COALESCE(SUM(l.itemsExitosos), 0) FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE e.nombreEstado = 'Procesado'
            """)
    long sumItemsExitosos();

    @Query("""
            SELECT COALESCE(SUM(l.itemsFallidos), 0) FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE e.nombreEstado = 'Procesado'
            """)
    long sumItemsFallidos();

    // ── Dashboard empresa ─────────────────────────────────────────────────────

    @Query("""
            SELECT COALESCE(SUM(l.montoTotal), 0) FROM LoteTransferencia l
            WHERE l.nitEmpresa = :nitEmpresa
            """)
    BigDecimal sumMontoTotalByEmpresa(@Param("nitEmpresa") String nitEmpresa);

    @Query("""
            SELECT COALESCE(SUM(l.montoProcesado), 0) FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE l.nitEmpresa = :nitEmpresa
              AND e.nombreEstado = 'Procesado'
            """)
    BigDecimal sumMontoProcesadoByEmpresa(@Param("nitEmpresa") String nitEmpresa);

    @Query("""
            SELECT COALESCE(SUM(l.montoTotal), 0) FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE l.nitEmpresa = :nitEmpresa
              AND e.nombreEstado = 'Aprobado'
            """)
    BigDecimal sumMontoPendienteByEmpresa(@Param("nitEmpresa") String nitEmpresa);

    @Query("""
            SELECT COALESCE(SUM(l.itemsExitosos), 0) FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE l.nitEmpresa = :nitEmpresa
              AND e.nombreEstado = 'Procesado'
            """)
    long sumItemsExitososByEmpresa(@Param("nitEmpresa") String nitEmpresa);

    @Query("""
            SELECT COALESCE(SUM(l.itemsFallidos), 0) FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE l.nitEmpresa = :nitEmpresa
              AND e.nombreEstado = 'Procesado'
            """)
    long sumItemsFallidosByEmpresa(@Param("nitEmpresa") String nitEmpresa);

    // ── Últimos lotes de empresa ──────────────────────────────────────────────

    @Query("""
            SELECT l FROM LoteTransferencia l
            JOIN FETCH l.estadoLote
            JOIN FETCH l.usuarioCreador
            WHERE l.nitEmpresa = :nitEmpresa
            ORDER BY l.fechaCreacion DESC
            """)
    List<LoteTransferencia> findTop5ByNitEmpresa(@Param("nitEmpresa") String nitEmpresa,
                                                   Pageable pageable);

    // ── Anti-duplicados ───────────────────────────────────────────────────────

    @Query("""
            SELECT COUNT(l) FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE l.nitEmpresa = :nitEmpresa
              AND l.concepto = :concepto
              AND e.nombreEstado NOT IN ('Rechazado', 'Cancelado')
              AND l.fechaCreacion >= :desde
            """)
    long countPosiblesDuplicados(@Param("nitEmpresa") String nitEmpresa,
                                  @Param("concepto")   String concepto,
                                  @Param("desde")      LocalDateTime desde);

    // ── Top empresas por volumen ──────────────────────────────────────────────

    @Query("""
            SELECT l.nitEmpresa, COALESCE(SUM(l.montoProcesado), 0) AS total
            FROM LoteTransferencia l
            JOIN l.estadoLote e
            WHERE e.nombreEstado = 'Procesado'
            GROUP BY l.nitEmpresa
            ORDER BY COALESCE(SUM(l.montoProcesado), 0) DESC
            """)
    List<Object[]> findTopEmpresasPorVolumen(Pageable pageable);
}
