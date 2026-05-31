package com.banco.ddd.application.port.out;

/**
 * Puerto de salida — ejecución de stored procedures MySQL.
 * Abstrae el JdbcTemplate para que la capa de aplicación no dependa
 * directamente de la infraestructura de base de datos.
 */
public interface StoredProcedurePort {

    /**
     * Ejecuta un stored procedure sin valor de retorno.
     *
     * @param procedureName nombre del SP (ej: "sp_ejecutar_transferencia")
     * @param params        parámetros IN en orden
     */
    void execute(String procedureName, Object... params);

    /**
     * Ejecuta un stored procedure con un parámetro OUT de tipo Long.
     * Usa variables de sesión MySQL (@p_out) para recuperar el valor.
     *
     * @param procedureName nombre del SP
     * @param outParamName  nombre de la variable de sesión (sin @)
     * @param params        parámetros IN en orden
     * @return valor del parámetro OUT
     */
    Long executeWithLongOut(String procedureName, String outParamName, Object... params);
}
