-- ============================================================
-- 00_run_all.sql
-- Script maestro de ejecución para MySQL Workbench
-- Asegúrese de ejecutar este archivo desde la carpeta Banco_Based.
-- ============================================================

SOURCE 01_schema.sql;
SOURCE 02_catalogs.sql;
SOURCE 03_tables.sql;
SOURCE 03b_tables_lote.sql;
SOURCE 04_constraints.sql;
SOURCE 05a_sp_bitacora.sql;
SOURCE 05_triggers.sql;
SOURCE 06_procedures.sql;
SOURCE 06b_crud.sql;
SOURCE 07_seed_data.sql;
SOURCE 08_tests.sql;
