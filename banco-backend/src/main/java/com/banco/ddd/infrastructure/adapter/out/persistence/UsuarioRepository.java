package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio JPA para la entidad Usuario.
 * Solo consultas de lectura — las escrituras van por stored procedures.
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByCorreoElectronico(String correoElectronico);

    Optional<Usuario> findByIdIdentificacion(String idIdentificacion);

    boolean existsByCorreoElectronico(String correoElectronico);

    boolean existsByIdIdentificacion(String idIdentificacion);

    @Query("SELECT u FROM Usuario u JOIN FETCH u.rol JOIN FETCH u.estadoUsuario WHERE u.correoElectronico = :correo")
    Optional<Usuario> findByCorreoWithRol(@Param("correo") String correo);
}
