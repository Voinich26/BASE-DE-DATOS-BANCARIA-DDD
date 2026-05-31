package com.banco.ddd.application.port.out;

import com.banco.ddd.domain.model.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

/**
 * Puerto de salida (driven port) — persistencia de Usuario.
 * La implementación vive en infrastructure/adapter/out/persistence.
 */
public interface UsuarioRepositoryPort {

    Page<Usuario> findAll(Pageable pageable);

    Optional<Usuario> findById(Long id);

    Optional<Usuario> findByCorreo(String correo);

    Optional<Usuario> findByIdentificacion(String identificacion);

    boolean existsByCorreo(String correo);

    boolean existsByIdentificacion(String identificacion);
}
