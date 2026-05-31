package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.ClientePersonaNatural;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClientePersonaNaturalRepository extends JpaRepository<ClientePersonaNatural, String> {

    Optional<ClientePersonaNatural> findByCorreoElectronico(String correo);

    Optional<ClientePersonaNatural> findByUsuarioIdUsuario(Long idUsuario);

    boolean existsByCorreoElectronico(String correo);

    Page<ClientePersonaNatural> findByNombreCompletoContainingIgnoreCase(String nombre, Pageable pageable);
}
