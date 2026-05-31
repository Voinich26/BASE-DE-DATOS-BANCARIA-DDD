package com.banco.ddd.application.port.in;

import com.banco.ddd.application.dto.request.CrearCuentaRequest;
import com.banco.ddd.application.dto.request.OperacionCajaRequest;
import com.banco.ddd.application.dto.response.CuentaBancariaResponse;
import com.banco.ddd.application.dto.response.CuentaDetalleResponse;
import com.banco.ddd.application.dto.response.CuentaResumenResponse;
import com.banco.ddd.application.dto.response.DashboardFinancieroResponse;
import com.banco.ddd.shared.response.PagedResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

/**
 * Puerto de entrada (driving port) — BC-03: Cuentas Bancarias.
 *
 * <p>Define el contrato completo del caso de uso de gestión de cuentas,
 * incluyendo operaciones de caja, consultas enriquecidas y dashboard.</p>
 *
 * <p>Implementado por {@code CuentaService} en la capa de aplicación.</p>
 */
public interface CuentaUseCase {

    // ── Consultas ─────────────────────────────────────────────────────────────

    /**
     * Lista todas las cuentas con paginación (solo roles administrativos).
     */
    PagedResponse<CuentaBancariaResponse> listarCuentas(Pageable pageable);

    /**
     * Obtiene una cuenta por número. Valida ownership si el caller es cliente.
     *
     * @param numeroCuenta número de cuenta
     * @param caller       usuario autenticado (para validación de ownership)
     */
    CuentaBancariaResponse obtenerCuenta(String numeroCuenta, UserDetails caller);

    /**
     * Obtiene el detalle completo de una cuenta con información del titular.
     *
     * @param numeroCuenta número de cuenta
     * @param caller       usuario autenticado
     */
    CuentaDetalleResponse obtenerDetalle(String numeroCuenta, UserDetails caller);

    /**
     * Lista las cuentas de un titular específico.
     *
     * @param idTitular identificación del titular (cédula o NIT)
     * @param pageable  parámetros de paginación
     * @param caller    usuario autenticado (para validación de ownership)
     */
    PagedResponse<CuentaBancariaResponse> cuentasPorTitular(String idTitular,
                                                             Pageable pageable,
                                                             UserDetails caller);

    /**
     * Obtiene el resumen de movimientos de una cuenta (últimas transferencias + métricas).
     *
     * @param numeroCuenta número de cuenta
     * @param caller       usuario autenticado
     */
    CuentaResumenResponse obtenerResumen(String numeroCuenta, UserDetails caller);

    /**
     * Dashboard financiero del cliente autenticado.
     * Consolida todas sus cuentas, saldos y actividad reciente.
     *
     * @param caller usuario autenticado
     */
    DashboardFinancieroResponse obtenerDashboard(UserDetails caller);

    // ── Comandos ──────────────────────────────────────────────────────────────

    /**
     * Abre una nueva cuenta bancaria vía {@code sp_crear_cuenta}.
     */
    CuentaBancariaResponse crearCuenta(CrearCuentaRequest request);

    /**
     * Cancela/cierra una cuenta. El SP valida que el saldo sea cero.
     *
     * @param numeroCuenta número de cuenta a cancelar
     * @param idUsuario    ID del empleado que ejecuta la operación
     */
    void cancelarCuenta(String numeroCuenta, Long idUsuario);

    /**
     * Bloquea una cuenta bancaria vía {@code sp_bloquear_cuenta}.
     *
     * @param numeroCuenta número de cuenta
     * @param idUsuario    ID del supervisor/analista
     * @param motivo       motivo del bloqueo (requerido)
     */
    void bloquearCuenta(String numeroCuenta, Long idUsuario, String motivo);

    /**
     * Reactiva una cuenta bloqueada vía {@code sp_reactivar_cuenta}.
     */
    void reactivarCuenta(String numeroCuenta, Long idUsuario);

    /**
     * Depósito de caja vía {@code sp_depositar}.
     * Solo empleados de ventanilla.
     */
    void depositar(OperacionCajaRequest request);

    /**
     * Retiro de caja vía {@code sp_retirar}.
     * Solo empleados de ventanilla. El SP valida saldo suficiente.
     */
    void retirar(OperacionCajaRequest request);
}
