package com.banco.ddd.application.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class BitacolaResponse {

    private String        idBitacora;
    private String        tipoOperacion;
    private LocalDateTime fechaHoraOperacion;
    private Long          idUsuario;
    private String        rolUsuario;
    private String        idProductoAfectado;
    private String        tipoProducto;
    private String        datosDetalle;
    private boolean       sincronizado;
}
