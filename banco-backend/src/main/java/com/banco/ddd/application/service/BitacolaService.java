package com.banco.ddd.application.service;

import com.banco.ddd.application.dto.response.BitacolaResponse;
import com.banco.ddd.domain.model.BitacolaCola;
import com.banco.ddd.infrastructure.adapter.out.persistence.BitacolaColaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Caso de uso: Consulta de bitácora de auditoría (BC-06).
 * Solo lectura — la escritura la hacen los triggers y SPs de la BD.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BitacolaService {

    private final BitacolaColaRepository bitacolaRepo;

    @Transactional(readOnly = true)
    public Page<BitacolaResponse> listarBitacola(Pageable pageable) {
        return bitacolaRepo.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<BitacolaResponse> bitacolaPorUsuario(Long idUsuario, Pageable pageable) {
        return bitacolaRepo.findByIdUsuario(idUsuario, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<BitacolaResponse> bitacolaPorTipoOperacion(String tipoOperacion, Pageable pageable) {
        return bitacolaRepo.findByTipoOperacion(tipoOperacion, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<BitacolaResponse> bitacolaPorProducto(String idProducto, Pageable pageable) {
        return bitacolaRepo.findByIdProductoAfectado(idProducto, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<BitacolaResponse> bitacolaPorRango(LocalDateTime desde,
                                                    LocalDateTime hasta,
                                                    Pageable pageable) {
        return bitacolaRepo.findByFechaHoraOperacionBetween(desde, hasta, pageable)
                .map(this::toResponse);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private BitacolaResponse toResponse(BitacolaCola b) {
        return BitacolaResponse.builder()
                .idBitacora(b.getIdBitacora())
                .tipoOperacion(b.getTipoOperacion())
                .fechaHoraOperacion(b.getFechaHoraOperacion())
                .idUsuario(b.getIdUsuario())
                .rolUsuario(b.getRolUsuario())
                .idProductoAfectado(b.getIdProductoAfectado())
                .tipoProducto(b.getTipoProducto())
                .datosDetalle(b.getDatosDetalle())
                .sincronizado(b.isSincronizado())
                .build();
    }
}
