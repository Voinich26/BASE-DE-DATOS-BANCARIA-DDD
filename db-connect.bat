@echo off
chcp 65001 >nul
title BancoDDD - Acceso a Base de Datos

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          BANCO DDD - Acceso a Base de Datos MySQL            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Datos de conexion:
echo  ─────────────────────────────────────────────
echo  Host:     localhost
echo  Puerto:   3306
echo  Base de datos: banco_ddd
echo  Usuario:  banco_user
echo  Password: banco_pass
echo.
echo  Usuario root:
echo  Usuario:  root
echo  Password: root
echo  ─────────────────────────────────────────────
echo.
echo  Opciones para ver la base de datos:
echo.
echo  [1] MySQL Workbench (GUI recomendada)
echo      - Abre MySQL Workbench
echo      - Nueva conexion con los datos de arriba
echo.
echo  [2] Consola MySQL dentro del contenedor Docker
echo      (requiere Docker corriendo)
echo.
echo  [3] TablePlus / DBeaver / HeidiSQL
echo      - Usa los mismos datos de conexion
echo.

set /p opcion="Elige opcion (1=Workbench, 2=Consola Docker, 3=Salir): "

if "%opcion%"=="1" (
    echo.
    echo  Abriendo MySQL Workbench...
    start "" "C:\Program Files\MySQL\MySQL Workbench 8.0\MySQLWorkbench.exe" 2>nul
    if %errorlevel% neq 0 (
        echo  MySQL Workbench no encontrado en la ruta por defecto.
        echo  Abrelo manualmente y usa los datos de conexion de arriba.
    )
)

if "%opcion%"=="2" (
    echo.
    echo  Conectando a MySQL dentro del contenedor...
    echo  (escribe 'exit' para salir de MySQL)
    echo.
    docker exec -it banco-mysql mysql -u banco_user -pbanco_pass banco_ddd
)

echo.
pause
