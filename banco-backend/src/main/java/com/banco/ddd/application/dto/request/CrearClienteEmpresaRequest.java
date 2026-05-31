package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Schema(description = "Datos para registrar una empresa cliente")
public class CrearClienteEmpresaRequest {

    @NotBlank
    @Size(max = 30)
    private String nit;

    @NotBlank
    @Size(max = 200)
    private String razonSocial;

    @NotBlank
    @Email
    @Size(max = 150)
    private String correoElectronico;

    @NotBlank
    @Size(min = 7, max = 15)
    private String telefono;

    @NotBlank
    @Size(max = 300)
    private String direccion;

    @NotBlank(message = "El representante legal es obligatorio (INV-07)")
    @Size(max = 30)
    private String idRepresentanteLegal;

    @NotNull
    private Long idUsuario;
}
