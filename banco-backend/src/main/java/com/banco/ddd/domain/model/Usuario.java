package com.banco.ddd.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * BC-01: Aggregate Root — Usuario del sistema.
 * Implementa UserDetails para integración con Spring Security.
 */
@Entity
@Table(name = "usuario")
@Getter @Setter @NoArgsConstructor
public class Usuario implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long idUsuario;

    @Column(name = "id_relacionado", length = 30)
    private String idRelacionado;

    @Column(name = "nombre_completo", nullable = false, length = 200)
    private String nombreCompleto;

    @Column(name = "id_identificacion", nullable = false, unique = true, length = 30)
    private String idIdentificacion;

    @Column(name = "correo_electronico", nullable = false, unique = true, length = 150)
    private String correoElectronico;

    @Column(name = "telefono", nullable = false, length = 15)
    private String telefono;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(name = "direccion", length = 300)
    private String direccion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_rol", nullable = false)
    private CatRol rol;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_estado_usuario", nullable = false)
    private CatEstadoUsuario estadoUsuario;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_modificacion")
    private LocalDateTime fechaModificacion;

    // ── Spring Security ──────────────────────────────────────────────────────

    /**
     * La contraseña NO se almacena en la tabla usuario (la BD usa roles de DB).
     * Para autenticación JWT usamos correo + contraseña gestionada externamente.
     * Este campo se mapea a una columna virtual o se gestiona en tabla separada.
     * Por simplicidad de integración, se usa un campo transitorio.
     */
    @Transient
    private String password;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + rol.getNombreRol()
                .toUpperCase().replace(" ", "_")));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return correoElectronico;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !"Bloqueado".equals(estadoUsuario.getNombreEstado());
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return "Activo".equals(estadoUsuario.getNombreEstado());
    }
}
