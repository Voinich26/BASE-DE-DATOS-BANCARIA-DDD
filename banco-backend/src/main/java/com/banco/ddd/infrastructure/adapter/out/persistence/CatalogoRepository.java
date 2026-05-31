package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.domain.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorios de catálogos (tablas de referencia inmutables).
 */
public class CatalogoRepository {

    @Repository
    public interface RolRepository extends JpaRepository<CatRol, Integer> {
        Optional<CatRol> findByNombreRol(String nombreRol);
    }

    @Repository
    public interface EstadoUsuarioRepository extends JpaRepository<CatEstadoUsuario, Integer> {
        Optional<CatEstadoUsuario> findByNombreEstado(String nombreEstado);
    }

    @Repository
    public interface TipoCuentaRepository extends JpaRepository<CatTipoCuenta, Integer> {
        Optional<CatTipoCuenta> findByNombreTipo(String nombreTipo);
    }

    @Repository
    public interface MonedaRepository extends JpaRepository<CatMoneda, Integer> {
        Optional<CatMoneda> findByCodigoIso(String codigoIso);
    }

    @Repository
    public interface EstadoCuentaRepository extends JpaRepository<CatEstadoCuenta, Integer> {
        Optional<CatEstadoCuenta> findByNombreEstado(String nombreEstado);
    }

    @Repository
    public interface TipoPrestamoRepository extends JpaRepository<CatTipoPrestamo, Integer> {
        Optional<CatTipoPrestamo> findByNombreTipo(String nombreTipo);
    }

    @Repository
    public interface EstadoPrestamoRepository extends JpaRepository<CatEstadoPrestamo, Integer> {
        Optional<CatEstadoPrestamo> findByNombreEstado(String nombreEstado);
    }

    @Repository
    public interface EstadoTransferenciaRepository extends JpaRepository<CatEstadoTransferencia, Integer> {
        Optional<CatEstadoTransferencia> findByNombreEstado(String nombreEstado);
    }
}
