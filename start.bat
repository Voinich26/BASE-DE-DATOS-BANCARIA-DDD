@echo off
chcp 65001 >nul
title BancoDDD - Iniciando Sistema Local

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          BANCO DDD - SISTEMA BANCARIO ENTERPRISE             ║
echo ║              Modo: LOCAL (MySQL Workbench)                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%banco-backend
set FRONTEND=%ROOT%banco-frontend

REM ── Verificar MySQL ───────────────────────────────────────────────
echo [1/4] Verificando MySQL local...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqladmin.exe" -u root -pTwistedFate7531 ping --silent 2>nul
if %errorlevel% neq 0 (
    echo  ADVERTENCIA: MySQL no responde. Asegurate de que este corriendo.
    echo  Abre MySQL Workbench y verifica la conexion antes de continuar.
    pause
) else (
    echo  OK - MySQL corriendo en localhost:3306
)
echo.

REM ── Aplicar fix-all.sql si la BD existe ──────────────────────────
echo [2/4] Aplicando correcciones de BD (fix-all.sql)...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pTwistedFate7531 banco_ddd < "%ROOT%fix-all.sql" 2>nul
if %errorlevel% neq 0 (
    echo  ADVERTENCIA: No se pudo aplicar fix-all.sql.
    echo  Asegurate de haber ejecutado primero los scripts de Banco_Based/
    echo  en orden: 00_run_all.sql y luego fix-all.sql manualmente.
) else (
    echo  OK - Correcciones de BD aplicadas
)
echo.

REM ── Iniciar Backend Spring Boot ───────────────────────────────────
echo [3/4] Iniciando Backend Spring Boot (puerto 8081)...
start "BancoDDD Backend" powershell -ExecutionPolicy Bypass -File "%BACKEND%\run-backend.ps1"
echo  OK - Backend iniciando... (espera ~30 segundos)
echo.

REM ── Iniciar Frontend Next.js ──────────────────────────────────────
echo [4/4] Iniciando Frontend Next.js (puerto 3000)...
start "BancoDDD Frontend" powershell -ExecutionPolicy Bypass -File "%FRONTEND%\run-frontend.ps1"
echo  OK - Frontend iniciando en http://localhost:3000
echo.

REM ── Resumen ───────────────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                  SISTEMA INICIADO                            ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║  Frontend:    http://localhost:3000                          ║
echo ║  Backend API: http://localhost:8081/api/v1                   ║
echo ║  Swagger UI:  http://localhost:8081/api/swagger-ui.html      ║
echo ║  Health:      http://localhost:8081/api/actuator/health      ║
echo ║                                                              ║
echo ║  Credenciales de prueba:                                     ║
echo ║    admin@banco.com       / Admin2026!  (Administrador)       ║
echo ║    supervisor@banco.com  / Banco2026!  (Supervisor)          ║
echo ║    analista@banco.com    / Banco2026!  (Analista)            ║
echo ║    pedro.vent@banco.com  / Banco2026!  (Ventanilla)          ║
echo ║    ana.lopez@email.com   / Banco2026!  (Cliente Persona)     ║
echo ║                                                              ║
echo ║  Base de datos: MySQL  localhost:3306  DB: banco_ddd         ║
echo ║  Para detener: ejecuta stop.bat                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Se abrieron 2 ventanas nuevas (Backend y Frontend).
echo  Backend tarda ~30s en arrancar. Frontend listo en ~5s.
echo.
pause
