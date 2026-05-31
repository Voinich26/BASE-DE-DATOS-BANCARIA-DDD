# run-backend.ps1 — Arranca Spring Boot con variables de entorno locales
$env:SERVER_PORT      = "8081"
$env:DB_USERNAME      = "root"
$env:DB_PASSWORD      = "TwistedFate7531"
$env:DB_URL           = "jdbc:mysql://localhost:3306/banco_ddd?useSSL=false&serverTimezone=America/Bogota&allowPublicKeyRetrieval=true&characterEncoding=UTF-8"
$env:JWT_SECRET       = "BancoDDD2026SecretKeyMustBe256BitsLongForHS256Algorithm!!"
$env:JWT_EXPIRATION_MS= "86400000"
$env:JWT_REFRESH_MS   = "604800000"
$env:CORS_ORIGINS     = "http://localhost:3000,http://localhost:4200"
$env:APP_ENV          = "development"

$backendDir = "C:\Users\MSI_B760 GAMIN PLUS\Desktop\Universidad\BASES DE DATOS II\BASE DE DATOS BANCARIA DDD\banco-backend"
Set-Location $backendDir
Write-Host "Iniciando BancoDDD Backend en puerto 8081..." -ForegroundColor Cyan
& "C:\Program Files\apache-maven-3.9.16\bin\mvn.cmd" spring-boot:run
