@echo off
chcp 65001 >nul
title BancoDDD - Deteniendo Sistema

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          BANCO DDD - Deteniendo todos los servicios          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM ── Cerrar Frontend (puerto 3000) ────────────────────────────────
echo [1/2] Cerrando Frontend (Next.js - puerto 3000)...
taskkill /FI "WINDOWTITLE eq BancoDDD Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo  OK - Frontend detenido.
echo.

REM ── Cerrar Backend (puerto 8081) ─────────────────────────────────
echo [2/2] Cerrando Backend (Spring Boot - puerto 8081)...
taskkill /FI "WINDOWTITLE eq BancoDDD Backend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8081 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
taskkill /IM java.exe /F >nul 2>&1
echo  OK - Backend detenido.
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║              TODOS LOS SERVICIOS DETENIDOS                   ║
echo ║  MySQL sigue corriendo (servicio de Windows).                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
