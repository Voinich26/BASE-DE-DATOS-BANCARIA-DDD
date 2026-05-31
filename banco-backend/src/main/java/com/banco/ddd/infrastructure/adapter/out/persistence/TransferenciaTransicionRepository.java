package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.TransferenciaTransicionEstado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio para el historial de transiciones de estado de transferencias.
 */
@Repository
public interface TransferenciaTransicionRepository
        extends JpaRepository<TransferenciaTransicionEstado, Long> {

    /**
     * Obtiene todas las transiciones de una transferencia ordenadas cronológicamente.
     */
    @Query("""
            SELECT t FROM TransferenciaTransicionEstado t
            LEFT JOIN FETCH t.estadoAnterior
            JOIN FETCH t.estadoNuevo
            LEFT JOIN FETCH t.usuario
            WHERE t.idTransferencia = :idTransferencia
            ORDER BY t.fechaTransicion ASC
            """)
    List<TransferenciaTransicionEstado> findByIdTransferenciaOrdenado(
            @Param("idTransferencia") Long idTransferencia);
}
