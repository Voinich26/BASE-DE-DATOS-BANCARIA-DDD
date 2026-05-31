package com.banco.ddd.application.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class UsuarioResponse {

    private Long          idUsuario;
    private String        idRelacionado;
    private String        nombreCompleto;
    private String        idIdentificacion;
    private String        correoElectronico;
    private String        telefono;
    private LocalDate     fechaNacimiento;
    private String        direccion;
    private String        rol;
    private String        estadoUsuario;
    private LocalDateTime fechaCreacion;
}
