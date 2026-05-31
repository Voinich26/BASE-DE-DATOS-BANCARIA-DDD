package com.banco.ddd.application.port.in;

import com.banco.ddd.application.dto.request.CrearUsuarioRequest;
import com.banco.ddd.application.dto.response.UsuarioResponse;
import com.banco.ddd.shared.response.PagedResponse;
import org.springframework.data.domain.Pageable;

/**
 * Puerto de entrada (driving port) — BC-01: Gestión de Usuarios.
 * Define el contrato que el adaptador web invoca.
 */
public interface UsuarioUseCase {

    PagedResponse<UsuarioResponse> listarUsuarios(Pageable pageable);

    UsuarioResponse obtenerPorId(Long id);

    UsuarioResponse obtenerPorCorreo(String correo);

    UsuarioResponse crearUsuario(CrearUsuarioRequest request);

    void cambiarEstado(Long idUsuario, String nuevoEstado, String motivo);

    void asignarRol(Long idUsuario, String nombreRol);
}
