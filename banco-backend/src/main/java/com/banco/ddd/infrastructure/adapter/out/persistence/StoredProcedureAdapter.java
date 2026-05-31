package com.banco.ddd.infrastructure.adapter.out.persistence;

import com.banco.ddd.application.port.out.StoredProcedurePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Adaptador de salida: ejecuta stored procedures MySQL vía JdbcTemplate.
 * Implementa StoredProcedurePort para desacoplar la capa de aplicación
 * de la infraestructura JDBC.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StoredProcedureAdapter implements StoredProcedurePort {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void execute(String procedureName, Object... params) {
        String sql = buildCallSql(procedureName, params.length, false, null);
        log.debug("Executing SP: {} with {} params", procedureName, params.length);
        jdbcTemplate.update(sql, params);
    }

    @Override
    public Long executeWithLongOut(String procedureName, String outParamName, Object... params) {
        String sql = buildCallSql(procedureName, params.length, true, outParamName);
        log.debug("Executing SP with OUT: {} -> @{}", procedureName, outParamName);
        jdbcTemplate.update(sql, params);
        return jdbcTemplate.queryForObject("SELECT @" + outParamName, Long.class);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Construye: CALL sp_nombre(?, ?, @out_param)
     */
    private String buildCallSql(String procedureName, int inParamCount,
                                  boolean hasOut, String outParamName) {
        String inPlaceholders = IntStream.range(0, inParamCount)
                .mapToObj(i -> "?")
                .collect(Collectors.joining(", "));

        if (!hasOut) {
            return "CALL " + procedureName + "(" + inPlaceholders + ")";
        }

        String allParams = inParamCount > 0
                ? inPlaceholders + ", @" + outParamName
                : "@" + outParamName;

        return "CALL " + procedureName + "(" + allParams + ")";
    }
}
