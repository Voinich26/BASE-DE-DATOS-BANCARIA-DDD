package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter @Setter
@Schema(description = "Datos para registrar un cliente persona natural")
public class CrearClientePersonaRequest {

    @NotBlank
    @Size(max = 30)
    private String idIdentificacion;

    @NotBlank
    @Size(max = 20)
    private String tipoIdentificacion;

    @NotBlank
    @Size(max = 200)
    private String nombreCompleto;

    @NotBlank
    @Email
    @Size(max = 150)
    private String correoElectronico;

    @NotBlank
    @Size(min = 7, max = 15)
    private String telefono;

    @NotNull(message = "La fecha de nacimiento es obligatoria")
    private LocalDate fechaNacimiento;

    @NotBlank
    @Size(max = 300)
    private String direccion;

    @NotNull(message = "El id de usuario es obligatorio")
    private Long idUsuario;
}
