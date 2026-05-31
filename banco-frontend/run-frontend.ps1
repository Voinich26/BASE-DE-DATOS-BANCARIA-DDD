# run-frontend.ps1 — Arranca el frontend Next.js
# Si no existe el build standalone, lo genera primero.

$frontendDir = "C:\Users\MSI_B760 GAMIN PLUS\Desktop\Universidad\BASES DE DATOS II\BASE DE DATOS BANCARIA DDD\banco-frontend"
Set-Location $frontendDir

$env:NEXT_PUBLIC_API_URL      = "http://localhost:8081"
$env:NEXT_PUBLIC_APP_NAME     = "BancoDDD"
$env:NEXT_PUBLIC_APP_ENV      = "development"
$env:NEXT_PUBLIC_ENABLE_MOCK_MODE  = "false"
$env:NEXT_PUBLIC_DEMO_MODE    = "false"
$env:NEXT_TELEMETRY_DISABLED  = "1"
$env:PORT                     = "3000"
$env:HOSTNAME                 = "0.0.0.0"

$standaloneServer = "$frontendDir\.next\standalone\server.js"

# Si no existe el build, generarlo
if (-not (Test-Path $standaloneServer)) {
    Write-Host "Build no encontrado. Generando build de produccion..." -ForegroundColor Yellow
    Write-Host "Esto puede tardar 1-2 minutos..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: El build fallo. Revisa los errores arriba." -ForegroundColor Red
        pause
        exit 1
    }
}

# Copiar static y public al standalone (necesario tras cada build)
$staticSrc = "$frontendDir\.next\static"
$staticDst = "$frontendDir\.next\standalone\.next\static"
$publicSrc = "$frontendDir\public"
$publicDst = "$frontendDir\.next\standalone\public"

if (Test-Path $staticSrc) { Copy-Item -Recurse -Force $staticSrc $staticDst }
if (Test-Path $publicSrc)  { Copy-Item -Recurse -Force $publicSrc $publicDst }

Write-Host "Iniciando BancoDDD Frontend en http://localhost:3000 ..." -ForegroundColor Cyan
node "$standaloneServer"
