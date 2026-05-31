# init-db — Scripts de inicialización para Docker

Coloca aquí los scripts SQL en orden de ejecución.
Docker los ejecuta automáticamente al crear el contenedor MySQL por primera vez.

## Orden recomendado

```
00_fix_collation.sql
01_schema.sql
02_catalogs.sql
03_tables.sql
03b_tables_lote.sql
04_constraints.sql
05_triggers.sql
05a_sp_bitacora.sql
06_procedures.sql
06b_crud.sql
07_seed_data.sql
```

> Copia los archivos desde `../Banco_Based/` a esta carpeta antes de ejecutar `docker-compose up`.
