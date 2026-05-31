package com.banco.ddd.application.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class ClientePersonaResponse {

    private String        idIdentificacion;
    private String        tipoIdentificacion;
    private String        nombreCompleto;
    private String        correoElectronico;
    private String        telefono;
    private LocalDate     fechaNacimiento;
    private String        direccion;
    private Long          idUsuario;
    private LocalDateTime fechaRegistro;
}
