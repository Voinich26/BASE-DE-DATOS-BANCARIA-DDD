package com.banco.ddd.application.port.out;

import com.banco.ddd.domain.model.CuentaBancaria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

/**
 * Puerto de salida — persistencia de CuentaBancaria.
 */
public interface CuentaRepositoryPort {

    Page<CuentaBancaria> findAll(Pageable pageable);

    Optional<CuentaBancaria> findByNumeroCuenta(String numeroCuenta);

    List<CuentaBancaria> findByTitular(String idTitular);
}
