package com.banco.ddd.application.port.in;

import com.banco.ddd.application.dto.response.BitacolaResponse;
import com.banco.ddd.shared.response.PagedResponse;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

/**
 * Puerto de entrada — BC-06: Bitácora de Auditoría.
 */
public interface BitacolaUseCase {

    PagedResponse<BitacolaResponse> listarBitacola(Pageable pageable);

    PagedResponse<BitacolaResponse> bitacolaPorUsuario(Long idUsuario, Pageable pageable);

    PagedResponse<BitacolaResponse> bitacolaPorTipoOperacion(String tipoOperacion, Pageable pageable);

    PagedResponse<BitacolaResponse> bitacolaPorProducto(String idProducto, Pageable pageable);

    PagedResponse<BitacolaResponse> bitacolaPorRango(LocalDateTime desde, LocalDateTime hasta, Pageable pageable);
}
