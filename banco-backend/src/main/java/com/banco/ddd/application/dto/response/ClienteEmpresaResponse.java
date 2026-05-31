package com.banco.ddd.application.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ClienteEmpresaResponse {

    private String        nit;
    private String        razonSocial;
    private String        correoElectronico;
    private String        telefono;
    private String        direccion;
    private String        idRepresentanteLegal;
    private String        nombreRepresentanteLegal;
    private Long          idUsuario;
    private LocalDateTime fechaRegistro;
}
