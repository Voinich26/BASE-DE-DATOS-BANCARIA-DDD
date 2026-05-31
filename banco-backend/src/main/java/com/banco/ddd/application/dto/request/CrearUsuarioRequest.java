package com.banco.ddd.application.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter @Setter
@Schema(description = "Datos para crear un nuevo usuario del sistema")
public class CrearUsuarioRequest {

    @NotBlank(message = "El nombre completo es obligatorio")
    @Size(max = 200)
    private String nombreCompleto;

    @NotBlank(message = "La identificación es obligatoria")
    @Size(max = 30)
    private String idIdentificacion;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Formato de correo inválido")
    @Size(max = 150)
    private String correoElectronico;

    @NotBlank(message = "El teléfono es obligatorio")
    @Size(min = 7, max = 15, message = "El teléfono debe tener entre 7 y 15 caracteres")
    private String telefono;

    private LocalDate fechaNacimiento;

    @Size(max = 300)
    private String direccion;

    @NotBlank(message = "El rol es obligatorio")
    private String nombreRol;

    private String idRelacionado;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    private String password;
}
