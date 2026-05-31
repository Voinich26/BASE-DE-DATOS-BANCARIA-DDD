package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.BitacolaCola;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BitacolaColaRepository extends JpaRepository<BitacolaCola, String> {

    Page<BitacolaCola> findByIdUsuario(Long idUsuario, Pageable pageable);

    Page<BitacolaCola> findByTipoOperacion(String tipoOperacion, Pageable pageable);

    Page<BitacolaCola> findByIdProductoAfectado(String idProducto, Pageable pageable);

    List<BitacolaCola> findBySincronizadoFalse();

    Page<BitacolaCola> findByFechaHoraOperacionBetween(LocalDateTime desde,
                                                        LocalDateTime hasta,
                                                        Pageable pageable);
}
