package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.Transferencia;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio JPA para Transferencia.
 * Solo consultas de lectura — las escrituras van por stored procedures / INSERT directo.
 */
@Repository
public interface TransferenciaRepository extends JpaRepository<Transferencia, Long> {

    // ── Por cuenta ────────────────────────────────────────────────────────────

    Page<Transferencia> findByCuentaOrigen(String cuentaOrigen, Pageable pageable);

    Page<Transferencia> findByCuentaDestino(String cuentaDestino, Pageable pageable);

    @Query("""
            SELECT t FROM Transferencia t
            JOIN FETCH t.estadoTransferencia
            JOIN FETCH t.usuarioCreador
            WHERE t.cuentaOrigen = :cuenta OR t.cuentaDestino = :cuenta
            """)
    Page<Transferencia> findByCuenta(@Param("cuenta") String cuenta, Pageable pageable);

    // ── Por estado ────────────────────────────────────────────────────────────

    @Query("""
            SELECT t FROM Transferencia t
            JOIN FETCH t.estadoTransferencia e
            WHERE e.nombreEstado = :estado
            """)
    Page<Transferencia> findByEstado(@Param("estado") String estado, Pageable pageable);

    @Query("""
            SELECT t FROM Transferencia t
            JOIN t.estadoTransferencia e
            WHERE e.nombreEstado IN :estados
            ORDER BY t.fechaCreacion DESC
            """)
    List<Transferencia> findByEstadoIn(@Param("estados") List<String> estados);

    // ── Pendientes de aprobación ──────────────────────────────────────────────

    @Query("""
            SELECT t FROM Transferencia t
            JOIN FETCH t.estadoTransferencia e
            JOIN FETCH t.usuarioCreador
            WHERE e.nombreEstado = 'En Espera de Aprobacion'
            ORDER BY t.fechaCreacion ASC
            """)
    Page<Transferencia> findPendientesAprobacion(Pageable pageable);

    // ── Detalle con joins ─────────────────────────────────────────────────────

    @Query("""
            SELECT t FROM Transferencia t
            JOIN FETCH t.estadoTransferencia
            JOIN FETCH t.usuarioCreador
            LEFT JOIN FETCH t.usuarioAprobador
            WHERE t.idTransferencia = :id
            """)
    Optional<Transferencia> findByIdWithDetails(@Param("id") Long id);

    // ── Por cuentas de un titular (para dashboard) ────────────────────────────

    @Query("""
            SELECT t FROM Transferencia t
            JOIN FETCH t.estadoTransferencia
            WHERE t.cuentaOrigen IN :cuentas OR t.cuentaDestino IN :cuentas
            ORDER BY t.fechaCreacion DESC
            """)
    Page<Transferencia> findByCuentasIn(@Param("cuentas") List<String> cuentas, Pageable pageable);

    // ── Métricas ──────────────────────────────────────────────────────────────

    @Query("""
            SELECT COUNT(t) FROM Transferencia t
            JOIN t.estadoTransferencia e
            WHERE e.nombreEstado = :estado
            """)
    long countByEstado(@Param("estado") String estado);

    @Query("""
            SELECT COALESCE(SUM(t.monto), 0) FROM Transferencia t
            JOIN t.estadoTransferencia e
            WHERE e.nombreEstado = :estado
            """)
    BigDecimal sumMontoByEstado(@Param("estado") String estado);

    @Query("""
            SELECT COALESCE(AVG(t.monto), 0) FROM Transferencia t
            JOIN t.estadoTransferencia e
            WHERE e.nombreEstado = 'Ejecutada'
            """)
    BigDecimal avgMontoEjecutadas();

    @Query("""
            SELECT COALESCE(MAX(t.monto), 0) FROM Transferencia t
            JOIN t.estadoTransferencia e
            WHERE e.nombreEstado = 'Ejecutada'
            """)
    BigDecimal maxMontoEjecutadas();

    @Query("""
            SELECT COALESCE(MIN(t.monto), 0) FROM Transferencia t
            JOIN t.estadoTransferencia e
            WHERE e.nombreEstado = 'Ejecutada'
            """)
    BigDecimal minMontoEjecutadas();

    // ── Historial paginado con filtros ────────────────────────────────────────

    @Query("""
            SELECT t FROM Transferencia t
            JOIN FETCH t.estadoTransferencia
            JOIN FETCH t.usuarioCreador
            WHERE (:estado IS NULL OR t.estadoTransferencia.nombreEstado = :estado)
              AND (:cuentaOrigen IS NULL OR t.cuentaOrigen = :cuentaOrigen)
              AND (:cuentaDestino IS NULL OR t.cuentaDestino = :cuentaDestino)
            """)
    Page<Transferencia> findHistorial(
            @Param("estado")        String estado,
            @Param("cuentaOrigen")  String cuentaOrigen,
            @Param("cuentaDestino") String cuentaDestino,
            Pageable pageable);

    // ── Agregaciones para resumen de cuenta ──────────────────────────────────

    @Query("""
            SELECT COUNT(t) FROM Transferencia t
            WHERE t.cuentaOrigen = :cuenta
            """)
    long countByCuentaOrigen(@Param("cuenta") String cuenta);

    @Query("""
            SELECT COUNT(t) FROM Transferencia t
            WHERE t.cuentaDestino = :cuenta
            """)
    long countByCuentaDestino(@Param("cuenta") String cuenta);

    @Query("""
            SELECT COALESCE(SUM(t.monto), 0) FROM Transferencia t
            JOIN t.estadoTransferencia e
            WHERE t.cuentaOrigen = :cuenta
              AND e.nombreEstado = 'Ejecutada'
            """)
    BigDecimal sumMontoEnviadoByCuenta(@Param("cuenta") String cuenta);

    @Query("""
            SELECT COALESCE(SUM(t.monto), 0) FROM Transferencia t
            JOIN t.estadoTransferencia e
            WHERE t.cuentaDestino = :cuenta
              AND e.nombreEstado = 'Ejecutada'
            """)
    BigDecimal sumMontoRecibidoByCuenta(@Param("cuenta") String cuenta);

    /**
     * Detecta posibles duplicados: misma cuenta origen/destino, mismo monto,
     * creados en los últimos 60 segundos por el mismo usuario.
     */
    @Query("""
            SELECT COUNT(t) FROM Transferencia t
            WHERE t.cuentaOrigen = :origen
              AND t.cuentaDestino = :destino
              AND t.monto = :monto
              AND t.usuarioCreador.idUsuario = :idUsuario
              AND t.fechaCreacion >= :desde
            """)
    long countPosiblesDuplicados(
            @Param("origen")    String origen,
            @Param("destino")   String destino,
            @Param("monto")     BigDecimal monto,
            @Param("idUsuario") Long idUsuario,
            @Param("desde")     java.time.LocalDateTime desde);
}
