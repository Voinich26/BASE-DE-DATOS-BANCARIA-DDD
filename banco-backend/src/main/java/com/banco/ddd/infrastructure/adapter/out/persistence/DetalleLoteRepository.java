package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.DetalleLoteTransferencia;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * BC-06: Repositorio JPA para DetalleLoteTransferencia.
 * Solo consultas de lectura — las escrituras van por stored procedures.
 */
@Repository
public interface DetalleLoteRepository extends JpaRepository<DetalleLoteTransferencia, Long> {

    // ── Por lote ──────────────────────────────────────────────────────────────

    @Query("""
            SELECT d FROM DetalleLoteTransferencia d
            JOIN FETCH d.estadoDetalle
            WHERE d.lote.idLote = :idLote
            ORDER BY d.orden ASC
            """)
    List<DetalleLoteTransferencia> findByIdLoteOrdenado(@Param("idLote") Long idLote);

    @Query("""
            SELECT d FROM DetalleLoteTransferencia d
            JOIN FETCH d.estadoDetalle
            WHERE d.lote.idLote = :idLote
            ORDER BY d.orden ASC
            """)
    Page<DetalleLoteTransferencia> findByIdLotePaged(@Param("idLote") Long idLote,
                                                      Pageable pageable);

    // ── Por estado dentro de un lote ──────────────────────────────────────────

    @Query("""
            SELECT d FROM DetalleLoteTransferencia d
            JOIN d.estadoDetalle e
            WHERE d.lote.idLote = :idLote
              AND e.nombreEstado = :estado
            """)
    List<DetalleLoteTransferencia> findByIdLoteAndEstado(@Param("idLote") Long idLote,
                                                          @Param("estado") String estado);

    // ── Verificar duplicados dentro del mismo lote ────────────────────────────

    @Query("""
            SELECT COUNT(d) FROM DetalleLoteTransferencia d
            WHERE d.lote.idLote = :idLote
              AND d.cuentaOrigen = :cuentaOrigen
              AND d.cuentaDestino = :cuentaDestino
            """)
    long countDuplicadosEnLote(@Param("idLote")       Long idLote,
                                @Param("cuentaOrigen") String cuentaOrigen,
                                @Param("cuentaDestino") String cuentaDestino);
}
