package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.ClienteEmpresa;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClienteEmpresaRepository extends JpaRepository<ClienteEmpresa, String> {

    Optional<ClienteEmpresa> findByCorreoElectronico(String correo);

    Optional<ClienteEmpresa> findByUsuarioIdUsuario(Long idUsuario);

    Page<ClienteEmpresa> findByRazonSocialContainingIgnoreCase(String razonSocial, Pageable pageable);
}
