package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.CredencialUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio para credenciales (contraseñas BCrypt) de usuarios.
 */
@Repository
public interface CredencialUsuarioRepository extends JpaRepository<CredencialUsuario, Long> {

    @Query("SELECT c FROM CredencialUsuario c WHERE c.usuario.correoElectronico = :correo")
    Optional<CredencialUsuario> findByCorreo(@Param("correo") String correo);
}
