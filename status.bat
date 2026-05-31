@echo off
chcp 65001 >nul
title BancoDDD - Estado del Sistema

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          BANCO DDD - Estado de los servicios                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM ── MySQL ─────────────────────────────────────────────────────────
echo  MySQL (localhost:3306):
mysqladmin -u root ping --silent 2>nul
if %errorlevel% equ 0 (
    echo    Estado: CORRIENDO
    echo    Conectar: localhost:3306  /  usuario: root  /  DB: banco_ddd
) else (
    echo    Estado: DETENIDO o no accesible
)
echo.

REM ── Backend ───────────────────────────────────────────────────────
echo  Backend Spring Boot (localhost:8081):
curl -s --max-time 3 http://localhost:8081/api/actuator/health >nul 2>&1
if %errorlevel% equ 0 (
    echo    Estado: CORRIENDO y SALUDABLE
    echo    API:     http://localhost:8081/api/v1
    echo    Swagger: http://localhost:8081/api/swagger-ui.html
) else (
    echo    Estado: DETENIDO o iniciando...
)
echo.

REM ── Frontend ──────────────────────────────────────────────────────
echo  Frontend Next.js (localhost:3000):
curl -s --max-time 3 http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo    Estado: CORRIENDO
    echo    URL:    http://localhost:3000
) else (
    echo    Estado: DETENIDO o iniciando...
)
echo.

REM ── Puertos en uso ────────────────────────────────────────────────
echo  Puertos activos:
netstat -ano 2>nul | findstr ":3000 \|:8080 \|:3306 " | findstr "LISTENING"
echo.

pause
