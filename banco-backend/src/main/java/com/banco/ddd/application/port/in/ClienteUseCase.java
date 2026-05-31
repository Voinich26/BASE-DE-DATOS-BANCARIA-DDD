package com.banco.ddd.application.port.in;

import com.banco.ddd.application.dto.request.CrearClienteEmpresaRequest;
import com.banco.ddd.application.dto.request.CrearClientePersonaRequest;
import com.banco.ddd.application.dto.response.ClienteEmpresaResponse;
import com.banco.ddd.application.dto.response.ClientePersonaResponse;
import com.banco.ddd.shared.response.PagedResponse;
import org.springframework.data.domain.Pageable;

/**
 * Puerto de entrada — BC-02: Gestión de Clientes.
 */
public interface ClienteUseCase {

    PagedResponse<ClientePersonaResponse> listarPersonas(Pageable pageable);

    ClientePersonaResponse obtenerPersona(String idIdentificacion);

    ClientePersonaResponse crearPersona(CrearClientePersonaRequest request);

    ClientePersonaResponse actualizarPersona(String id, String correo, String telefono, String direccion);

    PagedResponse<ClienteEmpresaResponse> listarEmpresas(Pageable pageable);

    ClienteEmpresaResponse obtenerEmpresa(String nit);

    ClienteEmpresaResponse crearEmpresa(CrearClienteEmpresaRequest request);

    ClienteEmpresaResponse actualizarEmpresa(String nit, String correo, String telefono, String direccion);

    void bloquearCliente(String idIdentificacion, String tipoCliente, String motivo);
}
